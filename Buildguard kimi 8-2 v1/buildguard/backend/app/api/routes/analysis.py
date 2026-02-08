"""
Analysis API - Pillar 3: Thermal Analysis Engine
Calculates cooling loads from 3D geometry and climate data.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.analysis import ThermalAnalysis, ThermalZone, AnalysisStatus
from app.models.project import Project
from app.services.thermal_analysis import ThermalAnalysisEngine, CLIMATE_DATA
from app.schemas.analysis import (
    ThermalAnalysisCreate, ThermalAnalysisResponse,
    AnalysisRunResponse, AnalysisListResponse,
    CoolingLoadSummary, ClimateDataResponse, ThermalZoneResponse
)

router = APIRouter()


@router.post("/", response_model=ThermalAnalysisResponse)
async def create_analysis(
    request: ThermalAnalysisCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new thermal analysis for a project."""
    # Verify project exists
    result = await db.execute(
        select(Project).where(Project.id == request.project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    engine = ThermalAnalysisEngine(db)
    analysis = await engine.create_analysis(
        project_id=request.project_id,
        location=request.location,
        design_temperature=request.design_temperature
    )
    
    return analysis


@router.get("/", response_model=List[ThermalAnalysisResponse])
async def list_analyses(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all thermal analyses for a project."""
    result = await db.execute(
        select(ThermalAnalysis)
        .where(ThermalAnalysis.project_id == project_id)
        .order_by(ThermalAnalysis.created_at.desc())
    )
    analyses = result.scalars().all()
    return analyses


@router.get("/{analysis_id}", response_model=ThermalAnalysisResponse)
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get thermal analysis details with zones."""
    result = await db.execute(
        select(ThermalAnalysis).where(ThermalAnalysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis


@router.post("/{analysis_id}/run", response_model=AnalysisRunResponse)
async def run_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Run the thermal analysis calculation."""
    engine = ThermalAnalysisEngine(db)
    success, message = await engine.run_analysis(analysis_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return AnalysisRunResponse(
        success=True,
        message=message,
        analysis_id=analysis_id
    )


@router.get("/{analysis_id}/zones", response_model=List[ThermalZoneResponse])
async def get_analysis_zones(
    analysis_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all thermal zones for an analysis."""
    result = await db.execute(
        select(ThermalZone).where(ThermalZone.analysis_id == analysis_id)
    )
    zones = result.scalars().all()
    return zones


@router.get("/{analysis_id}/summary")
async def get_analysis_summary(
    analysis_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get cooling load summary for an analysis."""
    result = await db.execute(
        select(ThermalAnalysis).where(ThermalAnalysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = await db.execute(
        select(ThermalZone).where(ThermalZone.analysis_id == analysis_id)
    )
    zones = result.scalars().all()
    
    return {
        "analysis_id": analysis_id,
        "status": analysis.status.value,
        "location": analysis.location,
        "design_temperature": analysis.design_temperature,
        "total_cooling_load_kw": analysis.total_cooling_load_kw,
        "total_heating_load_kw": analysis.total_heating_load_kw,
        "recommended_ac_tons": analysis.recommended_ac_tons,
        "annual_cooling_kwh": analysis.annual_cooling_kwh,
        "annual_heating_kwh": analysis.annual_heating_kwh,
        "estimated_annual_cost_aed": analysis.estimated_annual_cost_aed,
        "zone_count": len(zones),
        "zones": [
            {
                "name": z.name,
                "area_sqm": z.area_sqm,
                "cooling_load_kw": z.cooling_load_kw,
                "heating_load_kw": z.heating_load_kw,
                "window_orientation": z.window_orientation
            }
            for z in zones
        ]
    }


@router.get("/climate-data/{location}")
async def get_climate_data(location: str):
    """Get climate data for a location."""
    location_key = location.lower().replace(" ", "_")
    data = CLIMATE_DATA.get(location_key)
    
    if not data:
        raise HTTPException(status_code=404, detail=f"Climate data not found for {location}")
    
    return {
        "location": location,
        **data
    }


@router.get("/climate-data/locations/list")
async def list_climate_locations():
    """List all available climate data locations."""
    return {
        "locations": [
            {"key": k, "name": k.replace("_", " ").title()}
            for k in CLIMATE_DATA.keys()
        ]
    }


@router.delete("/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a thermal analysis."""
    result = await db.execute(
        select(ThermalAnalysis).where(ThermalAnalysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    await db.delete(analysis)
    
    return {"success": True, "message": "Analysis deleted"}
