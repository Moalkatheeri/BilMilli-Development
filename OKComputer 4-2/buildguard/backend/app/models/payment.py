import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class TicketStatus(str, enum.Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING_VERIFICATION = "pending_verification"
    CLOSED = "closed"
    REJECTED = "rejected"

class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    READY = "ready"  # Stage complete, no blockers
    BLOCKED = "blocked"  # Has deviations/defects
    APPROVED = "approved"
    RELEASED = "released"
    DISPUTED = "disputed"

class PaymentGate(Base):
    __tablename__ = "payment_gates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    stage_id = Column(String, ForeignKey("construction_stages.id"), nullable=False)
    
    # Payment details
    amount = Column(Float, default=0.0)
    currency = Column(String, default="AED")
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Blocking conditions
    block_reasons = Column(JSON, default=list)  # ["critical_deviations", "open_defects"]
    blocking_deviation_ids = Column(JSON, default=list)  # IDs of blocking deviations
    blocking_ticket_ids = Column(JSON, default=list)  # IDs of blocking DLP tickets
    
    # Approval workflow
    requested_by = Column(String, nullable=True)
    requested_at = Column(DateTime, nullable=True)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    released_at = Column(DateTime, nullable=True)
    
    # Relations
    project = relationship("Project", back_populates="payments")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def can_release(self) -> tuple[bool, list[str]]:
        """Check if payment can be released. Returns (can_release, reasons)."""
        reasons = []
        
        if self.blocking_deviation_ids:
            reasons.append(f"{len(self.blocking_deviation_ids)} critical deviation(s) unresolved")
        
        if self.blocking_ticket_ids:
            reasons.append(f"{len(self.blocking_ticket_ids)} open defect ticket(s)")
        
        return len(reasons) == 0, reasons

class DlpTicket(Base):
    """Defect Liability Period Ticket - for post-handover defects"""
    __tablename__ = "dlp_tickets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    # Location
    room_id = Column(String, nullable=True)  # ID of room in 3D model
    room_name = Column(String, nullable=True)  # "Kitchen", "Master Bedroom", etc.
    element_id = Column(String, nullable=True)  # Specific element (wall, tile, etc.)
    element_type = Column(String, nullable=True)  # "tile", "paint", "fixture", etc.
    
    # Ticket details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    
    # Defect classification
    defect_category = Column(String, nullable=True)  # "waterproofing", "finishes", "mechanical", etc.
    is_structural = Column(Boolean, default=False)
    
    # Assignment
    reported_by = Column(String, nullable=False)
    reported_at = Column(DateTime, default=datetime.utcnow)
    assigned_to = Column(String, nullable=True)  # Contractor/user ID
    assigned_at = Column(DateTime, nullable=True)
    
    # Timeline
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(String, nullable=True)
    
    # Photos
    before_photos = Column(JSON, default=list)  # List of photo IDs
    after_photos = Column(JSON, default=list)
    
    # Cost tracking
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    
    # Notes
    contractor_notes = Column(Text, nullable=True)
    owner_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
