from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class CaptureStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GPSData(BaseModel):
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    accuracy: Optional[float] = None


class OrientationData(BaseModel):
    heading: float  # degrees from north
    pitch: Optional[float] = None
    roll: Optional[float] = None


class ARPoseData(BaseModel):
    matrix: List[List[float]]  # 4x4 transformation matrix
    confidence: Optional[float] = Field(default=None, ge=0, le=1)


class DeviceInfo(BaseModel):
    device_id: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None


class CaptureSessionCreate(BaseModel):
    project_id: str
    stage_id: str
    name: str
    description: Optional[str] = None
    captured_by: str
    is_offline: bool = False


class CaptureSessionResponse(BaseModel):
    id: str
    project_id: str
    stage_id: str
    name: str
    description: Optional[str]
    captured_by: str
    status: CaptureStatus
    is_offline: bool
    sync_started_at: Optional[datetime]
    sync_completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PhotoCaptureCreate(BaseModel):
    session_id: str
    file_size: int = 0
    file_type: str = "image/jpeg"


class PhotoCaptureResponse(BaseModel):
    id: str
    session_id: str
    status: CaptureStatus
    file_path: Optional[str]
    file_size: int
    file_type: str
    created_at: datetime
    uploaded_at: Optional[datetime]

    class Config:
        from_attributes = True


class PhotoMetadataCreate(BaseModel):
    photo_id: str
    gps: Optional[GPSData] = None
    orientation: Optional[OrientationData] = None
    ar_pose: Optional[ARPoseData] = None
    device: Optional[DeviceInfo] = None
    capture_timestamp: Optional[datetime] = None
    timezone: str = "UTC"
    anchored_element_id: Optional[str] = None
    anchor_confidence: Optional[float] = None


class PhotoMetadataResponse(BaseModel):
    id: str
    photo_id: str
    latitude: Optional[float]
    longitude: Optional[float]
    altitude: Optional[float]
    gps_accuracy: Optional[float]
    compass_heading: Optional[float]
    pitch: Optional[float]
    roll: Optional[float]
    ar_pose_matrix: Optional[List[List[float]]]
    ar_confidence: Optional[float]
    device_model: Optional[str]
    os_version: Optional[str]
    capture_timestamp: datetime
    anchored_element_id: Optional[str]
    anchor_confidence: Optional[float]

    class Config:
        from_attributes = True


class PhotoWithMetadataResponse(BaseModel):
    id: str
    status: str
    file_path: Optional[str]
    file_size: int
    created_at: Optional[str]
    uploaded_at: Optional[str]
    metadata: Optional[Dict[str, Any]]


class UploadCompleteRequest(BaseModel):
    file_path: str
    file_size: int


class UploadCompleteResponse(BaseModel):
    success: bool
    message: str


class SyncStatusResponse(BaseModel):
    session_id: str
    status: str
    total_photos: int
    uploaded_photos: int
    pending_photos: int
    failed_photos: int
    is_complete: bool


class PaginatedCaptureSessionListResponse(BaseModel):
    items: List[CaptureSessionResponse]
    total: int
