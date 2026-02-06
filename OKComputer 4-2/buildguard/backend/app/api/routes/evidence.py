"""
Evidence Package API - Generate project evidence packages
"""

import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.project import Project, ConstructionStage
from app.models.deviation import DeviationEvent
from app.models.payment import PaymentGate, DlpTicket
from app.models.analysis import ThermalAnalysis
from app.models.capture import CaptureSession, PhotoCapture

router = APIRouter()


@router.post("/project/{project_id}/generate")
async def generate_evidence_package(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a JSON evidence package for the project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Gather all project data
    stages_result = await db.execute(
        select(ConstructionStage)
        .where(ConstructionStage.project_id == project_id)
        .order_by(ConstructionStage.sequence)
    )
    stages = stages_result.scalars().all()

    deviations_result = await db.execute(
        select(DeviationEvent).where(DeviationEvent.project_id == project_id)
    )
    deviations = deviations_result.scalars().all()

    payments_result = await db.execute(
        select(PaymentGate).where(PaymentGate.project_id == project_id)
    )
    payments = payments_result.scalars().all()

    analyses_result = await db.execute(
        select(ThermalAnalysis).where(ThermalAnalysis.project_id == project_id)
    )
    analyses = analyses_result.scalars().all()

    sessions_result = await db.execute(
        select(CaptureSession).where(CaptureSession.project_id == project_id)
    )
    sessions = sessions_result.scalars().all()

    package = {
        "id": f"evidence-{project_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "project_id": project_id,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.full_name,
        "project": {
            "name": project.name,
            "address": project.address,
            "location": project.location,
            "contract_value": project.contract_value,
            "status": project.status,
            "progress": project.progress,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "expected_completion": project.expected_completion.isoformat() if project.expected_completion else None,
        },
        "stages": [
            {
                "name": s.name,
                "sequence": s.sequence,
                "status": s.status.value,
                "completion_percentage": s.completion_percentage,
                "checklist_items": s.checklist_items,
                "payment_percentage": s.payment_percentage,
                "payment_amount": s.payment_amount,
            }
            for s in stages
        ],
        "deviations": [
            {
                "id": d.id,
                "element_type": d.element_type,
                "element_name": d.element_name,
                "severity": d.severity.value,
                "status": d.status.value,
                "deviation_mm": d.position_deviation_mm or d.dimension_deviation_mm,
                "tolerance_mm": d.tolerance_mm,
                "detected_at": d.detected_at.isoformat() if d.detected_at else None,
                "review_notes": d.review_notes,
            }
            for d in deviations
        ],
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status.value,
                "block_reasons": p.block_reasons,
                "requested_at": p.requested_at.isoformat() if p.requested_at else None,
                "approved_at": p.approved_at.isoformat() if p.approved_at else None,
                "released_at": p.released_at.isoformat() if p.released_at else None,
            }
            for p in payments
        ],
        "thermal_analyses": [
            {
                "id": a.id,
                "location": a.location,
                "status": a.status.value,
                "total_cooling_load_kw": a.total_cooling_load_kw,
                "recommended_ac_tons": a.recommended_ac_tons,
                "estimated_annual_cost_aed": a.estimated_annual_cost_aed,
            }
            for a in analyses
        ],
        "photo_sessions": [
            {
                "id": s.id,
                "name": s.name,
                "status": s.status.value,
                "captured_by": s.captured_by,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ],
    }

    return package


@router.get("/{package_id}/download")
async def download_evidence_package(
    package_id: str,
    current_user: User = Depends(get_current_user),
):
    """Download an evidence package. Returns a placeholder since packages are generated on-the-fly."""
    return {
        "message": "Evidence packages are generated on-the-fly via POST /evidence/project/{id}/generate",
        "package_id": package_id,
    }
