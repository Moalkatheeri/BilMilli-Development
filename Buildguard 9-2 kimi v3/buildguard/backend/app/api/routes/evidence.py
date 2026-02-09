"""Evidence package routes for project documentation export."""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
import io

from app.core.database import get_db
from app.core.auth import get_current_user, check_project_access
from app.models.project import Project, ConstructionStage
from app.models.deviation import DeviationEvent
from app.models.payment import PaymentGate, DlpTicket
from app.models.capture import PhotoCapture, CaptureSession
from app.models.analysis import ThermalAnalysis
from app.models.evidence import EvidencePackage

router = APIRouter()


@router.post("/project/{project_id}/generate")
async def generate_evidence_package(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate an evidence package for a project."""
    # Check access
    has_access = await check_project_access(project_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get project
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all related data
    stages_result = await db.execute(
        select(ConstructionStage).where(ConstructionStage.project_id == project_id)
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
    
    tickets_result = await db.execute(
        select(DlpTicket).where(DlpTicket.project_id == project_id)
    )
    tickets = tickets_result.scalars().all()
    
    sessions_result = await db.execute(
        select(CaptureSession).where(CaptureSession.project_id == project_id)
    )
    sessions = sessions_result.scalars().all()
    
    photos_result = await db.execute(
        select(PhotoCapture).where(PhotoCapture.project_id == project_id)
    )
    photos = photos_result.scalars().all()
    
    analysis_result = await db.execute(
        select(ThermalAnalysis).where(ThermalAnalysis.project_id == project_id)
    )
    analyses = analysis_result.scalars().all()
    
    # Build package data
    package_data = {
        "project": {
            "id": project.id,
            "name": project.name,
            "location": project.location,
            "status": project.status.value if hasattr(project.status, 'value') else str(project.status),
            "progress": project.progress,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "expected_completion": project.expected_completion.isoformat() if project.expected_completion else None,
        },
        "stages": [
            {
                "id": s.id,
                "name": s.name,
                "sequence": s.sequence,
                "status": s.status.value if hasattr(s.status, 'value') else str(s.status),
                "completion_percentage": s.completion_percentage,
                "checklist": s.checklist_items,
                "actual_start": s.actual_start.isoformat() if s.actual_start else None,
                "actual_end": s.actual_end.isoformat() if s.actual_end else None,
            }
            for s in stages
        ],
        "deviations": [
            {
                "id": d.id,
                "element_type": d.element_type,
                "element_name": d.element_name,
                "deviation_type": d.deviation_type,
                "severity": d.severity.value if hasattr(d.severity, 'value') else str(d.severity),
                "status": d.status.value if hasattr(d.status, 'value') else str(d.status),
                "detected_at": d.detected_at.isoformat() if d.detected_at else None,
                "description": d.description,
                "deviation_mm": d.position_deviation_mm or d.dimension_deviation_mm,
                "tolerance_mm": d.tolerance_mm,
            }
            for d in deviations
        ],
        "payments": [
            {
                "id": p.id,
                "stage_id": p.stage_id,
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
                "description": p.description,
                "approved_by": p.approved_by,
                "approved_at": p.approved_at.isoformat() if p.approved_at else None,
                "released_at": p.released_at.isoformat() if p.released_at else None,
            }
            for p in payments
        ],
        "dlp_tickets": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "priority": t.priority.value if hasattr(t.priority, 'value') else str(t.priority),
                "status": t.status.value if hasattr(t.status, 'value') else str(t.status),
                "room_name": t.room_name,
                "element_type": t.element_type,
                "reported_at": t.reported_at.isoformat() if t.reported_at else None,
            }
            for t in tickets
        ],
        "photos": [
            {
                "id": ph.id,
                "session_id": ph.session_id,
                "file_key": ph.file_key,
                "status": ph.status.value if hasattr(ph.status, 'value') else str(ph.status),
                "uploaded_at": ph.uploaded_at.isoformat() if ph.uploaded_at else None,
            }
            for ph in photos
        ],
        "thermal_analyses": [
            {
                "id": a.id,
                "location": a.location,
                "status": a.status.value if hasattr(a.status, 'value') else str(a.status),
                "total_cooling_load": a.total_cooling_load_kw,
                "total_heating_load": a.total_heating_load_kw,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in analyses
        ],
    }
    
    # Build summary
    summary = {
        "total_stages": len(stages),
        "completed_stages": len([s for s in stages if s.status.value == "approved"]),
        "total_deviations": len(deviations),
        "open_deviations": len([d for d in deviations if d.status.value in ["detected", "under_review"]]),
        "total_payments": len(payments),
        "released_payments": len([p for p in payments if p.status.value == "released"]),
        "total_photos": len(photos),
        "open_dlp_tickets": len([t for t in tickets if t.status.value in ["open", "assigned", "in_progress"]]),
    }
    
    # Create and store the evidence package in database
    package = EvidencePackage(
        project_id=project_id,
        generated_by=current_user.id,
        generated_at=datetime.utcnow(),
        format="json",
        data=package_data,
        summary=summary,
        total_stages=summary["total_stages"],
        completed_stages=summary["completed_stages"],
        total_deviations=summary["total_deviations"],
        open_deviations=summary["open_deviations"],
        total_photos=summary["total_photos"],
    )
    
    db.add(package)
    await db.flush()
    
    return {
        "package_id": str(package.id),
        "project_id": project_id,
        "generated_at": package.generated_at.isoformat(),
        "summary": summary
    }


@router.get("/{package_id}/download")
async def download_evidence_package(
    package_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> StreamingResponse:
    """Download an evidence package as a JSON file."""
    # Get package from database
    result = await db.execute(
        select(EvidencePackage).where(EvidencePackage.id == package_id)
    )
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Check access
    has_access = await check_project_access(str(package.project_id), current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build full package JSON
    full_package = {
        "package_id": str(package.id),
        "project_id": str(package.project_id),
        "generated_at": package.generated_at.isoformat() if package.generated_at else None,
        "generated_by": str(package.generated_by) if package.generated_by else None,
        "format": package.format,
        "data": package.data or {},
        "summary": package.summary or {},
    }
    
    # Create JSON file
    json_content = json.dumps(full_package, indent=2, default=str)
    filename = f"evidence_package_{package.project_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    
    return StreamingResponse(
        io.BytesIO(json_content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/project/{project_id}/share-teyaseer")
async def share_with_teyaseer(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """Share project data with Teyaseer (Abu Dhabi government platform)."""
    # Check access
    has_access = await check_project_access(project_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # First generate the package
    package_result = await generate_evidence_package(project_id, db, current_user)
    package_id = package_result["package_id"]
    
    # Get the package
    result = await db.execute(
        select(EvidencePackage).where(EvidencePackage.id == package_id)
    )
    package = result.scalar_one_or_none()
    
    # In a real implementation, this would:
    # 1. Authenticate with Teyaseer API
    # 2. Upload the package
    # 3. Return the Teyaseer reference ID
    
    # For now, simulate the share
    teyaseer_reference = f"TEY-{uuid.uuid4().hex[:8].upper()}"
    
    # Update package with Teyaseer reference
    package.teyaseer_reference = teyaseer_reference
    package.shared_at = datetime.utcnow()
    await db.flush()
    
    return {
        "success": True,
        "message": "Project data shared with Teyaseer successfully",
        "teyaseer_reference": teyaseer_reference,
        "package_id": package_id,
        "shared_at": package.shared_at.isoformat(),
        "note": "This is a simulated share. In production, this would connect to the actual Teyaseer API."
    }


@router.get("/project/{project_id}/packages")
async def list_evidence_packages(
    project_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """List all evidence packages for a project."""
    # Check access
    has_access = await check_project_access(project_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get total count
    count_result = await db.execute(
        select(EvidencePackage).where(EvidencePackage.project_id == project_id)
    )
    total = len(count_result.scalars().all())
    
    # Get paginated results
    result = await db.execute(
        select(EvidencePackage)
        .where(EvidencePackage.project_id == project_id)
        .order_by(EvidencePackage.generated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    packages = result.scalars().all()
    
    return {
        "items": [p.to_dict() for p in packages],
        "total": total,
        "skip": skip,
        "limit": limit
    }
