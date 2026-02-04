import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class CaptureStatus(str, enum.Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class PhotoCapture(Base):
    __tablename__ = "photo_captures"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("capture_sessions.id"), nullable=False)
    
    # File storage
    file_path = Column(String, nullable=True)  # Path in MinIO
    file_size = Column(Integer, default=0)
    file_type = Column(String, default="image/jpeg")
    
    # Status
    status = Column(Enum(CaptureStatus), default=CaptureStatus.PENDING)
    upload_error = Column(Text, nullable=True)
    
    # Relations
    session = relationship("CaptureSession", back_populates="photos")
    metadata = relationship("PhotoMetadata", back_populates="photo", uselist=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    uploaded_at = Column(DateTime, nullable=True)

class PhotoMetadata(Base):
    __tablename__ = "photo_metadata"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    photo_id = Column(String, ForeignKey("photo_captures.id"), nullable=False)
    
    # GPS Data
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    gps_accuracy = Column(Float, nullable=True)  # meters
    
    # Compass / Orientation
    compass_heading = Column(Float, nullable=True)  # degrees from north
    pitch = Column(Float, nullable=True)  # degrees
    roll = Column(Float, nullable=True)  # degrees
    
    # AR Pose (for 3D anchoring)
    ar_pose_matrix = Column(JSON, nullable=True)  # 4x4 transformation matrix
    ar_confidence = Column(Float, nullable=True)  # 0-1
    
    # Device info
    device_id = Column(String, nullable=True)
    device_model = Column(String, nullable=True)
    os_version = Column(String, nullable=True)
    app_version = Column(String, nullable=True)
    
    # Capture info
    capture_timestamp = Column(DateTime, default=datetime.utcnow)
    timezone = Column(String, default="UTC")
    
    # 3D Anchoring (if manually or auto-anchored)
    anchored_element_id = Column(String, nullable=True)  # ID of wall/room in 3D model
    anchor_confidence = Column(Float, nullable=True)
    
    # Relations
    photo = relationship("PhotoCapture", back_populates="metadata")

class CaptureSession(Base):
    __tablename__ = "capture_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    stage_id = Column(String, ForeignKey("construction_stages.id"), nullable=False)
    
    # Session info
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    captured_by = Column(String, nullable=False)  # User ID or name
    
    # Status
    status = Column(Enum(CaptureStatus), default=CaptureStatus.PENDING)
    is_offline = Column(Boolean, default=False)  # Was captured offline
    
    # Sync tracking
    sync_started_at = Column(DateTime, nullable=True)
    sync_completed_at = Column(DateTime, nullable=True)
    
    # Relations
    project = relationship("Project", back_populates="captures")
    stage = relationship("ConstructionStage", back_populates="captures")
    photos = relationship("PhotoCapture", back_populates="session")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
