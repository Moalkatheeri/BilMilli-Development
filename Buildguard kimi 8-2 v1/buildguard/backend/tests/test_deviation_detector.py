"""Tests for Deviation Detector service."""
import pytest
import math
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.deviation import DeviationEvent, DeviationSeverity, DeviationStatus
from app.services.deviation_detector import DeviationDetector


class TestDeviationDetector:
    """Test deviation detection functionality."""
    
    async def test_detect_deviation_position_within_tolerance(self, db_session: AsyncSession, test_project: Project):
        """Test that no deviation is detected when position is within tolerance."""
        detector = DeviationDetector(db_session)
        
        has_deviation, deviation, message = await detector.detect_deviation(
            project_id=test_project.id,
            element_id="wall_001",
            element_type="wall",
            element_name="Test Wall",
            expected_position={"x": 0, "y": 0, "z": 0},
            actual_position={"x": 5, "y": 5, "z": 0},  # 7mm deviation (within 20mm tolerance)
            detected_by="system"
        )
        
        assert has_deviation is False
        assert deviation is None
        assert "within tolerance" in message.lower()
    
    async def test_detect_deviation_position_outside_tolerance(self, db_session: AsyncSession, test_project: Project):
        """Test that deviation is detected when position is outside tolerance."""
        detector = DeviationDetector(db_session)
        
        has_deviation, deviation, message = await detector.detect_deviation(
            project_id=test_project.id,
            element_id="wall_001",
            element_type="wall",
            element_name="Test Wall",
            expected_position={"x": 0, "y": 0, "z": 0},
            actual_position={"x": 30, "y": 0, "z": 0},  # 30mm deviation (outside 20mm tolerance)
            detected_by="system"
        )
        
        assert has_deviation is True
        assert deviation is not None
        assert deviation.deviation_mm == 30.0
        assert deviation.tolerance_mm == 20.0
    
    async def test_calculate_deviation_distance(self, db_session: AsyncSession):
        """Test Euclidean distance calculation for deviation."""
        detector = DeviationDetector(db_session)
        
        # Test 3D distance calculation
        distance = detector._calculate_distance(
            {"x": 0, "y": 0, "z": 0},
            {"x": 3, "y": 4, "z": 0}
        )
        assert distance == 5.0  # 3-4-5 triangle
        
        distance = detector._calculate_distance(
            {"x": 0, "y": 0, "z": 0},
            {"x": 10, "y": 10, "z": 10}
        )
        expected = math.sqrt(300)  # sqrt(10^2 + 10^2 + 10^2)
        assert abs(distance - expected) < 0.001
    
    async def test_get_tolerance_for_element_type(self, db_session: AsyncSession):
        """Test tolerance values for different element types."""
        detector = DeviationDetector(db_session)
        
        # Walls have 20mm tolerance
        assert detector._get_tolerance("wall") == 20.0
        
        # Columns have 15mm tolerance
        assert detector._get_tolerance("column") == 15.0
        
        # Windows have 10mm tolerance
        assert detector._get_tolerance("window") == 10.0
        
        # Doors have 10mm tolerance
        assert detector._get_tolerance("door") == 10.0
        
        # Default tolerance for unknown types
        assert detector._get_tolerance("unknown") == 20.0
    
    async def test_classify_severity(self, db_session: AsyncSession):
        """Test severity classification based on deviation amount."""
        detector = DeviationDetector(db_session)
        
        # Cosmetic: within tolerance
        assert detector._classify_severity(15, 20) == DeviationSeverity.COSMETIC
        
        # Minor: 1-1.5x tolerance
        assert detector._classify_severity(25, 20) == DeviationSeverity.MINOR
        
        # Major: 1.5-2x tolerance
        assert detector._classify_severity(35, 20) == DeviationSeverity.MAJOR
        
        # Critical: >2x tolerance
        assert detector._classify_severity(50, 20) == DeviationSeverity.CRITICAL
    
    async def test_get_critical_deviations(self, db_session: AsyncSession, test_project: Project):
        """Test retrieving critical deviations."""
        detector = DeviationDetector(db_session)
        
        # Create some deviations
        deviations = [
            DeviationEvent(
                project_id=test_project.id,
                element_type="wall",
                element_id="wall_001",
                deviation_type="position",
                severity=DeviationSeverity.CRITICAL,
                status=DeviationStatus.DETECTED,
                detected_by="system"
            ),
            DeviationEvent(
                project_id=test_project.id,
                element_type="column",
                element_id="col_001",
                deviation_type="position",
                severity=DeviationSeverity.MAJOR,
                status=DeviationStatus.DETECTED,
                detected_by="system"
            ),
            DeviationEvent(
                project_id=test_project.id,
                element_type="beam",
                element_id="beam_001",
                deviation_type="position",
                severity=DeviationSeverity.MINOR,
                status=DeviationStatus.DETECTED,
                detected_by="system"
            ),
        ]
        for d in deviations:
            db_session.add(d)
        await db_session.flush()
        
        # Get critical deviations
        critical = await detector.get_critical_deviations(test_project.id, include_major=False)
        assert len(critical) == 1
        assert critical[0].severity == DeviationSeverity.CRITICAL
        
        # Get critical and major
        critical_and_major = await detector.get_critical_deviations(test_project.id, include_major=True)
        assert len(critical_and_major) == 2
    
    async def test_accept_deviation(self, db_session: AsyncSession, test_project: Project, test_deviation: DeviationEvent):
        """Test accepting a deviation."""
        detector = DeviationDetector(db_session)
        
        success = await detector.accept_deviation(
            deviation_id=test_deviation.id,
            reviewed_by="consultant_123",
            notes="Acceptable deviation"
        )
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_deviation)
        assert test_deviation.status == DeviationStatus.ACCEPTED
        assert test_deviation.reviewed_by == "consultant_123"
        assert test_deviation.reviewed_at is not None
    
    async def test_reject_deviation(self, db_session: AsyncSession, test_project: Project, test_deviation: DeviationEvent):
        """Test rejecting a deviation (requires rectification)."""
        detector = DeviationDetector(db_session)
        
        success = await detector.reject_deviation(
            deviation_id=test_deviation.id,
            reviewed_by="consultant_123",
            notes="Must be rectified"
        )
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_deviation)
        assert test_deviation.status == DeviationStatus.REJECTED
        assert test_deviation.reviewed_by == "consultant_123"
    
    async def test_mark_rectified(self, db_session: AsyncSession, test_project: Project, test_deviation: DeviationEvent):
        """Test marking a deviation as rectified."""
        detector = DeviationDetector(db_session)
        
        # First reject it
        await detector.reject_deviation(test_deviation.id, "consultant_123", "Must fix")
        
        # Then mark as rectified
        success = await detector.mark_rectified(
            deviation_id=test_deviation.id,
            notes="Fixed by contractor",
            actual_cost=500.0
        )
        
        assert success is True
        
        # Verify status changed
        await db_session.refresh(test_deviation)
        assert test_deviation.status == DeviationStatus.RECTIFIED
        assert test_deviation.rectified_at is not None
        assert test_deviation.actual_cost == 500.0
