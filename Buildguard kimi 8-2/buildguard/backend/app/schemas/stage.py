from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class StageStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"


class ChecklistItem(BaseModel):
    item: str
    completed: bool = False


class StageResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str]
    sequence: int
    phase: str
    status: StageStatus
    completion_percentage: float
    planned_start: Optional[datetime]
    planned_end: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    depends_on: List[str]
    checklist_items: List[Dict[str, Any]]
    payment_percentage: float
    payment_amount: float
    payment_released: float
    payment_held: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StageStartRequest(BaseModel):
    user_id: str


class StageStartResponse(BaseModel):
    success: bool
    message: str
    stage_id: Optional[str] = None


class StageSubmitRequest(BaseModel):
    notes: Optional[str] = None


class StageSubmitResponse(BaseModel):
    success: bool
    message: str


class StageApproveRequest(BaseModel):
    approved_by: str


class StageApproveResponse(BaseModel):
    success: bool
    message: str
    stage_id: Optional[str] = None


class StageRejectRequest(BaseModel):
    reason: str


class ChecklistUpdateRequest(BaseModel):
    item_index: int = Field(..., ge=0)
    completed: bool


class ChecklistUpdateResponse(BaseModel):
    success: bool
    message: str
    completion_percentage: float


class CanStartResponse(BaseModel):
    can_start: bool
    reasons: List[str]


class StageListResponse(BaseModel):
    stages: List[StageResponse]
    total: int
