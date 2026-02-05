"""
Payments API - Pillar 5: Payment Gates & DLP
Handles payment blocking logic and defect liability period tickets.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.payment import PaymentGate, PaymentStatus, DlpTicket, TicketStatus, TicketPriority
from app.services.payment_service import PaymentService
from app.schemas.payment import (
    PaymentGateCreate, PaymentGateResponse, PaymentReadinessResponse,
    PaymentRequestRelease, PaymentRequestResponse, PaymentApproveRequest,
    PaymentApproveResponse, PaymentSummary, DlpTicketCreate, DlpTicketResponse,
    DlpTicketAssignRequest, DlpTicketCompleteRequest, DlpTicketVerifyRequest,
    BlockingIssuesResponse
)
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/gates", response_model=PaymentGateResponse)
async def create_payment_gate(
    request: PaymentGateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new payment gate for a stage."""
    payment_service = PaymentService(db)
    
    payment = await payment_service.create_payment_gate(
        project_id=request.project_id,
        stage_id=request.stage_id,
        amount=request.amount,
        description=request.description or ""
    )

    return payment


@router.get("/gates/project/{project_id}", response_model=List[PaymentGateResponse])
async def list_payment_gates(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all payment gates for a project."""
    result = await db.execute(
        select(PaymentGate)
        .where(PaymentGate.project_id == project_id)
        .order_by(PaymentGate.created_at)
    )
    payments = result.scalars().all()
    return payments


@router.get("/gates/{payment_id}", response_model=PaymentGateResponse)
async def get_payment_gate(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payment gate details."""
    result = await db.execute(
        select(PaymentGate).where(PaymentGate.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment gate not found")
    
    return payment


@router.post("/gates/{payment_id}/check-readiness", response_model=PaymentReadinessResponse)
async def check_payment_readiness(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if a payment can be released (blocking logic)."""
    payment_service = PaymentService(db)
    can_release, reasons = await payment_service.check_payment_readiness(payment_id)

    return PaymentReadinessResponse(
        can_release=can_release,
        reasons=reasons,
        payment_id=payment_id
    )


@router.post("/gates/{payment_id}/request-release", response_model=PaymentRequestResponse)
async def request_payment_release(
    payment_id: str,
    request: PaymentRequestRelease,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Request payment release."""
    payment_service = PaymentService(db)
    success, message = await payment_service.request_payment_release(
        payment_id=payment_id,
        requested_by=request.requested_by
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return PaymentRequestResponse(
        success=True,
        message=message,
        payment_id=payment_id
    )


@router.post("/gates/{payment_id}/approve", response_model=PaymentApproveResponse)
async def approve_payment(
    payment_id: str,
    request: PaymentApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a payment for release."""
    payment_service = PaymentService(db)
    success, message = await payment_service.approve_payment(
        payment_id=payment_id,
        approved_by=request.approved_by
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)

    result = await db.execute(
        select(PaymentGate).where(PaymentGate.id == payment_id)
    )
    payment = result.scalar_one()
    
    return PaymentApproveResponse(
        success=True,
        message=message,
        amount=payment.amount
    )


@router.post("/gates/{payment_id}/release")
async def release_payment(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark payment as released (funds transferred)."""
    payment_service = PaymentService(db)
    success, message = await payment_service.release_payment(payment_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message}


@router.get("/gates/{payment_id}/blocking-issues")
async def get_blocking_issues(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed blocking issues for a payment."""
    payment_service = PaymentService(db)
    issues = await payment_service.get_blocking_issues(payment_id)
    
    return {
        "payment_id": payment_id,
        "deviations": [
            {
                "id": d.id,
                "element_type": d.element_type,
                "element_name": d.element_name,
                "severity": d.severity.value,
                "deviation_mm": d.position_deviation_mm or d.dimension_deviation_mm
            }
            for d in issues["deviations"]
        ],
        "tickets": [
            {
                "id": t.id,
                "title": t.title,
                "priority": t.priority.value,
                "status": t.status.value
            }
            for t in issues["tickets"]
        ]
    }


@router.get("/summary/project/{project_id}")
async def get_payment_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payment summary for a project."""
    payment_service = PaymentService(db)
    summary = await payment_service.get_payment_summary(project_id)
    
    return summary


# DLP Tickets

@router.post("/tickets", response_model=DlpTicketResponse)
async def create_dlp_ticket(
    request: DlpTicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new DLP (Defect Liability Period) ticket."""
    payment_service = PaymentService(db)
    
    ticket = await payment_service.create_dlp_ticket(
        project_id=request.project_id,
        title=request.title,
        description=request.description,
        room_id=request.room_id,
        room_name=request.room_name,
        element_id=request.element_id,
        element_type=request.element_type,
        priority=request.priority,
        defect_category=request.defect_category,
        reported_by=request.reported_by
    )

    return ticket


@router.get("/tickets/project/{project_id}", response_model=List[DlpTicketResponse])
async def list_dlp_tickets(
    project_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List DLP tickets for a project."""
    query = select(DlpTicket).where(DlpTicket.project_id == project_id)
    
    if status:
        query = query.where(DlpTicket.status == status)
    if priority:
        query = query.where(DlpTicket.priority == priority)
    
    result = await db.execute(query.order_by(DlpTicket.reported_at.desc()))
    tickets = result.scalars().all()
    return tickets


@router.get("/tickets/{ticket_id}", response_model=DlpTicketResponse)
async def get_dlp_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get DLP ticket details."""
    result = await db.execute(
        select(DlpTicket).where(DlpTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return ticket


@router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    request: DlpTicketAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a DLP ticket to a contractor."""
    payment_service = PaymentService(db)
    success = await payment_service.assign_ticket(
        ticket_id=ticket_id,
        assigned_to=request.assigned_to,
        due_date=request.due_date
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {"success": True, "message": "Ticket assigned"}


@router.post("/tickets/{ticket_id}/complete")
async def complete_ticket(
    ticket_id: str,
    request: DlpTicketCompleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a ticket as completed (pending verification)."""
    payment_service = PaymentService(db)
    success = await payment_service.complete_ticket(
        ticket_id=ticket_id,
        completion_notes=request.completion_notes,
        actual_cost=request.actual_cost
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {"success": True, "message": "Ticket marked as complete"}


@router.post("/tickets/{ticket_id}/verify")
async def verify_ticket(
    ticket_id: str,
    request: DlpTicketVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify a completed ticket."""
    payment_service = PaymentService(db)
    success = await payment_service.verify_ticket(
        ticket_id=ticket_id,
        verified_by=request.verified_by,
        accepted=request.accepted
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")

    status_msg = "closed" if request.accepted else "reopened"
    return {"success": True, "message": f"Ticket {status_msg}"}


@router.get("/tickets/project/{project_id}/summary")
async def get_tickets_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get DLP tickets summary for a project."""
    result = await db.execute(
        select(DlpTicket).where(DlpTicket.project_id == project_id)
    )
    tickets = result.scalars().all()
    
    summary = {
        "total": len(tickets),
        "by_status": {
            "open": 0,
            "assigned": 0,
            "in_progress": 0,
            "pending_verification": 0,
            "closed": 0,
            "rejected": 0
        },
        "by_priority": {
            "low": 0,
            "medium": 0,
            "high": 0,
            "critical": 0
        },
        "open_high_priority": 0
    }
    
    for t in tickets:
        summary["by_status"][t.status.value] += 1
        summary["by_priority"][t.priority.value] += 1
        
        if t.priority in [TicketPriority.HIGH, TicketPriority.CRITICAL] and t.status in [
            TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS
        ]:
            summary["open_high_priority"] += 1
    
    return summary
