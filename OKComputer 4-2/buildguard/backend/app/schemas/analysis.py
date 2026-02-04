from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ThermalZoneCreate(BaseModel):
    name: str
    element_id: Optional[str] = None
    area_sqm: float = Field(default=20.0, gt=0)
    volume_cubm: Optional[float] = None
    ceiling_height: float = 2.7
    wall_u_value: float = 0.35
    roof_u_value: float = 0.25
    floor_u_value: float = 0.40
    window_u_value: float = 1.8
    window_area_sqm: float = 0.0
    window_orientation: Optional[str] = "south"
    shading_factor: float = 1.0


class ThermalZoneResponse(BaseModel):
    id: str
    analysis_id: str
    name: str
    element_id: Optional[str]
    area_sqm: float
    volume_cubm: float
    ceiling_height: float
    wall_u_value: float
    roof_u_value: float
    floor_u_value: float
    window_u_value: float
    window_area_sqm: float
    window_orientation: Optional[str]
    shading_factor: float
    cooling_load_kw: float
    heating_load_kw: float
    peak_temperature: float
    heatmap_data: Dict[str, Any]

    class Config:
        from_attributes = True


class ThermalAnalysisCreate(BaseModel):
    project_id: str
    name: Optional[str] = "Thermal Analysis"
    location: str = Field(..., description="City name (Dubai, Abu Dhabi, etc.)")
    design_temperature: float = 24.0


class ThermalAnalysisResponse(BaseModel):
    id: str
    project_id: str
    name: str
    location: str
    climate_data: Dict[str, Any]
    design_temperature: float
    status: AnalysisStatus
    error_message: Optional[str]
    total_cooling_load_kw: float
    total_heating_load_kw: float
    recommended_ac_tons: float
    annual_cooling_kwh: float
    annual_heating_kwh: float
    estimated_annual_cost_aed: float
    results_json: Dict[str, Any]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AnalysisRunResponse(BaseModel):
    success: bool
    message: str
    analysis_id: Optional[str] = None


class AnalysisListResponse(BaseModel):
    analyses: List[ThermalAnalysisResponse]
    total: int


class CoolingLoadSummary(BaseModel):
    total_cooling_load_kw: float
    total_heating_load_kw: float
    recommended_ac_tons: float
    annual_cooling_kwh: float
    annual_heating_kwh: float
    estimated_annual_cost_aed: float
    zone_count: int


class ClimateDataResponse(BaseModel):
    location: str
    outdoor_design_temp_summer: float
    outdoor_design_temp_winter: float
    relative_humidity_summer: float
    relative_humidity_winter: float
    solar_radiation_peak: float
    wind_speed: float
    altitude: float
    cooling_degree_days: int
    heating_degree_days: int
