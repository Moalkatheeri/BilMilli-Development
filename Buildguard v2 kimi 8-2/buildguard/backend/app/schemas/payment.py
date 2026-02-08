from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    BLOCKED = "blocked"
    APPROVED = "approved"
    RELEASED = "released"
    DISPUTED = "disputed"


class TicketStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING_VERIFICATION = "pending_verification"
    CLOSED = "closed"
    REJECTED = "rejected"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PaymentGateCreate(BaseModel):
    project_id: str
    stage_id: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = None


class PaymentGateResponse(BaseModel):
    id: str
    project_id: str
    stage_id: str
    amount: float
    currency: str
    description: Optional[str]
    status: PaymentStatus
    block_reasons: List[str]
    blocking_deviation_ids: List[str]
    blocking_ticket_ids: List[str]
    requested_by: Optional[str]
    requested_at: Optional[datetime]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    released_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentReadinessResponse(BaseModel):
    can_release: bool
    reasons: List[str]
    payment_id: str


class PaymentRequestRelease(BaseModel):
    requested_by: str


class PaymentRequestResponse(BaseModel):
    success: bool
    message: str
    payment_id: Optional[str] = None


class PaymentApproveRequest(BaseModel):
    approved_by: str


class PaymentApproveResponse(BaseModel):
    success: bool
    message: str
    amount: Optional[float] = None


class PaymentSummary(BaseModel):
    total_payments: int
    total_amount: float
    released: float
    approved_pending_release: float
    blocked: float
    pending: float
    by_status: Dict[str, int]


class DlpTicketCreate(BaseModel):
    project_id: str
    title: str
    description: str
    room_id: Optional[str] = None
    room_name: Optional[str] = None
    element_id: Optional[str] = None
    element_type: Optional[str] = None
    priority: TicketPriority = TicketPriority.MEDIUM
    defect_category: str = ""
    reported_by: str


class DlpTicketResponse(BaseModel):
    id: str
    project_id: str
    room_id: Optional[str]
    room_name: Optional[str]
    element_id: Optional[str]
    element_type: Optional[str]
    title: str
    description: str
    priority: TicketPriority
    status: TicketStatus
    defect_category: Optional[str]
    is_structural: bool
    reported_by: str
    reported_at: datetime
    assigned_to: Optional[str]
    assigned_at: Optional[datetime]
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    verified_at: Optional[datetime]
    verified_by: Optional[str]
    before_photos: List[str]
    after_photos: List[str]
    estimated_cost: float
    actual_cost: float
    contractor_notes: Optional[str]
    owner_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DlpTicketAssignRequest(BaseModel):
    assigned_to: str
    due_date: Optional[datetime] = None


class DlpTicketCompleteRequest(BaseModel):
    completion_notes: str
    actual_cost: float = 0.0


class DlpTicketVerifyRequest(BaseModel):
    verified_by: str
    accepted: bool = True


class BlockingIssuesResponse(BaseModel):
    deviations: List[Dict[str, Any]]
    tickets: List[Dict[str, Any]]


class PaginatedPaymentGateListResponse(BaseModel):
    items: List[PaymentGateResponse]
    total: int


class PaginatedDlpTicketListResponse(BaseModel):
    items: List[DlpTicketResponse]
    total: int
