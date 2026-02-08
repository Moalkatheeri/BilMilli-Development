"""
Projects API - Pillar 1: Project & Stage Lifecycle
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import json

from app.core.database import get_db
from app.models.project import Project, ConstructionStage
from app.services.stage_manager import StageManager
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, 
    ProjectListResponse, ModelUploadResponse
)

router = APIRouter()


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new project with auto-generated construction stages."""
    # Create project
    project = Project(
        name=project_data.name,
        address=project_data.address,
        location=project_data.location,
        contract_value=project_data.contract_value,
        start_date=project_data.start_date,
        expected_completion=project_data.expected_completion,
    )
    
    db.add(project)
    await db.flush()
    
    # Auto-generate construction stages
    stage_manager = StageManager(db)
    await stage_manager.create_stages_for_project(project)
    
    return project


@router.get("/", response_model=List[ProjectListResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all projects."""
    result = await db.execute(
        select(Project)
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    projects = result.scalars().all()
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get project details with stages."""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update project details."""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.refresh(project)
    
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a project and all associated data."""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    
    return {"success": True, "message": "Project deleted"}


@router.post("/{project_id}/upload-model", response_model=ModelUploadResponse)
async def upload_model(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a 3D model (IFC/OBJ) for the project."""
    from app.core.pro_backend_client import get_pro_backend_client
    from app.core.config import settings
    from minio import Minio
    import uuid
    
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Upload to MinIO
    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure
    )
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'ifc'
    object_name = f"{project_id}/models/{uuid.uuid4()}.{file_ext}"
    
    try:
        from io import BytesIO
        file_content = await file.read()
        
        client.put_object(
            settings.minio_bucket,
            object_name,
            BytesIO(file_content),
            len(file_content),
            content_type=file.content_type or 'application/octet-stream'
        )
        
        # Call pro-backend to process the model
        pro_client = get_pro_backend_client()
        model_url = client.presigned_get_object(settings.minio_bucket, object_name)
        
        # Start async processing
        processing_result = await pro_client.process_model(model_url, project_id)
        
        # Store model info
        model_metadata = {
            "filename": file.filename,
            "file_size": len(file_content),
            "format": file_ext,
            "object_name": object_name,
            "processing_id": processing_result.get("id"),
            "status": "processing"
        }
        
        project.model_url = object_name
        project.model_metadata = model_metadata
        
        return ModelUploadResponse(
            success=True,
            message="Model uploaded and processing started",
            model_id=processing_result.get("id"),
            filename=file.filename,
            format=file_ext,
            file_size=len(file_content),
            rooms_extracted=processing_result.get("rooms_count", 0),
            elements_extracted=processing_result.get("elements_count", 0),
            status="processing"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model upload failed: {str(e)}")


@router.get("/{project_id}/model-status")
async def get_model_status(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get the processing status of the project's 3D model."""
    from app.core.pro_backend_client import get_pro_backend_client
    
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.model_metadata or not project.model_metadata.get("processing_id"):
        return {"status": "no_model", "message": "No model uploaded for this project"}
    
    # Check with pro-backend
    pro_client = get_pro_backend_client()
    status = await pro_client.get_model_status(project.model_metadata["processing_id"])
    
    return status
        success=True,
        message="Model uploaded and parsed successfully",
        model_url=project.model_url,
        parsed_metadata=model_metadata
    )


@router.get("/{project_id}/progress")
async def get_project_progress(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed project progress."""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Calculate progress from stages
    stages = project.stages
    total_stages = len(stages)
    completed_stages = sum(1 for s in stages if s.status.value == "approved")
    in_progress_stages = sum(1 for s in stages if s.status.value == "in_progress")
    
    # Overall completion percentage
    if total_stages > 0:
        overall_progress = sum(s.completion_percentage for s in stages) / total_stages
    else:
        overall_progress = 0
    
    return {
        "project_id": project_id,
        "overall_progress": round(overall_progress, 2),
        "total_stages": total_stages,
        "completed_stages": completed_stages,
        "in_progress_stages": in_progress_stages,
        "pending_stages": total_stages - completed_stages - in_progress_stages,
        "stages_by_phase": {}
    }
