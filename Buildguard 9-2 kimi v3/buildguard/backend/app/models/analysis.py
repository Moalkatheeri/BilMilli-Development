import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class ThermalZone(Base):
    __tablename__ = "thermal_zones"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey("thermal_analyses.id"), nullable=False, index=True)
    
    # Zone identification
    name = Column(String, nullable=False)  # "Living Room", "Kitchen", etc.
    element_id = Column(String, nullable=True)  # ID from 3D model
    
    # Geometry
    area_sqm = Column(Float, default=0.0)
    volume_cubm = Column(Float, default=0.0)
    ceiling_height = Column(Float, default=2.7)
    
    # Construction properties
    wall_u_value = Column(Float, default=0.5)  # W/m²K
    roof_u_value = Column(Float, default=0.3)
    floor_u_value = Column(Float, default=0.4)
    window_u_value = Column(Float, default=2.0)
    
    # Window data
    window_area_sqm = Column(Float, default=0.0)
    window_orientation = Column(String, nullable=True)  # "north", "south", etc.
    shading_factor = Column(Float, default=1.0)  # 0-1
    
    # Results
    cooling_load_kw = Column(Float, default=0.0)
    heating_load_kw = Column(Float, default=0.0)
    peak_temperature = Column(Float, default=0.0)
    
    # Heatmap data (for 3D visualization)
    heatmap_data = Column(JSON, default=dict)  # {surface_id: temperature}
    
    # Relations
    analysis = relationship("ThermalAnalysis", back_populates="zones")

class ThermalAnalysis(Base):
    __tablename__ = "thermal_analyses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    
    # Configuration
    name = Column(String, default="Thermal Analysis")
    location = Column(String, nullable=False)  # "Dubai", "Abu Dhabi", etc.
    
    # Climate data used
    climate_data = Column(JSON, default=dict)  # {outdoor_temp: 45, humidity: 60, ...}
    design_temperature = Column(Float, default=24.0)  # Target indoor temp (C)
    
    # Status
    status = Column(Enum(AnalysisStatus), default=AnalysisStatus.PENDING)
    error_message = Column(Text, nullable=True)
    
    # Results summary
    total_cooling_load_kw = Column(Float, default=0.0)
    total_heating_load_kw = Column(Float, default=0.0)
    recommended_ac_tons = Column(Float, default=0.0)  # 1 ton = 3.5 kW
    
    # Energy estimates
    annual_cooling_kwh = Column(Float, default=0.0)
    annual_heating_kwh = Column(Float, default=0.0)
    estimated_annual_cost_aed = Column(Float, default=0.0)
    
    # Detailed results
    results_json = Column(JSON, default=dict)  # Full calculation breakdown
    
    # Relations
    project = relationship("Project", back_populates="thermal_analyses")
    zones = relationship("ThermalZone", back_populates="analysis", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
