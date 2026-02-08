"""Contractor routes for performance tracking and scorecards."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.project import Project, ConstructionStage, StageStatus
from app.models.deviation import DeviationEvent, DeviationSeverity, DeviationStatus
from app.models.payment import PaymentGate, PaymentStatus

router = APIRouter()


@router.get("/{contractor_id}/scorecard")
async def get_contractor_scorecard(
    contractor_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get aggregated performance metrics for a contractor."""
    
    # Get all projects for this contractor
    result = await db.execute(
        select(Project).where(Project.contractor_id == contractor_id)
    )
    projects = result.scalars().all()
    
    if not projects:
        raise HTTPException(status_code=404, detail="Contractor not found or no projects")
    
    project_ids = [p.id for p in projects]
    
    # Calculate metrics
    # 1. On-time completion rate
    stages_result = await db.execute(
        select(ConstructionStage).where(
            ConstructionStage.project_id.in_(project_ids)
        )
    )
    stages = stages_result.scalars().all()
    
    completed_stages = [s for s in stages if s.status == StageStatus.APPROVED]
    on_time_stages = [
        s for s in completed_stages 
        if s.actual_end and s.expected_end and s.actual_end <= s.expected_end
    ]
    
    on_time_rate = len(on_time_stages) / len(completed_stages) * 100 if completed_stages else 0
    
    # 2. Deviation rate
    deviations_result = await db.execute(
        select(DeviationEvent).where(
            DeviationEvent.project_id.in_(project_ids)
        )
    )
    deviations = deviations_result.scalars().all()
    
    deviations_per_stage = len(deviations) / len(stages) if stages else 0
    
    # 3. Critical deviations
    critical_deviations = [d for d in deviations if d.severity == DeviationSeverity.CRITICAL]
    
    # 4. Average rectification time
    rectified_deviations = [
        d for d in deviations 
        if d.status == DeviationStatus.RECTIFIED and d.rectified_at and d.detected_at
    ]
    
    avg_rectification_days = 0
    if rectified_deviations:
        total_days = sum(
            (d.rectified_at - d.detected_at).days 
            for d in rectified_deviations
        )
        avg_rectification_days = total_days / len(rectified_deviations)
    
    # 5. Payment release rate
    payments_result = await db.execute(
        select(PaymentGate).where(
            PaymentGate.project_id.in_(project_ids)
        )
    )
    payments = payments_result.scalars().all()
    
    released_payments = [p for p in payments if p.status == PaymentStatus.RELEASED]
    payment_release_rate = len(released_payments) / len(payments) * 100 if payments else 0
    
    # 6. Quality score (composite)
    quality_score = (
        on_time_rate * 0.3 +
        (100 - min(deviations_per_stage * 10, 100)) * 0.3 +
        (100 - len(critical_deviations) * 5) * 0.2 +
        payment_release_rate * 0.2
    )
    quality_score = max(0, min(100, quality_score))
    
    return {
        "contractor_id": contractor_id,
        "total_projects": len(projects),
        "total_stages": len(stages),
        "completed_stages": len(completed_stages),
        "on_time_rate": round(on_time_rate, 2),
        "deviation_rate": round(deviations_per_stage, 2),
        "critical_deviations": len(critical_deviations),
        "avg_rectification_days": round(avg_rectification_days, 1),
        "payment_release_rate": round(payment_release_rate, 2),
        "quality_score": round(quality_score, 1),
        "grade": _calculate_grade(quality_score)
    }


def _calculate_grade(score: float) -> str:
    """Calculate letter grade from score."""
    if score >= 90:
        return "A+"
    elif score >= 85:
        return "A"
    elif score >= 80:
        return "A-"
    elif score >= 75:
        return "B+"
    elif score >= 70:
        return "B"
    elif score >= 65:
        return "B-"
    elif score >= 60:
        return "C+"
    elif score >= 55:
        return "C"
    elif score >= 50:
        return "C-"
    else:
        return "D"


@router.get("/{contractor_id}/performance")
async def get_contractor_performance(
    contractor_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get historical performance data for a contractor."""
    
    # Get all projects for this contractor
    result = await db.execute(
        select(Project).where(Project.contractor_id == contractor_id)
    )
    projects = result.scalars().all()
    
    if not projects:
        raise HTTPException(status_code=404, detail="Contractor not found or no projects")
    
    project_ids = [p.id for p in projects]
    
    # Monthly performance data
    stages_result = await db.execute(
        select(ConstructionStage).where(
            ConstructionStage.project_id.in_(project_ids)
        )
    )
    stages = stages_result.scalars().all()
    
    # Deviation trends
    deviations_result = await db.execute(
        select(DeviationEvent).where(
            DeviationEvent.project_id.in_(project_ids)
        )
    )
    deviations = deviations_result.scalars().all()
    
    # Payment history
    payments_result = await db.execute(
        select(PaymentGate).where(
            PaymentGate.project_id.in_(project_ids)
        )
    )
    payments = payments_result.scalars().all()
    
    return {
        "contractor_id": contractor_id,
        "project_history": [
            {
                "project_id": p.id,
                "name": p.name,
                "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
                "progress": p.progress,
                "start_date": p.start_date.isoformat() if p.start_date else None,
            }
            for p in projects
        ],
        "stage_completion": [
            {
                "stage_id": s.id,
                "name": s.name,
                "status": s.status.value if hasattr(s.status, 'value') else str(s.status),
                "completion_percentage": s.completion_percentage,
            }
            for s in stages
        ],
        "deviation_summary": {
            "total": len(deviations),
            "by_severity": {
                "cosmetic": len([d for d in deviations if d.severity == DeviationSeverity.COSMETIC]),
                "minor": len([d for d in deviations if d.severity == DeviationSeverity.MINOR]),
                "major": len([d for d in deviations if d.severity == DeviationSeverity.MAJOR]),
                "critical": len([d for d in deviations if d.severity == DeviationSeverity.CRITICAL]),
            },
            "by_status": {
                "detected": len([d for d in deviations if d.status == DeviationStatus.DETECTED]),
                "under_review": len([d for d in deviations if d.status == DeviationStatus.UNDER_REVIEW]),
                "accepted": len([d for d in deviations if d.status == DeviationStatus.ACCEPTED]),
                "rejected": len([d for d in deviations if d.status == DeviationStatus.REJECTED]),
                "rectified": len([d for d in deviations if d.status == DeviationStatus.RECTIFIED]),
                "closed": len([d for d in deviations if d.status == DeviationStatus.CLOSED]),
            }
        },
        "payment_summary": {
            "total_gates": len(payments),
            "total_amount": sum(p.amount for p in payments),
            "released_amount": sum(p.amount for p in payments if p.status == PaymentStatus.RELEASED),
            "pending_amount": sum(p.amount for p in payments if p.status == PaymentStatus.PENDING),
        }
    }
