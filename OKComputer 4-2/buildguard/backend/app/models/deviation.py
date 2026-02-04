import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class DeviationStatus(str, enum.Enum):
    DETECTED = "detected"
    UNDER_REVIEW = "under_review"
    ACCEPTED = "accepted"  # Deviation is acceptable
    REJECTED = "rejected"  # Must be rectified
    RECTIFIED = "rectified"  # Fixed
    CLOSED = "closed"

class DeviationSeverity(str, enum.Enum):
    CRITICAL = "critical"  # Structural/safety issue
    MAJOR = "major"  # Significant deviation
    MINOR = "minor"  # Within tolerance but noted
    COSMETIC = "cosmetic"  # Visual only

class DeviationEvent(Base):
    __tablename__ = "deviation_events"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    # What was detected
    element_type = Column(String, nullable=False)  # "wall", "column", "beam", "window", etc.
    element_id = Column(String, nullable=False)  # ID from 3D model
    element_name = Column(String, nullable=True)  # Human-readable name
    
    # Deviation details
    deviation_type = Column(String, nullable=False)  # "position", "dimension", "orientation", "missing"
    severity = Column(Enum(DeviationSeverity), default=DeviationSeverity.MINOR)
    
    # Expected vs Actual
    expected_position = Column(JSON, nullable=True)  # {x, y, z} in meters
    actual_position = Column(JSON, nullable=True)  # From photo metadata/AR
    position_deviation_mm = Column(Float, default=0.0)
    
    expected_dimension = Column(JSON, nullable=True)  # {width, height, depth}
    actual_dimension = Column(JSON, nullable=True)
    dimension_deviation_mm = Column(Float, default=0.0)
    
    # Tolerance checking
    tolerance_mm = Column(Float, default=20.0)  # Allowed deviation
    is_within_tolerance = Column(Boolean, default=True)
    
    # Detection source
    detected_by = Column(String, default="system")  # "system", "user", "ai"
    detection_confidence = Column(Float, default=1.0)  # 0-1
    
    # Photo evidence
    photo_id = Column(String, ForeignKey("photo_captures.id"), nullable=True)
    
    # Status workflow
    status = Column(Enum(DeviationStatus), default=DeviationStatus.DETECTED)
    assigned_to = Column(String, nullable=True)  # User/contractor ID
    
    # Review notes
    review_notes = Column(Text, nullable=True)
    rectification_notes = Column(Text, nullable=True)
    
    # Cost impact
    estimated_rectification_cost = Column(Float, default=0.0)
    actual_rectification_cost = Column(Float, default=0.0)
    
    # Timeline
    detected_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    rectified_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Relations
    project = relationship("Project", back_populates="deviations")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
