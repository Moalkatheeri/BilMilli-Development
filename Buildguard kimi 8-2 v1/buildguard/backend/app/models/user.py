"""User model for BuildGuard Pro."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Boolean
from app.core.database import Base


class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="owner")  # owner, consultant, contractor, admin
    
    # Project access
    project_ids = Column(JSON, default=list)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
