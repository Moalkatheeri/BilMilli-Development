"""
Contractors API - Contractor performance scorecard
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.project import ConstructionStage, StageStatus
from app.models.deviation import DeviationEvent, DeviationStatus, DeviationSeverity
from app.models.payment import PaymentGate, PaymentStatus, DlpTicket

router = APIRouter()


@router.get("/{contractor_id}/scorecard")
async def get_contractor_scorecard(
    contractor_id: str,
    project_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get contractor performance scorecard."""
    # Get all stages for projects the user can access
    project_ids = current_user.project_ids or []
    if project_id:
        project_ids = [project_id]

    if not project_ids:
        return {"contractor_id": contractor_id, "projects_analyzed": 0, "metrics": {}}

    # Stages stats
    result = await db.execute(
        select(ConstructionStage).where(ConstructionStage.project_id.in_(project_ids))
    )
    stages = result.scalars().all()

    total_stages = len(stages)
    completed_stages = [s for s in stages if s.status == StageStatus.APPROVED]
    on_time_stages = [s for s in completed_stages if s.actual_end and s.planned_end and s.actual_end <= s.planned_end]

    # Deviations stats
    result = await db.execute(
        select(DeviationEvent).where(DeviationEvent.project_id.in_(project_ids))
    )
    deviations = result.scalars().all()

    total_deviations = len(deviations)
    rectified = [d for d in deviations if d.status in (DeviationStatus.RECTIFIED, DeviationStatus.CLOSED)]
    avg_rectification_days = 0.0
    if rectified:
        days_list = []
        for d in rectified:
            if d.rectified_at and d.detected_at:
                delta = (d.rectified_at - d.detected_at).days
                days_list.append(delta)
        if days_list:
            avg_rectification_days = sum(days_list) / len(days_list)

    # Payment stats
    result = await db.execute(
        select(PaymentGate).where(PaymentGate.project_id.in_(project_ids))
    )
    payments = result.scalars().all()
    released_payments = [p for p in payments if p.status == PaymentStatus.RELEASED]

    on_time_rate = (len(on_time_stages) / len(completed_stages) * 100) if completed_stages else 0
    deviation_rate = (total_deviations / total_stages * 100) if total_stages else 0
    payment_release_rate = (len(released_payments) / len(payments) * 100) if payments else 0

    return {
        "contractor_id": contractor_id,
        "projects_analyzed": len(project_ids),
        "metrics": {
            "on_time_completion_rate": round(on_time_rate, 1),
            "deviation_rate": round(deviation_rate, 1),
            "average_rectification_days": round(avg_rectification_days, 1),
            "payment_release_rate": round(payment_release_rate, 1),
            "total_stages_completed": len(completed_stages),
            "total_stages": total_stages,
            "total_deviations": total_deviations,
            "deviations_rectified": len(rectified),
            "total_payments": len(payments),
            "payments_released": len(released_payments),
        },
    }


@router.get("/{contractor_id}/performance")
async def get_contractor_performance(
    contractor_id: str,
    project_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed contractor performance breakdown."""
    project_ids = current_user.project_ids or []
    if project_id:
        project_ids = [project_id]

    if not project_ids:
        return {"contractor_id": contractor_id, "performance": []}

    # Per-project performance
    performance = []
    for pid in project_ids:
        result = await db.execute(
            select(ConstructionStage).where(ConstructionStage.project_id == pid)
        )
        stages = result.scalars().all()

        result = await db.execute(
            select(DeviationEvent).where(DeviationEvent.project_id == pid)
        )
        deviations = result.scalars().all()

        completed = [s for s in stages if s.status == StageStatus.APPROVED]
        critical_devs = [d for d in deviations if d.severity in (DeviationSeverity.CRITICAL, DeviationSeverity.MAJOR)]

        performance.append({
            "project_id": pid,
            "stages_total": len(stages),
            "stages_completed": len(completed),
            "progress": round(sum(s.completion_percentage for s in stages) / max(len(stages), 1), 1),
            "deviations_total": len(deviations),
            "deviations_critical": len(critical_devs),
        })

    return {"contractor_id": contractor_id, "performance": performance}
