import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, JSON, Boolean
from app.core.database import Base
import uuid


class UserRole(str, enum.Enum):
    OWNER = "owner"
    CONSULTANT = "consultant"
    CONTRACTOR = "contractor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OWNER)
    project_ids = Column(JSON, default=list)  # list of project IDs user can access
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
