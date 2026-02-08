"""Tests for Thermal Analysis Engine."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.analysis import ThermalAnalysis, AnalysisStatus
from app.services.thermal_analysis import ThermalAnalysisEngine


class TestThermalAnalysis:
    """Test thermal analysis functionality."""
    
    async def test_create_analysis(self, db_session: AsyncSession, test_project: Project):
        """Test creating a thermal analysis."""
        engine = ThermalAnalysisEngine(db_session)
        
        analysis = await engine.create_analysis(
            project_id=test_project.id,
            location="Dubai",
            design_temperature=24.0
        )
        
        assert analysis is not None
        assert analysis.project_id == test_project.id
        assert analysis.location == "Dubai"
        assert analysis.design_temperature == 24.0
        assert analysis.status == AnalysisStatus.PENDING
    
    async def test_get_climate_data_dubai(self, db_session: AsyncSession):
        """Test climate data lookup for Dubai."""
        engine = ThermalAnalysisEngine(db_session)
        
        climate = await engine._get_climate_data("Dubai")
        
        assert climate is not None
        assert climate["summer_db"] == 46  # Summer dry bulb temperature
        assert climate["winter_db"] == 8   # Winter dry bulb temperature
        assert climate["latitude"] == 25.2
    
    async def test_get_climate_data_al_ain(self, db_session: AsyncSession):
        """Test climate data lookup for Al Ain."""
        engine = ThermalAnalysisEngine(db_session)
        
        climate = await engine._get_climate_data("Al Ain")
        
        assert climate is not None
        assert climate["summer_db"] == 48  # Hotter than Dubai
        assert climate["latitude"] == 24.2
    
    async def test_get_climate_data_abu_dhabi(self, db_session: AsyncSession):
        """Test climate data lookup for Abu Dhabi."""
        engine = ThermalAnalysisEngine(db_session)
        
        climate = await engine._get_climate_data("Abu Dhabi")
        
        assert climate is not None
        assert climate["summer_db"] == 45
        assert climate["latitude"] == 24.4
    
    async def test_get_climate_data_unknown(self, db_session: AsyncSession):
        """Test climate data fallback for unknown location."""
        engine = ThermalAnalysisEngine(db_session)
        
        climate = await engine._get_climate_data("Unknown City")
        
        # Should return default UAE climate data
        assert climate is not None
        assert "summer_db" in climate
        assert "winter_db" in climate
    
    async def test_calculate_cooling_load(self, db_session: AsyncSession, test_project: Project):
        """Test cooling load calculation."""
        engine = ThermalAnalysisEngine(db_session)
        
        analysis = await engine.create_analysis(
            project_id=test_project.id,
            location="Dubai",
            design_temperature=24.0
        )
        
        # Add a zone
        await engine.add_zone(
            analysis_id=analysis.id,
            name="Living Room",
            area_sqm=50.0,
            orientation="south"
        )
        
        # Run analysis
        success, message = await engine.run_analysis(analysis.id)
        
        assert success is True
        
        # Verify results
        await db_session.refresh(analysis)
        assert analysis.status == AnalysisStatus.COMPLETED
        assert analysis.total_cooling_load is not None
        assert analysis.total_cooling_load > 0
        assert analysis.cooling_load_per_sqm is not None
    
    async def test_calculate_heating_load(self, db_session: AsyncSession, test_project: Project):
        """Test heating load calculation."""
        engine = ThermalAnalysisEngine(db_session)
        
        analysis = await engine.create_analysis(
            project_id=test_project.id,
            location="Dubai",
            design_temperature=24.0
        )
        
        # Add a zone
        await engine.add_zone(
            analysis_id=analysis.id,
            name="Bedroom",
            area_sqm=30.0,
            orientation="north"
        )
        
        # Run analysis
        success, message = await engine.run_analysis(analysis.id)
        
        assert success is True
        
        # Verify results
        await db_session.refresh(analysis)
        assert analysis.total_heating_load is not None
        assert analysis.total_heating_load >= 0
    
    async def test_solar_gain_factors(self, db_session: AsyncSession):
        """Test solar gain factors by orientation."""
        engine = ThermalAnalysisEngine(db_session)
        
        # South-facing gets highest solar gain in UAE
        south_factor = engine._get_solar_gain_factor("south")
        north_factor = engine._get_solar_gain_factor("north")
        east_factor = engine._get_solar_gain_factor("east")
        west_factor = engine._get_solar_gain_factor("west")
        
        assert south_factor > north_factor  # South gets more sun
        assert east_factor == west_factor   # East and West are equal
        assert all(f > 0 for f in [south_factor, north_factor, east_factor, west_factor])
    
    async def test_ventilation_load(self, db_session: AsyncSession, test_project: Project):
        """Test ventilation load calculation."""
        engine = ThermalAnalysisEngine(db_session)
        
        analysis = await engine.create_analysis(
            project_id=test_project.id,
            location="Dubai",
            design_temperature=24.0
        )
        
        # Add multiple zones
        await engine.add_zone(analysis.id, "Zone 1", 40.0, "south")
        await engine.add_zone(analysis.id, "Zone 2", 35.0, "north")
        await engine.add_zone(analysis.id, "Zone 3", 25.0, "east")
        
        # Run analysis
        success, message = await engine.run_analysis(analysis.id)
        
        assert success is True
        
        # Verify zones were calculated
        await db_session.refresh(analysis)
        assert len(analysis.zones) == 3
        
        for zone in analysis.zones:
            assert zone.cooling_load is not None
            assert zone.cooling_load_per_sqm is not None
    
    async def test_analysis_with_no_zones(self, db_session: AsyncSession, test_project: Project):
        """Test analysis fails gracefully with no zones."""
        engine = ThermalAnalysisEngine(db_session)
        
        analysis = await engine.create_analysis(
            project_id=test_project.id,
            location="Dubai",
            design_temperature=24.0
        )
        
        # Run analysis without adding zones
        success, message = await engine.run_analysis(analysis.id)
        
        assert success is False
        assert "zone" in message.lower() or "no zones" in message.lower()
