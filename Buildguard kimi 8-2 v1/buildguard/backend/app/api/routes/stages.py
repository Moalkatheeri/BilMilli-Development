"""
Stages API - Pillar 1: Project & Stage Lifecycle
Handles stage transitions and gating logic.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.project import ConstructionStage, StageStatus
from app.services.stage_manager import StageManager
from app.schemas.stage import (
    StageResponse, StageStartRequest, StageStartResponse,
    StageSubmitRequest, StageSubmitResponse, StageApproveRequest,
    StageApproveResponse, StageRejectRequest, ChecklistUpdateRequest,
    ChecklistUpdateResponse, CanStartResponse
)

router = APIRouter()


@router.get("/project/{project_id}", response_model=List[StageResponse])
async def list_stages(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all stages for a project."""
    result = await db.execute(
        select(ConstructionStage)
        .where(ConstructionStage.project_id == project_id)
        .order_by(ConstructionStage.sequence)
    )
    stages = result.scalars().all()
    return stages


@router.get("/{stage_id}", response_model=StageResponse)
async def get_stage(
    stage_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get stage details."""
    result = await db.execute(
        select(ConstructionStage).where(ConstructionStage.id == stage_id)
    )
    stage = result.scalar_one_or_none()
    
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    return stage


@router.post("/{stage_id}/can-start", response_model=CanStartResponse)
async def can_start_stage(
    stage_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Check if a stage can be started (gating check)."""
    stage_manager = StageManager(db)
    can_start, reasons = await stage_manager.can_start_stage(stage_id)
    
    return CanStartResponse(can_start=can_start, reasons=reasons)


@router.post("/{stage_id}/start", response_model=StageStartResponse)
async def start_stage(
    stage_id: str,
    request: StageStartRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start a stage (enforces gating)."""
    stage_manager = StageManager(db)
    success, message = await stage_manager.start_stage(stage_id, request.user_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return StageStartResponse(success=True, message=message, stage_id=stage_id)


@router.post("/{stage_id}/submit", response_model=StageSubmitResponse)
async def submit_for_approval(
    stage_id: str,
    request: StageSubmitRequest,
    db: AsyncSession = Depends(get_db)
):
    """Submit a stage for approval."""
    stage_manager = StageManager(db)
    success, message = await stage_manager.submit_for_approval(stage_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return StageSubmitResponse(success=True, message=message)


@router.post("/{stage_id}/approve", response_model=StageApproveResponse)
async def approve_stage(
    stage_id: str,
    request: StageApproveRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve a stage."""
    stage_manager = StageManager(db)
    success, message = await stage_manager.approve_stage(stage_id, request.approved_by)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return StageApproveResponse(success=True, message=message, stage_id=stage_id)


@router.post("/{stage_id}/reject")
async def reject_stage(
    stage_id: str,
    request: StageRejectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reject a stage submission."""
    stage_manager = StageManager(db)
    success, message = await stage_manager.reject_stage(stage_id, request.reason)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.patch("/{stage_id}/checklist", response_model=ChecklistUpdateResponse)
async def update_checklist_item(
    stage_id: str,
    request: ChecklistUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update a checklist item's completion status."""
    stage_manager = StageManager(db)
    success, message = await stage_manager.update_checklist_item(
        stage_id, request.item_index, request.completed
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Get updated stage to return completion percentage
    result = await db.execute(
        select(ConstructionStage).where(ConstructionStage.id == stage_id)
    )
    stage = result.scalar_one()
    
    return ChecklistUpdateResponse(
        success=True,
        message=message,
        completion_percentage=stage.completion_percentage
    )


@router.get("/{stage_id}/dependencies")
async def get_stage_dependencies(
    stage_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get stage dependencies."""
    result = await db.execute(
        select(ConstructionStage).where(ConstructionStage.id == stage_id)
    )
    stage = result.scalar_one_or_none()
    
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Get previous stage
    result = await db.execute(
        select(ConstructionStage).where(
            ConstructionStage.project_id == stage.project_id,
            ConstructionStage.sequence == stage.sequence - 1
        )
    )
    prev_stage = result.scalar_one_or_none()
    
    return {
        "stage_id": stage_id,
        "depends_on": stage.depends_on,
        "previous_stage": {
            "id": prev_stage.id,
            "name": prev_stage.name,
            "status": prev_stage.status.value
        } if prev_stage else None
    }
