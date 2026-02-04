"""
Deviations API - Pillar 4: Deviation Detection
Compares actual vs expected positions from 3D model.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional

from app.core.database import get_db
from app.models.deviation import DeviationEvent, DeviationStatus, DeviationSeverity
from app.services.deviation_detector import DeviationDetector
from app.schemas.deviation import (
    DeviationCreate, DeviationResponse, DeviationListResponse,
    DeviationReviewRequest, DeviationReviewResponse,
    DeviationRectifyRequest, PositionCheckRequest, PositionCheckResponse
)

router = APIRouter()


@router.post("/check-position", response_model=PositionCheckResponse)
async def check_position_deviation(
    request: PositionCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    """Check for position deviation and create event if outside tolerance."""
    detector = DeviationDetector(db)
    
    has_deviation, deviation, message = await detector.detect_deviation(
        project_id=request.project_id,
        element_id=request.element_id,
        element_type=request.element_type,
        element_name=request.element_name or request.element_id,
        expected_position=request.expected_position.model_dump(),
        actual_position=request.actual_position.model_dump(),
        photo_id=request.photo_id,
        detected_by="system"
    )
    
    await db.commit()
    
    return PositionCheckResponse(
        has_deviation=has_deviation,
        deviation_mm=deviation.position_deviation_mm if deviation else 0,
        tolerance_mm=deviation.tolerance_mm if deviation else 20,
        is_within_tolerance=not has_deviation,
        severity=deviation.severity if deviation else None,
        deviation_id=deviation.id if deviation else None,
        message=message
    )


@router.get("/project/{project_id}", response_model=DeviationListResponse)
async def list_deviations(
    project_id: str,
    severity: Optional[List[str]] = None,
    status: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all deviations for a project with optional filtering."""
    query = select(DeviationEvent).where(DeviationEvent.project_id == project_id)
    
    if severity:
        query = query.where(DeviationEvent.severity.in_(severity))
    
    if status:
        query = query.where(DeviationEvent.status.in_(status))
    
    result = await db.execute(query.order_by(DeviationEvent.detected_at.desc()))
    deviations = result.scalars().all()
    
    # Count by severity
    by_severity = {}
    for d in deviations:
        by_severity[d.severity.value] = by_severity.get(d.severity.value, 0) + 1
    
    return DeviationListResponse(
        deviations=deviations,
        total=len(deviations),
        by_severity=by_severity
    )


@router.get("/critical/project/{project_id}")
async def get_critical_deviations(
    project_id: str,
    include_major: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Get critical (and optionally major) unresolved deviations."""
    detector = DeviationDetector(db)
    deviations = await detector.get_critical_deviations(project_id, include_major)
    
    return {
        "project_id": project_id,
        "critical_count": len([d for d in deviations if d.severity == DeviationSeverity.CRITICAL]),
        "major_count": len([d for d in deviations if d.severity == DeviationSeverity.MAJOR]),
        "deviations": [
            {
                "id": d.id,
                "element_type": d.element_type,
                "element_name": d.element_name,
                "severity": d.severity.value,
                "status": d.status.value,
                "deviation_mm": d.position_deviation_mm or d.dimension_deviation_mm,
                "detected_at": d.detected_at.isoformat()
            }
            for d in deviations
        ]
    }


@router.get("/{deviation_id}", response_model=DeviationResponse)
async def get_deviation(
    deviation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get deviation details."""
    result = await db.execute(
        select(DeviationEvent).where(DeviationEvent.id == deviation_id)
    )
    deviation = result.scalar_one_or_none()
    
    if not deviation:
        raise HTTPException(status_code=404, detail="Deviation not found")
    
    return deviation


@router.post("/{deviation_id}/accept", response_model=DeviationReviewResponse)
async def accept_deviation(
    deviation_id: str,
    request: DeviationReviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Accept a deviation (no rectification needed)."""
    detector = DeviationDetector(db)
    success = await detector.accept_deviation(
        deviation_id=deviation_id,
        reviewed_by=request.reviewed_by,
        notes=request.notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Deviation not found")
    
    await db.commit()
    
    return DeviationReviewResponse(
        success=True,
        message="Deviation accepted",
        deviation_id=deviation_id
    )


@router.post("/{deviation_id}/reject", response_model=DeviationReviewResponse)
async def reject_deviation(
    deviation_id: str,
    request: DeviationReviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reject a deviation (requires rectification)."""
    detector = DeviationDetector(db)
    success = await detector.reject_deviation(
        deviation_id=deviation_id,
        reviewed_by=request.reviewed_by,
        notes=request.notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Deviation not found")
    
    await db.commit()
    
    return DeviationReviewResponse(
        success=True,
        message="Deviation rejected - rectification required",
        deviation_id=deviation_id
    )


@router.post("/{deviation_id}/rectify")
async def mark_rectified(
    deviation_id: str,
    request: DeviationRectifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """Mark a deviation as rectified."""
    detector = DeviationDetector(db)
    success = await detector.mark_rectified(
        deviation_id=deviation_id,
        notes=request.notes,
        actual_cost=request.actual_cost
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Deviation not found")
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Deviation marked as rectified",
        "deviation_id": deviation_id
    }


@router.get("/project/{project_id}/summary")
async def get_deviation_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get deviation summary for a project."""
    result = await db.execute(
        select(DeviationEvent).where(DeviationEvent.project_id == project_id)
    )
    deviations = result.scalars().all()
    
    summary = {
        "total": len(deviations),
        "by_severity": {
            "critical": 0,
            "major": 0,
            "minor": 0,
            "cosmetic": 0
        },
        "by_status": {
            "detected": 0,
            "under_review": 0,
            "accepted": 0,
            "rejected": 0,
            "rectified": 0,
            "closed": 0
        },
        "open_critical": 0,
        "open_major": 0
    }
    
    for d in deviations:
        summary["by_severity"][d.severity.value] += 1
        summary["by_status"][d.status.value] += 1
        
        if d.severity == DeviationSeverity.CRITICAL and d.status in [
            DeviationStatus.DETECTED, DeviationStatus.UNDER_REVIEW, DeviationStatus.REJECTED
        ]:
            summary["open_critical"] += 1
        
        if d.severity == DeviationSeverity.MAJOR and d.status in [
            DeviationStatus.DETECTED, DeviationStatus.UNDER_REVIEW, DeviationStatus.REJECTED
        ]:
            summary["open_major"] += 1
    
    return summary
