"""
Thermal Analysis Engine - Pillar 3: The "Brain"

Calculates cooling/heating loads based on:
1. 3D model geometry (rooms, walls, windows)
2. Climate data for the project location
3. Construction properties (U-values, etc.)
"""

import math
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.analysis import ThermalAnalysis, ThermalZone, AnalysisStatus
from app.models.project import Project

# Climate data for UAE locations (simplified)
CLIMATE_DATA = {
    "dubai": {
        "outdoor_design_temp_summer": 45.0,  # °C
        "outdoor_design_temp_winter": 8.0,
        "relative_humidity_summer": 60.0,  # %
        "relative_humidity_winter": 70.0,
        "solar_radiation_peak": 900.0,  # W/m²
        "wind_speed": 3.5,  # m/s
        "altitude": 5.0,  # m above sea level
        "cooling_degree_days": 4200,
        "heating_degree_days": 150,
    },
    "abu_dhabi": {
        "outdoor_design_temp_summer": 46.0,
        "outdoor_design_temp_winter": 10.0,
        "relative_humidity_summer": 65.0,
        "relative_humidity_winter": 75.0,
        "solar_radiation_peak": 950.0,
        "wind_speed": 4.0,
        "altitude": 10.0,
        "cooling_degree_days": 4500,
        "heating_degree_days": 100,
    },
    "sharjah": {
        "outdoor_design_temp_summer": 45.5,
        "outdoor_design_temp_winter": 9.0,
        "relative_humidity_summer": 62.0,
        "relative_humidity_winter": 72.0,
        "solar_radiation_peak": 920.0,
        "wind_speed": 3.8,
        "altitude": 15.0,
        "cooling_degree_days": 4300,
        "heating_degree_days": 120,
    },
    "al_ain": {
        "outdoor_design_temp_summer": 47.0,
        "outdoor_design_temp_winter": 7.0,
        "relative_humidity_summer": 40.0,
        "relative_humidity_winter": 60.0,
        "solar_radiation_peak": 980.0,
        "wind_speed": 2.5,
        "altitude": 300.0,
        "cooling_degree_days": 4800,
        "heating_degree_days": 200,
    },
    "ras_al_khaimah": {
        "outdoor_design_temp_summer": 44.0,
        "outdoor_design_temp_winter": 11.0,
        "relative_humidity_summer": 70.0,
        "relative_humidity_winter": 80.0,
        "solar_radiation_peak": 880.0,
        "wind_speed": 4.5,
        "altitude": 2.0,
        "cooling_degree_days": 4000,
        "heating_degree_days": 80,
    },
    "fujairah": {
        "outdoor_design_temp_summer": 43.0,
        "outdoor_design_temp_winter": 12.0,
        "relative_humidity_summer": 75.0,
        "relative_humidity_winter": 85.0,
        "solar_radiation_peak": 850.0,
        "wind_speed": 5.0,
        "altitude": 5.0,
        "cooling_degree_days": 3800,
        "heating_degree_days": 50,
    },
}

# Default construction properties (can be overridden per zone)
DEFAULT_WALL_U_VALUE = 0.35  # W/m²K - good insulation for UAE
DEFAULT_ROOF_U_VALUE = 0.25
DEFAULT_FLOOR_U_VALUE = 0.40
DEFAULT_WINDOW_U_VALUE = 1.8  # Double glazed, low-e

# Internal heat gains (W/m²)
OCCUPANCY_HEAT_GAIN = 100  # W per person
LIGHTING_HEAT_GAIN = 15  # W/m²
EQUIPMENT_HEAT_GAIN = 20  # W/m²

# Ventilation rates (L/s per m²)
VENTILATION_RATE = 0.5

# Air density (kg/m³) at sea level
AIR_DENSITY = 1.225

# Specific heat of air (J/kg·K)
SPECIFIC_HEAT_AIR = 1005


class ThermalAnalysisEngine:
    """Calculates thermal loads for building zones"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_analysis(
        self, 
        project_id: str, 
        location: str,
        design_temperature: float = 24.0
    ) -> ThermalAnalysis:
        """Create a new thermal analysis for a project"""
        
        # Get climate data
        location_key = location.lower().replace(" ", "_")
        climate_data = CLIMATE_DATA.get(location_key, CLIMATE_DATA["dubai"])
        
        analysis = ThermalAnalysis(
            project_id=project_id,
            location=location,
            design_temperature=design_temperature,
            climate_data=climate_data,
            status=AnalysisStatus.PENDING,
        )
        
        self.db.add(analysis)
        await self.db.flush()
        
        return analysis
    
    async def run_analysis(self, analysis_id: str) -> tuple[bool, str]:
        """
        Run the thermal analysis.
        Returns (success, message).
        """
        # Get analysis
        result = await self.db.execute(
            select(ThermalAnalysis).where(ThermalAnalysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        
        if not analysis:
            return False, "Analysis not found"
        
        # Get project and its 3D model data
        result = await self.db.execute(
            select(Project).where(Project.id == analysis.project_id)
        )
        project = result.scalar_one_or_none()
        
        if not project:
            return False, "Project not found"
        
        # Check if project has 3D model with room data
        model_metadata = project.model_metadata or {}
        rooms = model_metadata.get("rooms", [])
        
        if not rooms:
            # Create default zones based on typical villa layout
            rooms = self._generate_default_rooms()
        
        analysis.status = AnalysisStatus.RUNNING
        await self.db.flush()
        
        try:
            # Process each room as a thermal zone
            total_cooling_load = 0.0
            total_heating_load = 0.0
            
            for room_data in rooms:
                zone = await self._create_zone_from_room(
                    analysis_id=analysis.id,
                    room_data=room_data,
                    climate_data=analysis.climate_data,
                    design_temp=analysis.design_temperature
                )
                
                self.db.add(zone)
                
                total_cooling_load += zone.cooling_load_kw
                total_heating_load += zone.heating_load_kw
            
            # Update analysis results
            analysis.total_cooling_load_kw = total_cooling_load
            analysis.total_heating_load_kw = total_heating_load
            analysis.recommended_ac_tons = total_cooling_load / 3.517  # 1 ton = 3.517 kW
            
            # Estimate annual energy (simplified)
            analysis.annual_cooling_kwh = self._estimate_annual_cooling(
                total_cooling_load, analysis.climate_data
            )
            analysis.annual_heating_kwh = self._estimate_annual_heating(
                total_heating_load, analysis.climate_data
            )
            
            # Estimate cost (AED 0.30 per kWh average)
            analysis.estimated_annual_cost_aed = (
                analysis.annual_cooling_kwh + analysis.annual_heating_kwh
            ) * 0.30
            
            analysis.status = AnalysisStatus.COMPLETED
            analysis.completed_at = datetime.utcnow()
            
            await self.db.flush()
            
            return True, f"Analysis completed. Total cooling load: {total_cooling_load:.2f} kW"
            
        except Exception as e:
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(e)
            await self.db.flush()
            return False, f"Analysis failed: {str(e)}"
    
    async def _create_zone_from_room(
        self,
        analysis_id: str,
        room_data: Dict[str, Any],
        climate_data: Dict[str, float],
        design_temp: float
    ) -> ThermalZone:
        """Create a thermal zone from room data and calculate loads"""
        
        # Extract room properties
        name = room_data.get("name", "Unnamed Room")
        element_id = room_data.get("id", "")
        area_sqm = room_data.get("area", 20.0)
        ceiling_height = room_data.get("height", 2.7)
        volume_cubm = area_sqm * ceiling_height
        
        # Get construction properties (with defaults)
        wall_u = room_data.get("wall_u_value", DEFAULT_WALL_U_VALUE)
        roof_u = room_data.get("roof_u_value", DEFAULT_ROOF_U_VALUE)
        floor_u = room_data.get("floor_u_value", DEFAULT_FLOOR_U_VALUE)
        window_u = room_data.get("window_u_value", DEFAULT_WINDOW_U_VALUE)
        
        window_area = room_data.get("window_area", area_sqm * 0.15)  # Assume 15% glazing
        orientation = room_data.get("orientation", "south")
        
        # Calculate envelope heat transfer
        # Assume perimeter for walls: 4 * sqrt(area) for square room
        perimeter = 4 * math.sqrt(area_sqm)
        wall_area = perimeter * ceiling_height - window_area
        roof_area = area_sqm
        floor_area = area_sqm
        
        # Temperature differences
        delta_t_cooling = climate_data["outdoor_design_temp_summer"] - design_temp
        delta_t_heating = design_temp - climate_data["outdoor_design_temp_winter"]
        
        # 1. Conductive heat gain/loss through envelope
        wall_q_cooling = wall_area * wall_u * delta_t_cooling / 1000  # kW
        wall_q_heating = wall_area * wall_u * delta_t_heating / 1000
        
        roof_q_cooling = roof_area * roof_u * delta_t_cooling / 1000
        roof_q_heating = roof_area * roof_u * delta_t_heating / 1000
        
        floor_q_cooling = floor_area * floor_u * (design_temp - 25) / 1000  # Ground temp ~25°C
        floor_q_heating = floor_area * floor_u * (25 - design_temp) / 1000
        
        # 2. Solar heat gain through windows
        solar_factor = self._get_solar_factor(orientation)
        window_solar_gain = (
            window_area * window_u * delta_t_cooling / 1000 +
            window_area * climate_data["solar_radiation_peak"] * solar_factor * 0.6 / 1000
        )
        
        # 3. Internal heat gains
        occupancy = max(1, int(area_sqm / 10))  # 1 person per 10 m²
        internal_gain = (
            occupancy * OCCUPANCY_HEAT_GAIN +
            area_sqm * LIGHTING_HEAT_GAIN +
            area_sqm * EQUIPMENT_HEAT_GAIN
        ) / 1000  # kW
        
        # 4. Ventilation load
        ventilation_flow = area_sqm * VENTILATION_RATE / 1000  # m³/s
        ventilation_cooling = (
            ventilation_flow * AIR_DENSITY * SPECIFIC_HEAT_AIR * delta_t_cooling / 1000
        )
        ventilation_heating = (
            ventilation_flow * AIR_DENSITY * SPECIFIC_HEAT_AIR * delta_t_heating / 1000
        )
        
        # Total loads
        cooling_load = (
            wall_q_cooling + roof_q_cooling + floor_q_cooling +
            window_solar_gain + internal_gain + ventilation_cooling
        )
        
        heating_load = (
            wall_q_heating + roof_q_heating + floor_q_heating +
            ventilation_heating
        )
        
        # Safety factor (10%)
        cooling_load *= 1.1
        heating_load *= 1.1
        
        # Generate heatmap data for 3D visualization
        heatmap_data = self._generate_heatmap_data(
            room_data, cooling_load, climate_data["outdoor_design_temp_summer"]
        )
        
        return ThermalZone(
            analysis_id=analysis_id,
            name=name,
            element_id=element_id,
            area_sqm=area_sqm,
            volume_cubm=volume_cubm,
            ceiling_height=ceiling_height,
            wall_u_value=wall_u,
            roof_u_value=roof_u,
            floor_u_value=floor_u,
            window_u_value=window_u,
            window_area_sqm=window_area,
            window_orientation=orientation,
            cooling_load_kw=round(cooling_load, 2),
            heating_load_kw=round(heating_load, 2),
            peak_temperature=climate_data["outdoor_design_temp_summer"],
            heatmap_data=heatmap_data,
        )
    
    def _get_solar_factor(self, orientation: str) -> float:
        """Get solar gain factor based on orientation"""
        factors = {
            "north": 0.15,
            "south": 0.35,
            "east": 0.45,
            "west": 0.50,
            "northeast": 0.30,
            "northwest": 0.35,
            "southeast": 0.40,
            "southwest": 0.45,
        }
        return factors.get(orientation.lower(), 0.35)
    
    def _generate_heatmap_data(
        self, 
        room_data: Dict[str, Any], 
        cooling_load: float,
        outdoor_temp: float
    ) -> Dict[str, Any]:
        """Generate heatmap data for 3D visualization"""
        # Simulate temperature distribution
        # Hotter near windows, cooler in center
        return {
            "center_temp": 24.0,
            "window_temp": min(28.0, 24.0 + cooling_load * 0.5),
            "wall_temp": 26.0,
            "floor_temp": 25.0,
            "ceiling_temp": 26.5,
            "color_scale": "RdYlBu_r",  # Red (hot) to Blue (cool)
        }
    
    def _estimate_annual_cooling(
        self, 
        peak_cooling_load: float, 
        climate_data: Dict[str, float]
    ) -> float:
        """Estimate annual cooling energy consumption"""
        # Simplified: peak load * equivalent full load hours
        # UAE: ~2500 equivalent full load hours for cooling
        eflh = 2500
        cop = 3.0  # Coefficient of Performance (average)
        return peak_cooling_load * eflh / cop
    
    def _estimate_annual_heating(
        self, 
        peak_heating_load: float, 
        climate_data: Dict[str, float]
    ) -> float:
        """Estimate annual heating energy consumption"""
        # UAE: minimal heating needed
        eflh = 200
        cop = 2.5
        return peak_heating_load * eflh / cop
    
    def _generate_default_rooms(self) -> List[Dict[str, Any]]:
        """Generate default room data for a typical villa"""
        return [
            {"name": "Living Room", "area": 45, "height": 3.0, "orientation": "south", "window_area": 12},
            {"name": "Master Bedroom", "area": 25, "height": 2.7, "orientation": "west", "window_area": 5},
            {"name": "Kitchen", "area": 18, "height": 2.7, "orientation": "north", "window_area": 3},
            {"name": "Bedroom 2", "area": 18, "height": 2.7, "orientation": "east", "window_area": 4},
            {"name": "Bedroom 3", "area": 16, "height": 2.7, "orientation": "east", "window_area": 3},
            {"name": "Majlis", "area": 30, "height": 3.0, "orientation": "south", "window_area": 8},
            {"name": "Dining Room", "area": 20, "height": 2.7, "orientation": "north", "window_area": 4},
        ]
