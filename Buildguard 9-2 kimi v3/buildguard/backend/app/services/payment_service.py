"""
Payment Service - Pillar 5: The "Wallet"

Handles payment gates with blocking logic based on:
- Stage completion status
- Critical deviations
- Open DLP tickets
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.payment import PaymentGate, PaymentStatus, DlpTicket, TicketStatus, TicketPriority
from app.models.project import Project, ConstructionStage, StageStatus
from app.models.deviation import DeviationEvent, DeviationSeverity, DeviationStatus
from app.core.exceptions import PaymentGateNotFoundError, PaymentBlockedError, InvalidTransitionError

logger = logging.getLogger("buildguard.services.payment")


class PaymentService:
    """Manages payment gates and blocking logic"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_payment_gate(
        self,
        project_id: str,
        stage_id: str,
        amount: float,
        description: str = ""
    ) -> PaymentGate:
        """Create a new payment gate for a stage"""
        payment = PaymentGate(
            project_id=project_id,
            stage_id=stage_id,
            amount=amount,
            currency="AED",
            description=description,
            status=PaymentStatus.PENDING,
            block_reasons=[],
            blocking_deviation_ids=[],
            blocking_ticket_ids=[],
        )
        
        self.db.add(payment)
        await self.db.flush()
        
        return payment
    
    async def check_payment_readiness(
        self, 
        payment_id: str
    ) -> Tuple[bool, List[str]]:
        """
        Check if a payment can be released.
        Returns (can_release, list_of_blocking_reasons).
        
        This is the core blocking logic.
        """
        result = await self.db.execute(
            select(PaymentGate).where(PaymentGate.id == payment_id)
        )
        payment = result.scalar_one_or_none()
        
        if not payment:
            return False, ["Payment not found"]
        
        reasons = []
        
        # 1. Check stage status
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == payment.stage_id)
        )
        stage = result.scalar_one_or_none()
        
        if not stage:
            reasons.append("Associated stage not found")
        else:
            # Stage must be APPROVED
            if stage.status != StageStatus.APPROVED:
                reasons.append(f"Stage not approved (current status: {stage.status.value})")
            
            # Stage must be 100% complete
            if stage.completion_percentage < 100:
                reasons.append(f"Stage incomplete ({stage.completion_percentage:.1f}%)")
        
        # 2. Check for critical deviations
        result = await self.db.execute(
            select(DeviationEvent).where(
                and_(
                    DeviationEvent.project_id == payment.project_id,
                    DeviationEvent.severity == DeviationSeverity.CRITICAL,
                    DeviationEvent.status.in_([
                        DeviationStatus.DETECTED,
                        DeviationStatus.UNDER_REVIEW,
                        DeviationStatus.REJECTED  # Not yet rectified
                    ])
                )
            )
        )
        critical_deviations = result.scalars().all()
        
        if critical_deviations:
            reasons.append(f"{len(critical_deviations)} critical deviation(s) unresolved")
            payment.blocking_deviation_ids = [d.id for d in critical_deviations]
        
        # 3. Check for major deviations
        result = await self.db.execute(
            select(DeviationEvent).where(
                and_(
                    DeviationEvent.project_id == payment.project_id,
                    DeviationEvent.severity == DeviationSeverity.MAJOR,
                    DeviationEvent.status.in_([
                        DeviationStatus.DETECTED,
                        DeviationStatus.UNDER_REVIEW,
                        DeviationStatus.REJECTED
                    ])
                )
            )
        )
        major_deviations = result.scalars().all()
        
        if major_deviations:
            reasons.append(f"{len(major_deviations)} major deviation(s) unresolved")
            payment.blocking_deviation_ids.extend([d.id for d in major_deviations])
        
        # 4. Check for open DLP tickets (high priority or above)
        result = await self.db.execute(
            select(DlpTicket).where(
                and_(
                    DlpTicket.project_id == payment.project_id,
                    DlpTicket.priority.in_([TicketPriority.HIGH, TicketPriority.CRITICAL]),
                    DlpTicket.status.in_([
                        TicketStatus.OPEN,
                        TicketStatus.ASSIGNED,
                        TicketStatus.IN_PROGRESS
                    ])
                )
            )
        )
        blocking_tickets = result.scalars().all()
        
        if blocking_tickets:
            reasons.append(f"{len(blocking_tickets)} high-priority defect ticket(s) open")
            payment.blocking_ticket_ids = [t.id for t in blocking_tickets]
        
        # Update payment status
        can_release = len(reasons) == 0
        
        if can_release:
            payment.status = PaymentStatus.READY
            payment.block_reasons = []
        else:
            payment.status = PaymentStatus.BLOCKED
            payment.block_reasons = reasons
        
        await self.db.flush()
        
        return can_release, reasons
    
    async def request_payment_release(
        self,
        payment_id: str,
        requested_by: str
    ) -> Tuple[bool, str]:
        """Request payment release. Returns (success, message)."""
        logger.info("Payment release requested for gate %s by %s", payment_id, requested_by)
        
        result = await self.db.execute(
            select(PaymentGate).where(PaymentGate.id == payment_id)
        )
        payment = result.scalar_one_or_none()
        
        if not payment:
            raise PaymentGateNotFoundError(payment_id)
        
        can_release, reasons = await self.check_payment_readiness(payment_id)
        
        if not can_release:
            logger.warning("Payment gate %s blocked: %s", payment_id, reasons)
            raise PaymentBlockedError(payment_id, reasons)
        
        payment.status = PaymentStatus.PENDING
        payment.requested_by = requested_by
        payment.requested_at = datetime.utcnow()
        
        await self.db.flush()
        
        logger.info("Payment release requested for gate %s", payment_id)
        return True, "Payment release requested"
    
    async def approve_payment(
        self,
        payment_id: str,
        approved_by: str
    ) -> Tuple[bool, str]:
        """Approve a payment for release."""
        logger.info("Approving payment gate %s by %s", payment_id, approved_by)
        
        result = await self.db.execute(
            select(PaymentGate).where(PaymentGate.id == payment_id)
        )
        payment = result.scalar_one_or_none()
        
        if not payment:
            raise PaymentGateNotFoundError(payment_id)
        
        if payment.status != PaymentStatus.PENDING:
            raise InvalidTransitionError(payment.status.value, PaymentStatus.APPROVED.value)
        
        # Double-check readiness
        can_release, reasons = await self.check_payment_readiness(payment_id)
        
        if not can_release:
            logger.warning("Payment gate %s no longer releasable: %s", payment_id, reasons)
            raise PaymentBlockedError(payment_id, reasons)
        
        payment.status = PaymentStatus.APPROVED
        payment.approved_by = approved_by
        payment.approved_at = datetime.utcnow()
        
        await self.db.flush()
        
        logger.info("Payment gate %s approved: %.2f AED", payment_id, payment.amount)
        return True, f"Payment approved: {payment.amount:,.2f} AED"
    
    async def release_payment(
        self,
        payment_id: str
    ) -> Tuple[bool, str]:
        """Mark payment as released (funds transferred)"""
        result = await self.db.execute(
            select(PaymentGate).where(PaymentGate.id == payment_id)
        )
        payment = result.scalar_one_or_none()
        
        if not payment:
            return False, "Payment not found"
        
        if payment.status != PaymentStatus.APPROVED:
            return False, "Payment must be approved before release"
        
        payment.status = PaymentStatus.RELEASED
        payment.released_at = datetime.utcnow()
        
        # Update stage payment tracking
        result = await self.db.execute(
            select(ConstructionStage).where(ConstructionStage.id == payment.stage_id)
        )
        stage = result.scalar_one_or_none()
        
        if stage:
            stage.payment_released += payment.amount
        
        await self.db.flush()
        
        return True, f"Payment released: {payment.amount:,.2f} AED"
    
    async def create_dlp_ticket(
        self,
        project_id: str,
        title: str,
        description: str,
        room_id: Optional[str] = None,
        room_name: Optional[str] = None,
        element_id: Optional[str] = None,
        element_type: Optional[str] = None,
        priority: TicketPriority = TicketPriority.MEDIUM,
        defect_category: str = "",
        reported_by: str = ""
    ) -> DlpTicket:
        """Create a new DLP (Defect Liability Period) ticket"""
        ticket = DlpTicket(
            project_id=project_id,
            title=title,
            description=description,
            room_id=room_id,
            room_name=room_name,
            element_id=element_id,
            element_type=element_type,
            priority=priority,
            defect_category=defect_category,
            reported_by=reported_by,
            status=TicketStatus.OPEN,
        )
        
        self.db.add(ticket)
        await self.db.flush()
        
        return ticket
    
    async def assign_ticket(
        self,
        ticket_id: str,
        assigned_to: str,
        due_date: Optional[datetime] = None
    ) -> bool:
        """Assign a DLP ticket to a contractor"""
        result = await self.db.execute(
            select(DlpTicket).where(DlpTicket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            return False
        
        ticket.assigned_to = assigned_to
        ticket.assigned_at = datetime.utcnow()
        ticket.status = TicketStatus.ASSIGNED
        ticket.due_date = due_date
        
        await self.db.flush()
        return True
    
    async def complete_ticket(
        self,
        ticket_id: str,
        completion_notes: str,
        actual_cost: float = 0.0
    ) -> bool:
        """Mark a ticket as completed (pending verification)"""
        result = await self.db.execute(
            select(DlpTicket).where(DlpTicket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            return False
        
        ticket.status = TicketStatus.PENDING_VERIFICATION
        ticket.completed_at = datetime.utcnow()
        ticket.contractor_notes = completion_notes
        ticket.actual_cost = actual_cost
        
        await self.db.flush()
        return True
    
    async def verify_ticket(
        self,
        ticket_id: str,
        verified_by: str,
        accepted: bool = True
    ) -> bool:
        """Verify a completed ticket"""
        result = await self.db.execute(
            select(DlpTicket).where(DlpTicket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            return False
        
        if accepted:
            ticket.status = TicketStatus.CLOSED
        else:
            ticket.status = TicketStatus.OPEN  # Reopen for rework
        
        ticket.verified_at = datetime.utcnow()
        ticket.verified_by = verified_by
        
        await self.db.flush()
        return True
    
    async def get_payment_summary(
        self,
        project_id: str
    ) -> Dict[str, Any]:
        """Get payment summary for a project"""
        result = await self.db.execute(
            select(PaymentGate).where(PaymentGate.project_id == project_id)
        )
        payments = result.scalars().all()
        
        summary = {
            "total_payments": len(payments),
            "total_amount": sum(p.amount for p in payments),
            "released": sum(p.amount for p in payments if p.status == PaymentStatus.RELEASED),
            "approved_pending_release": sum(
                p.amount for p in payments if p.status == PaymentStatus.APPROVED
            ),
            "blocked": sum(
                p.amount for p in payments if p.status == PaymentStatus.BLOCKED
            ),
            "pending": sum(
                p.amount for p in payments if p.status == PaymentStatus.PENDING
            ),
            "by_status": {}
        }
        
        for status in PaymentStatus:
            count = len([p for p in payments if p.status == status])
            if count > 0:
                summary["by_status"][status.value] = count
        
        return summary
    
    async def get_blocking_issues(
        self,
        payment_id: str
    ) -> Dict[str, List[Any]]:
        """Get detailed blocking issues for a payment"""
        result = await self.db.execute(
            select(PaymentGate).where(PaymentGate.id == payment_id)
        )
        payment = result.scalar_one_or_none()
        
        if not payment:
            return {"deviations": [], "tickets": []}
        
        # Get blocking deviations
        deviations = []
        if payment.blocking_deviation_ids:
            result = await self.db.execute(
                select(DeviationEvent).where(
                    DeviationEvent.id.in_(payment.blocking_deviation_ids)
                )
            )
            deviations = result.scalars().all()
        
        # Get blocking tickets
        tickets = []
        if payment.blocking_ticket_ids:
            result = await self.db.execute(
                select(DlpTicket).where(
                    DlpTicket.id.in_(payment.blocking_ticket_ids)
                )
            )
            tickets = result.scalars().all()
        
        return {
            "deviations": deviations,
            "tickets": tickets
        }
