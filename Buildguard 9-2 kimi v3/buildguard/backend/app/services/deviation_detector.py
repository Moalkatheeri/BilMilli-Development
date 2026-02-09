"""
Deviation Detection Service - Pillar 4: Quality Control

Compares actual positions (from photo metadata/AR) vs expected positions (from 3D model).
Creates deviation events when tolerances are exceeded.
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.deviation import DeviationEvent, DeviationStatus, DeviationSeverity
from app.models.capture import PhotoCapture, PhotoMetadata
from app.models.project import Project

# Tolerance rules (in millimeters)
DEFAULT_TOLERANCES = {
    "wall_position": 20.0,  # ±20mm
    "wall_verticality": 10.0,  # per 3m height
    "column_position": 15.0,
    "column_verticality": 8.0,
    "beam_position": 15.0,
    "beam_level": 10.0,
    "window_position": 10.0,
    "door_position": 10.0,
    "floor_level": 5.0,
    "ceiling_level": 10.0,
}

# Severity thresholds (deviation / tolerance)
SEVERITY_THRESHOLDS = {
    "cosmetic": 1.0,  # At tolerance
    "minor": 1.5,  # 1.5x tolerance
    "major": 2.0,  # 2x tolerance
    "critical": 3.0,  # 3x tolerance
}


class DeviationDetector:
    """Detects deviations between actual and expected construction"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def detect_deviation(
        self,
        project_id: str,
        element_id: str,
        element_type: str,
        element_name: str,
        expected_position: Dict[str, float],
        actual_position: Dict[str, float],
        photo_id: Optional[str] = None,
        detected_by: str = "system"
    ) -> Tuple[bool, Optional[DeviationEvent], str]:
        """
        Detect if there's a deviation for an element.
        Returns (has_deviation, deviation_event_or_none, message).
        """
        # Calculate position deviation
        position_deviation_mm = self._calculate_distance(
            expected_position, actual_position
        ) * 1000  # Convert to mm
        
        # Get tolerance for this element type
        tolerance_key = f"{element_type}_position"
        tolerance_mm = DEFAULT_TOLERANCES.get(tolerance_key, 20.0)
        
        # Check if within tolerance
        is_within_tolerance = position_deviation_mm <= tolerance_mm
        
        if is_within_tolerance:
            return False, None, f"Within tolerance ({position_deviation_mm:.1f}mm <= {tolerance_mm}mm)"
        
        # Determine severity
        deviation_ratio = position_deviation_mm / tolerance_mm
        severity = self._determine_severity(deviation_ratio)
        
        # Create deviation event
        deviation = DeviationEvent(
            project_id=project_id,
            element_type=element_type,
            element_id=element_id,
            element_name=element_name,
            deviation_type="position",
            severity=severity,
            expected_position=expected_position,
            actual_position=actual_position,
            position_deviation_mm=position_deviation_mm,
            tolerance_mm=tolerance_mm,
            is_within_tolerance=False,
            detected_by=detected_by,
            detection_confidence=1.0,
            photo_id=photo_id,
            status=DeviationStatus.DETECTED,
            detected_at=datetime.utcnow(),
        )
        
        self.db.add(deviation)
        await self.db.flush()
        
        return True, deviation, f"Deviation detected: {position_deviation_mm:.1f}mm (severity: {severity.value})"
    
    async def detect_dimension_deviation(
        self,
        project_id: str,
        element_id: str,
        element_type: str,
        element_name: str,
        expected_dimension: Dict[str, float],
        actual_dimension: Dict[str, float],
        photo_id: Optional[str] = None
    ) -> Tuple[bool, Optional[DeviationEvent], str]:
        """
        Detect dimension deviation (width, height, depth).
        """
        # Calculate dimension deviations
        deviations = {}
        for key in ["width", "height", "depth"]:
            if key in expected_dimension and key in actual_dimension:
                deviations[key] = abs(
                    actual_dimension[key] - expected_dimension[key]
                ) * 1000  # to mm
        
        if not deviations:
            return False, None, "No comparable dimensions"
        
        # Get max deviation
        max_deviation_key = max(deviations, key=deviations.get)
        max_deviation_mm = deviations[max_deviation_key]
        
        # Tolerance for dimensions
        tolerance_mm = DEFAULT_TOLERANCES.get(f"{element_type}_position", 20.0)
        
        if max_deviation_mm <= tolerance_mm:
            return False, None, f"Within tolerance ({max_deviation_mm:.1f}mm)"
        
        # Determine severity
        deviation_ratio = max_deviation_mm / tolerance_mm
        severity = self._determine_severity(deviation_ratio)
        
        deviation = DeviationEvent(
            project_id=project_id,
            element_type=element_type,
            element_id=element_id,
            element_name=element_name,
            deviation_type="dimension",
            severity=severity,
            expected_dimension=expected_dimension,
            actual_dimension=actual_dimension,
            dimension_deviation_mm=max_deviation_mm,
            tolerance_mm=tolerance_mm,
            is_within_tolerance=False,
            detected_by="system",
            detection_confidence=0.9,
            photo_id=photo_id,
            status=DeviationStatus.DETECTED,
            detected_at=datetime.utcnow(),
        )
        
        self.db.add(deviation)
        await self.db.flush()
        
        return True, deviation, f"Dimension deviation: {max_deviation_mm:.1f}mm ({max_deviation_key})"
    
    async def anchor_photo_to_element(
        self,
        photo_id: str,
        element_id: str,
        confidence: float
    ) -> bool:
        """
        Anchor a photo to a 3D element.
        Updates the photo metadata with anchoring information.
        """
        result = await self.db.execute(
            select(PhotoMetadata).where(PhotoMetadata.photo_id == photo_id)
        )
        metadata = result.scalar_one_or_none()
        
        if not metadata:
            return False
        
        metadata.anchored_element_id = element_id
        metadata.anchor_confidence = confidence
        
        await self.db.flush()
        return True
    
    async def process_photo_for_deviation(
        self,
        photo_id: str,
        project_id: str
    ) -> List[DeviationEvent]:
        """
        Process a photo to detect deviations.
        This would integrate with computer vision/AR in production.
        For now, simulates detection based on photo metadata.
        """
        deviations = []
        
        # Get photo and metadata
        result = await self.db.execute(
            select(PhotoCapture, PhotoMetadata)
            .join(PhotoMetadata, PhotoCapture.id == PhotoMetadata.photo_id)
            .where(PhotoCapture.id == photo_id)
        )
        row = result.first()
        
        if not row:
            return deviations
        
        photo, metadata = row
        
        # Get project 3D model
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        
        if not project or not project.model_metadata:
            return deviations
        
        # Get elements from 3D model
        elements = project.model_metadata.get("elements", [])
        
        # If photo has GPS and AR pose, compare with expected element positions
        if metadata.latitude and metadata.longitude and metadata.ar_pose_matrix:
            # In production: Use ARKit/ARCore to match photo to 3D model
            # For demo: Simulate detection
            pass
        
        return deviations
    
    async def get_critical_deviations(
        self, 
        project_id: str,
        include_major: bool = True
    ) -> List[DeviationEvent]:
        """Get all critical (and optionally major) deviations for a project"""
        from sqlalchemy import or_
        
        query = select(DeviationEvent).where(
            DeviationEvent.project_id == project_id
        )
        
        if include_major:
            query = query.where(
                or_(
                    DeviationEvent.severity == DeviationSeverity.CRITICAL,
                    DeviationEvent.severity == DeviationSeverity.MAJOR
                )
            )
        else:
            query = query.where(
                DeviationEvent.severity == DeviationSeverity.CRITICAL
            )
        
        query = query.where(
            DeviationEvent.status.in_([
                DeviationStatus.DETECTED,
                DeviationStatus.UNDER_REVIEW
            ])
        )
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def accept_deviation(
        self, 
        deviation_id: str, 
        reviewed_by: str,
        notes: str
    ) -> bool:
        """Accept a deviation (no rectification needed)"""
        result = await self.db.execute(
            select(DeviationEvent).where(DeviationEvent.id == deviation_id)
        )
        deviation = result.scalar_one_or_none()
        
        if not deviation:
            return False
        
        deviation.status = DeviationStatus.ACCEPTED
        deviation.reviewed_at = datetime.utcnow()
        deviation.review_notes = notes
        
        await self.db.flush()
        return True
    
    async def reject_deviation(
        self, 
        deviation_id: str, 
        reviewed_by: str,
        notes: str
    ) -> bool:
        """Reject a deviation (requires rectification)"""
        result = await self.db.execute(
            select(DeviationEvent).where(DeviationEvent.id == deviation_id)
        )
        deviation = result.scalar_one_or_none()
        
        if not deviation:
            return False
        
        deviation.status = DeviationStatus.REJECTED
        deviation.reviewed_at = datetime.utcnow()
        deviation.review_notes = notes
        deviation.assigned_to = reviewed_by  # Assign for rectification
        
        await self.db.flush()
        return True
    
    async def mark_rectified(
        self, 
        deviation_id: str, 
        notes: str,
        actual_cost: float = 0.0
    ) -> bool:
        """Mark a deviation as rectified"""
        result = await self.db.execute(
            select(DeviationEvent).where(DeviationEvent.id == deviation_id)
        )
        deviation = result.scalar_one_or_none()
        
        if not deviation:
            return False
        
        deviation.status = DeviationStatus.RECTIFIED
        deviation.rectified_at = datetime.utcnow()
        deviation.rectification_notes = notes
        deviation.actual_rectification_cost = actual_cost
        
        await self.db.flush()
        return True
    
    def _calculate_distance(
        self, 
        pos1: Dict[str, float], 
        pos2: Dict[str, float]
    ) -> float:
        """Calculate Euclidean distance between two 3D points (in meters)"""
        dx = pos1.get("x", 0) - pos2.get("x", 0)
        dy = pos1.get("y", 0) - pos2.get("y", 0)
        dz = pos1.get("z", 0) - pos2.get("z", 0)
        return math.sqrt(dx*dx + dy*dy + dz*dz)
    
    def _determine_severity(self, deviation_ratio: float) -> DeviationSeverity:
        """Determine severity based on deviation ratio"""
        if deviation_ratio >= SEVERITY_THRESHOLDS["critical"]:
            return DeviationSeverity.CRITICAL
        elif deviation_ratio >= SEVERITY_THRESHOLDS["major"]:
            return DeviationSeverity.MAJOR
        elif deviation_ratio >= SEVERITY_THRESHOLDS["minor"]:
            return DeviationSeverity.MINOR
        else:
            return DeviationSeverity.COSMETIC
