import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class StageStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    location = Column(String, nullable=False)  # For climate data lookup
    contract_value = Column(Float, default=0.0)
    
    # Contractor reference
    contractor_id = Column(String, nullable=True, index=True)  # Reference to contractor/user
    
    # Timeline
    start_date = Column(DateTime, default=datetime.utcnow)
    expected_completion = Column(DateTime)
    actual_completion = Column(DateTime, nullable=True)
    
    # 3D Model
    model_url = Column(String, nullable=True)  # Path to IFC/OBJ file in MinIO
    model_metadata = Column(JSON, default=dict)  # Parsed geometry data
    
    # Status
    status = Column(String, default="active")  # active, on_hold, completed
    progress = Column(Float, default=0.0)  # 0-100
    
    # Relations
    stages = relationship("ConstructionStage", back_populates="project", order_by="ConstructionStage.sequence")
    captures = relationship("CaptureSession", back_populates="project")
    thermal_analyses = relationship("ThermalAnalysis", back_populates="project")
    deviations = relationship("DeviationEvent", back_populates="project")
    payments = relationship("PaymentGate", back_populates="project")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConstructionStage(Base):
    __tablename__ = "construction_stages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    
    # Stage definition
    name = Column(String, nullable=False)
    description = Column(Text)
    sequence = Column(Integer, nullable=False)  # Order in project
    phase = Column(String, nullable=False)  # foundation, structure, mep, finishes, etc.
    
    # Status
    status = Column(Enum(StageStatus), default=StageStatus.NOT_STARTED, index=True)
    completion_percentage = Column(Float, default=0.0)
    
    # Timeline
    planned_start = Column(DateTime)
    planned_end = Column(DateTime)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    
    # Dependencies
    depends_on = Column(JSON, default=list)  # List of stage IDs that must complete first
    
    # Checklist
    checklist_items = Column(JSON, default=list)  # [{"item": "Excavation complete", "completed": false}]
    
    # Payment
    payment_percentage = Column(Float, default=0.0)  # % of contract value
    payment_amount = Column(Float, default=0.0)
    payment_released = Column(Float, default=0.0)
    payment_held = Column(Float, default=0.0)
    
    # Relations
    project = relationship("Project", back_populates="stages")
    captures = relationship("CaptureSession", back_populates="stage")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def can_start(self) -> bool:
        """Check if this stage can be started (all dependencies approved)"""
        # This will be checked by StageManager service
        return True
