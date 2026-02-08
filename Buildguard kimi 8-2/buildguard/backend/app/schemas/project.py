from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    address: str = Field(..., min_length=1)
    location: str = Field(..., description="City for climate data (Dubai, Abu Dhabi, etc.)")
    contract_value: float = Field(default=1750000, ge=0)
    start_date: Optional[datetime] = None
    expected_completion: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    location: Optional[str] = None
    contract_value: Optional[float] = Field(default=None, ge=0)
    expected_completion: Optional[datetime] = None
    status: Optional[ProjectStatus] = None
    progress: Optional[float] = Field(default=None, ge=0, le=100)


class ProjectResponse(BaseModel):
    id: str
    name: str
    address: str
    location: str
    contract_value: float
    start_date: Optional[datetime]
    expected_completion: Optional[datetime]
    actual_completion: Optional[datetime]
    model_url: Optional[str]
    model_metadata: Dict[str, Any]
    status: str
    progress: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    id: str
    name: str
    location: str
    status: str
    progress: float
    contract_value: float
    created_at: datetime

    class Config:
        from_attributes = True


class ModelUploadResponse(BaseModel):
    success: bool
    message: str
    model_url: Optional[str] = None
    parsed_metadata: Optional[Dict[str, Any]] = None
