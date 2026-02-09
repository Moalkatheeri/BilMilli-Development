"""Evidence Package model for persistent storage."""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class EvidencePackage(Base):
    """Evidence package for project documentation export."""
    
    __tablename__ = "evidence_packages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    format = Column(String(20), default="json", nullable=False)
    
    # Package data stored as JSONB
    data = Column(JSONB, default=dict)
    summary = Column(JSONB, default=dict)
    
    # Teyaseer integration
    teyaseer_reference = Column(String(50), nullable=True)
    shared_at = Column(DateTime, nullable=True)
    
    # Metadata
    total_stages = Column(Integer, default=0)
    completed_stages = Column(Integer, default=0)
    total_deviations = Column(Integer, default=0)
    open_deviations = Column(Integer, default=0)
    total_photos = Column(Integer, default=0)
    
    # Relationships
    project = relationship("Project", back_populates="evidence_packages")
    generated_by_user = relationship("User", back_populates="evidence_packages")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "package_id": str(self.id),
            "project_id": str(self.project_id),
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "generated_by": str(self.generated_by) if self.generated_by else None,
            "format": self.format,
            "summary": self.summary or {},
            "teyaseer_reference": self.teyaseer_reference,
            "shared_at": self.shared_at.isoformat() if self.shared_at else None,
        }
    
    def to_full_dict(self) -> Dict[str, Any]:
        """Convert to full dictionary including data."""
        result = self.to_dict()
        result["data"] = self.data or {}
        return result
