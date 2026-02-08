"""Tests for Payment Service."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ConstructionStage, StageStatus
from app.models.payment import PaymentGate, PaymentStatus, DlpTicket, TicketStatus, TicketPriority
from app.models.deviation import DeviationEvent, DeviationSeverity, DeviationStatus
from app.services.payment_service import PaymentService


class TestPaymentService:
    """Test payment gate functionality."""
    
    async def test_create_payment_gate(self, db_session: AsyncSession, test_project: Project, test_stages: list):
        """Test creating a payment gate."""
        payment_service = PaymentService(db_session)
        
        payment = await payment_service.create_payment_gate(
            project_id=test_project.id,
            stage_id=test_stages[0].id,
            amount=300000.0,
            description="Foundation payment"
        )
        
        assert payment is not None
        assert payment.amount == 300000.0
        assert payment.currency == "AED"
        assert payment.status == PaymentStatus.PENDING
        assert payment.stage_id == test_stages[0].id
    
    async def test_check_payment_readiness_stage_not_approved(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test that payment is blocked when stage is not approved."""
        payment_service = PaymentService(db_session)
        
        # Stage is NOT_STARTED, so payment should be blocked
        can_release, reasons = await payment_service.check_payment_readiness(test_payment_gate.id)
        
        assert can_release is False
        assert len(reasons) > 0
        assert any("stage" in r.lower() or "approved" in r.lower() for r in reasons)
    
    async def test_check_payment_readiness_with_critical_deviation(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test that payment is blocked when critical deviations exist."""
        payment_service = PaymentService(db_session)
        
        # Approve the stage first
        test_stages[0].status = StageStatus.APPROVED
        await db_session.flush()
        
        # Create a critical deviation
        deviation = DeviationEvent(
            project_id=test_project.id,
            element_type="column",
            element_id="col_001",
            deviation_type="position",
            severity=DeviationSeverity.CRITICAL,
            status=DeviationStatus.DETECTED,
            position_deviation_mm=150.0,
            tolerance_mm=20.0,
            detected_by="system"
        )
        db_session.add(deviation)
        await db_session.flush()
        
        # Payment should be blocked due to critical deviation
        can_release, reasons = await payment_service.check_payment_readiness(test_payment_gate.id)
        
        assert can_release is False
        assert any("critical" in r.lower() or "deviation" in r.lower() for r in reasons)
    
    async def test_check_payment_readiness_with_open_dlp_ticket(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test that payment is blocked when open DLP tickets exist."""
        payment_service = PaymentService(db_session)
        
        # Approve the stage
        test_stages[0].status = StageStatus.APPROVED
        await db_session.flush()
        
        # Create an open DLP ticket
        ticket = DlpTicket(
            project_id=test_project.id,
            title="Leaking pipe in bathroom",
            description="Water leak detected in master bathroom",
            priority=TicketPriority.HIGH,
            status=TicketStatus.OPEN,
            reported_by="owner"
        )
        db_session.add(ticket)
        await db_session.flush()
        
        # Payment should be blocked due to open DLP ticket
        can_release, reasons = await payment_service.check_payment_readiness(test_payment_gate.id)
        
        assert can_release is False
        assert any("dlp" in r.lower() or "ticket" in r.lower() or "defect" in r.lower() for r in reasons)
    
    async def test_check_payment_readiness_all_conditions_met(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test that payment can be released when all conditions are met."""
        payment_service = PaymentService(db_session)
        
        # Approve the stage
        test_stages[0].status = StageStatus.APPROVED
        await db_session.flush()
        
        # No critical deviations, no open DLP tickets
        can_release, reasons = await payment_service.check_payment_readiness(test_payment_gate.id)
        
        assert can_release is True
        assert len(reasons) == 0
    
    async def test_request_payment_release_blocked(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test that payment release request is blocked when conditions not met."""
        payment_service = PaymentService(db_session)
        
        # Stage not approved, so should be blocked
        success, message = await payment_service.request_payment_release(test_payment_gate.id, "user_123")
        
        assert success is False
        assert "blocked" in message.lower()
    
    async def test_request_payment_release_success(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test successful payment release request."""
        payment_service = PaymentService(db_session)
        
        # Approve the stage
        test_stages[0].status = StageStatus.APPROVED
        await db_session.flush()
        
        success, message = await payment_service.request_payment_release(test_payment_gate.id, "user_123")
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_payment_gate)
        assert test_payment_gate.status == PaymentStatus.PENDING
        assert test_payment_gate.requested_by == "user_123"
    
    async def test_approve_payment(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test approving a payment."""
        payment_service = PaymentService(db_session)
        
        # Approve stage and request release
        test_stages[0].status = StageStatus.APPROVED
        await db_session.flush()
        await payment_service.request_payment_release(test_payment_gate.id, "user_123")
        
        # Approve the payment
        success, message = await payment_service.approve_payment(test_payment_gate.id, "consultant_123")
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_payment_gate)
        assert test_payment_gate.status == PaymentStatus.APPROVED
        assert test_payment_gate.approved_by == "consultant_123"
    
    async def test_release_payment(self, db_session: AsyncSession, test_project: Project, test_stages: list, test_payment_gate: PaymentGate):
        """Test releasing a payment (marking as transferred)."""
        payment_service = PaymentService(db_session)
        
        # Approve stage, request release, and approve payment
        test_stages[0].status = StageStatus.APPROVED
        await db_session.flush()
        await payment_service.request_payment_release(test_payment_gate.id, "user_123")
        await payment_service.approve_payment(test_payment_gate.id, "consultant_123")
        
        # Release the payment
        success, message = await payment_service.release_payment(test_payment_gate.id)
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_payment_gate)
        assert test_payment_gate.status == PaymentStatus.RELEASED
    
    async def test_create_dlp_ticket(self, db_session: AsyncSession, test_project: Project):
        """Test creating a DLP ticket."""
        payment_service = PaymentService(db_session)
        
        ticket = await payment_service.create_dlp_ticket(
            project_id=test_project.id,
            title="Crack in wall",
            description="Visible crack in living room wall",
            room_name="Living Room",
            element_type="wall",
            priority=TicketPriority.HIGH,
            defect_category="structural",
            reported_by="owner"
        )
        
        assert ticket is not None
        assert ticket.title == "Crack in wall"
        assert ticket.status == TicketStatus.OPEN
        assert ticket.priority == TicketPriority.HIGH
