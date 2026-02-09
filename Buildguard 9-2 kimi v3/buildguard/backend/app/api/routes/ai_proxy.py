"""AI Proxy routes - Mobile app access to pro-backend AI features."""
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.core.auth import get_current_user, check_project_access
from app.core.pro_backend_client import get_pro_backend_client

router = APIRouter()


@router.post("/photos/analyze")
async def analyze_photo(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    stage_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Proxy photo analysis request to pro-backend AI service."""
    # Check access if project_id provided
    if project_id:
        has_access = await check_project_access(project_id, current_user, db)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        pro_client = get_pro_backend_client()
        
        # Read file content
        file_content = await file.read()
        
        # Call pro-backend for analysis
        response = await pro_client.client.post(
            f"{pro_client.base_url}/photos/analyze",
            data={
                "project_id": project_id or "",
                "stage_id": stage_id or ""
            },
            files={"file": (file.filename, file_content, file.content_type or "image/jpeg")},
            timeout=60.0
        )
        response.raise_for_status()
        
        return response.json()
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/floorplan/analyze")
async def analyze_floorplan(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Analyze a floor plan (DWG/PDF) and extract elements."""
    # Check access if project_id provided
    if project_id:
        has_access = await check_project_access(project_id, current_user, db)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        pro_client = get_pro_backend_client()
        
        # Read file content
        file_content = await file.read()
        
        # Call pro-backend for floorplan analysis
        response = await pro_client.client.post(
            f"{pro_client.base_url}/floorplan/analyze",
            data={"project_id": project_id or ""},
            files={"file": (file.filename, file_content, file.content_type or "application/octet-stream")},
            timeout=120.0
        )
        response.raise_for_status()
        
        return response.json()
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Floorplan analysis failed: {str(e)}")


@router.post("/floorplan/convert-to-3d")
async def convert_floorplan_to_3d(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Convert a floor plan to 3D model."""
    # Check access if project_id provided
    if project_id:
        has_access = await check_project_access(project_id, current_user, db)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        pro_client = get_pro_backend_client()
        
        # Read file content
        file_content = await file.read()
        
        # Call pro-backend for 3D conversion
        response = await pro_client.client.post(
            f"{pro_client.base_url}/floorplan/convert-to-3d",
            data={"project_id": project_id or ""},
            files={"file": (file.filename, file_content, file.content_type or "application/octet-stream")},
            timeout=300.0  # 5 minutes for 3D conversion
        )
        response.raise_for_status()
        
        return response.json()
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"3D conversion failed: {str(e)}")


@router.get("/models/{model_id}/status")
async def get_model_status(
    model_id: str,
    current_user = Depends(get_current_user)
):
    """Get the processing status of a 3D model conversion."""
    try:
        pro_client = get_pro_backend_client()
        status = await pro_client.get_model_status(model_id)
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")


@router.post("/models/generate-from-text")
async def generate_model_from_text(
    request: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    """Generate a 3D model from text description."""
    try:
        pro_client = get_pro_backend_client()
        result = await pro_client.generate_model_from_text(request.get("description", ""))
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model generation failed: {str(e)}")


@router.get("/health")
async def ai_health_check():
    """Check if the AI pro-backend is healthy."""
    try:
        pro_client = get_pro_backend_client()
        health = await pro_client.health_check()
        return health
        
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
