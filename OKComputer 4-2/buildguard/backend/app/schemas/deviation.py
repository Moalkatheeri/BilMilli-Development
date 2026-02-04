from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DeviationStatus(str, Enum):
    DETECTED = "detected"
    UNDER_REVIEW = "under_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    RECTIFIED = "rectified"
    CLOSED = "closed"


class DeviationSeverity(str, Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    COSMETIC = "cosmetic"


class Position3D(BaseModel):
    x: float
    y: float
    z: float


class Dimension3D(BaseModel):
    width: float
    height: float
    depth: float


class DeviationCreate(BaseModel):
    project_id: str
    element_type: str = Field(..., description="wall, column, beam, window, door, etc.")
    element_id: str
    element_name: Optional[str] = None
    deviation_type: str = Field(..., description="position, dimension, orientation, missing")
    expected_position: Optional[Position3D] = None
    actual_position: Optional[Position3D] = None
    expected_dimension: Optional[Dimension3D] = None
    actual_dimension: Optional[Dimension3D] = None
    photo_id: Optional[str] = None
    detected_by: str = "system"


class DeviationResponse(BaseModel):
    id: str
    project_id: str
    element_type: str
    element_id: str
    element_name: Optional[str]
    deviation_type: str
    severity: DeviationSeverity
    expected_position: Optional[Dict[str, float]]
    actual_position: Optional[Dict[str, float]]
    position_deviation_mm: float
    expected_dimension: Optional[Dict[str, float]]
    actual_dimension: Optional[Dict[str, float]]
    dimension_deviation_mm: float
    tolerance_mm: float
    is_within_tolerance: bool
    detected_by: str
    detection_confidence: float
    photo_id: Optional[str]
    status: DeviationStatus
    assigned_to: Optional[str]
    review_notes: Optional[str]
    rectification_notes: Optional[str]
    estimated_rectification_cost: float
    actual_rectification_cost: float
    detected_at: datetime
    reviewed_at: Optional[datetime]
    rectified_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviationListResponse(BaseModel):
    deviations: List[DeviationResponse]
    total: int
    by_severity: Dict[str, int]


class DeviationReviewRequest(BaseModel):
    reviewed_by: str
    notes: str


class DeviationReviewResponse(BaseModel):
    success: bool
    message: str
    deviation_id: Optional[str] = None


class DeviationRectifyRequest(BaseModel):
    notes: str
    actual_cost: float = 0.0


class DeviationFilter(BaseModel):
    project_id: Optional[str] = None
    severity: Optional[List[DeviationSeverity]] = None
    status: Optional[List[DeviationStatus]] = None
    element_type: Optional[str] = None


class PositionCheckRequest(BaseModel):
    project_id: str
    element_id: str
    element_type: str
    element_name: Optional[str] = None
    expected_position: Position3D
    actual_position: Position3D
    photo_id: Optional[str] = None


class PositionCheckResponse(BaseModel):
    has_deviation: bool
    deviation_mm: float
    tolerance_mm: float
    is_within_tolerance: bool
    severity: Optional[DeviationSeverity] = None
    deviation_id: Optional[str] = None
    message: str
