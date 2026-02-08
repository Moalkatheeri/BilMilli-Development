"""
Captures API - Pillar 2: Mobile Field Capture
Handles photo uploads with GPS, compass, and AR pose metadata.
"""

import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from minio import Minio

from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_user, check_project_access
from app.models.capture import CaptureSession, PhotoCapture, PhotoMetadata, CaptureStatus
from app.services.capture_service import CaptureService
from app.schemas.capture import (
    CaptureSessionCreate, CaptureSessionResponse,
    PhotoCaptureResponse, PhotoMetadataCreate, PhotoMetadataResponse,
    UploadCompleteRequest, UploadCompleteResponse,
    SyncStatusResponse, PhotoWithMetadataResponse, PaginatedCaptureSessionListResponse
)

# Initialize MinIO client
def get_minio_client():
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure
    )


def get_presigned_url(object_name: str, expires: int = 3600) -> str:
    """Generate a pre-signed URL for accessing an object."""
    client = get_minio_client()
    return client.presigned_get_object(settings.minio_bucket, object_name, expires=timedelta(seconds=expires))

router = APIRouter()


@router.post("/sessions", response_model=CaptureSessionResponse)
async def create_capture_session(
    request: CaptureSessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new capture session for field photos."""
    capture_service = CaptureService(db)
    
    session = await capture_service.create_capture_session(
        project_id=request.project_id,
        stage_id=request.stage_id,
        name=request.name,
        description=request.description,
        captured_by=request.captured_by,
        is_offline=request.is_offline
    )
    
    return session


@router.get("/sessions/{session_id}", response_model=CaptureSessionResponse)
async def get_capture_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get capture session details."""
    result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Capture session not found")
    
    return session


@router.get("/sessions/project/{project_id}", response_model=PaginatedCaptureSessionListResponse)
async def list_capture_sessions(
    project_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all capture sessions for a project with pagination."""
    # Check access
    has_access = await check_project_access(project_id, current_user, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get total count
    count_result = await db.execute(
        select(CaptureSession).where(CaptureSession.project_id == project_id)
    )
    total = len(count_result.scalars().all())
    
    # Get paginated results
    result = await db.execute(
        select(CaptureSession)
        .where(CaptureSession.project_id == project_id)
        .order_by(CaptureSession.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    sessions = result.scalars().all()
    
    return PaginatedCaptureSessionListResponse(
        items=list(sessions),
        total=total
    )


@router.post("/photos", response_model=PhotoCaptureResponse)
async def create_photo_capture(
    session_id: str,
    file_size: int = 0,
    file_type: str = "image/jpeg",
    db: AsyncSession = Depends(get_db)
):
    """Create a new photo capture entry."""
    capture_service = CaptureService(db)
    
    photo = await capture_service.add_photo_to_session(
        session_id=session_id,
        file_size=file_size,
        file_type=file_type
    )
    
    return photo


@router.post("/photos/{photo_id}/metadata", response_model=PhotoMetadataResponse)
async def add_photo_metadata(
    photo_id: str,
    request: PhotoMetadataCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add GPS, compass, and AR pose metadata to a photo."""
    capture_service = CaptureService(db)
    
    metadata = await capture_service.add_photo_metadata(
        photo_id=photo_id,
        gps_data={
            "latitude": request.gps.latitude,
            "longitude": request.gps.longitude,
            "altitude": request.gps.altitude,
            "accuracy": request.gps.accuracy
        } if request.gps else None,
        orientation_data={
            "heading": request.orientation.heading,
            "pitch": request.orientation.pitch,
            "roll": request.orientation.roll
        } if request.orientation else None,
        ar_pose={
            "matrix": request.ar_pose.matrix,
            "confidence": request.ar_pose.confidence
        } if request.ar_pose else None,
        device_info={
            "device_id": request.device.device_id,
            "model": request.device.model,
            "os_version": request.device.os_version,
            "app_version": request.device.app_version
        } if request.device else None,
        capture_timestamp=request.capture_timestamp,
        timezone=request.timezone
    )
    
    # Update anchored element if provided
    if request.anchored_element_id:
        metadata.anchored_element_id = request.anchored_element_id
        metadata.anchor_confidence = request.anchor_confidence
    
    return metadata


@router.post("/photos/{photo_id}/upload")
async def upload_photo_file(
    photo_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a photo file to MinIO storage."""
    capture_service = CaptureService(db)
    
    # Get photo to find project_id
    result = await db.execute(
        select(PhotoCapture).where(PhotoCapture.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Get session to find project_id
    result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == photo.session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Start upload
    await capture_service.start_upload(photo_id)
    
    # Upload to MinIO
    client = get_minio_client()
    
    # Generate unique object name
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    object_name = f"{session.project_id}/{session.id}/{photo_id}.{file_ext}"
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Upload to MinIO
        from io import BytesIO
        client.put_object(
            settings.minio_bucket,
            object_name,
            BytesIO(file_content),
            file_size,
            content_type=file.content_type or 'image/jpeg'
        )
        
        # Complete upload in database
        await capture_service.complete_upload(
            photo_id=photo_id,
            file_path=object_name,
            file_size=file_size
        )
        
        # Generate pre-signed URL for viewing
        photo_url = get_presigned_url(object_name)
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "photo_id": photo_id,
            "file_path": object_name,
            "file_size": file_size,
            "url": photo_url
        }
        
    except Exception as e:
        # Mark upload as failed
        await capture_service.fail_upload(photo_id, str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/sessions/{session_id}/photos", response_model=List[PhotoWithMetadataResponse])
async def get_session_photos(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all photos in a session with metadata."""
    capture_service = CaptureService(db)
    photos = await capture_service.get_session_photos(session_id)
    return photos


@router.post("/sessions/{session_id}/sync-start")
async def start_sync(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Start sync for an offline capture session."""
    capture_service = CaptureService(db)
    success = await capture_service.start_sync(session_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Capture session not found")
    
    return {"success": True, "message": "Sync started"}


@router.post("/sessions/{session_id}/sync-complete")
async def complete_sync(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Complete sync for a capture session."""
    capture_service = CaptureService(db)
    success = await capture_service.complete_sync(session_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Capture session not found")
    
    return {"success": True, "message": "Sync completed"}


@router.get("/sessions/{session_id}/sync-status", response_model=SyncStatusResponse)
async def get_sync_status(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get sync status for a capture session."""
    result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Capture session not found")
    
    result = await db.execute(
        select(PhotoCapture).where(PhotoCapture.session_id == session_id)
    )
    photos = result.scalars().all()
    
    total = len(photos)
    uploaded = sum(1 for p in photos if p.status == CaptureStatus.UPLOADED)
    pending = sum(1 for p in photos if p.status == CaptureStatus.PENDING)
    failed = sum(1 for p in photos if p.status == CaptureStatus.FAILED)
    
    return SyncStatusResponse(
        session_id=session_id,
        status=session.status.value,
        total_photos=total,
        uploaded_photos=uploaded,
        pending_photos=pending,
        failed_photos=failed,
        is_complete=uploaded == total and total > 0
    )


@router.get("/pending-uploads")
async def get_pending_uploads(
    session_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get photos pending upload (for offline queue processing)."""
    capture_service = CaptureService(db)
    photos = await capture_service.get_pending_uploads(session_id)
    
    return {
        "pending_photos": [
            {
                "id": p.id,
                "session_id": p.session_id,
                "status": p.status.value,
                "created_at": p.created_at.isoformat()
            }
            for p in photos
        ],
        "total": len(photos)
    }


@router.post("/photos/upload-direct")
async def upload_photo_direct(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    stage_id: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    altitude: Optional[float] = Form(None),
    accuracy: Optional[float] = Form(None),
    heading: Optional[float] = Form(None),
    captured_by: str = Form(""),
    db: AsyncSession = Depends(get_db)
):
    """Upload a photo directly with metadata (simplified single-step upload)."""
    capture_service = CaptureService(db)
    client = get_minio_client()
    
    # Create a capture session
    session = await capture_service.create_capture_session(
        project_id=project_id,
        stage_id=stage_id or "",
        name=f"Direct upload {datetime.utcnow().isoformat()}",
        captured_by=captured_by,
        is_offline=False
    )
    
    # Create photo entry
    file_content = await file.read()
    photo = await capture_service.add_photo_to_session(
        session_id=session.id,
        file_size=len(file_content),
        file_type=file.content_type or "image/jpeg"
    )
    
    # Add metadata if provided
    if any([latitude, longitude, heading]):
        await capture_service.add_photo_metadata(
            photo_id=photo.id,
            gps_data={"latitude": latitude, "longitude": longitude, "altitude": altitude, "accuracy": accuracy} if latitude else None,
            orientation_data={"heading": heading} if heading else None,
        )
    
    # Upload to MinIO
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    object_name = f"{project_id}/{session.id}/{photo.id}.{file_ext}"
    
    try:
        from io import BytesIO
        client.put_object(
            settings.minio_bucket,
            object_name,
            BytesIO(file_content),
            len(file_content),
            content_type=file.content_type or 'image/jpeg'
        )
        
        # Complete upload
        await capture_service.complete_upload(
            photo_id=photo.id,
            file_path=object_name,
            file_size=len(file_content)
        )
        
        # Generate pre-signed URL
        photo_url = get_presigned_url(object_name)
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "photo_id": photo.id,
            "session_id": session.id,
            "file_path": object_name,
            "file_size": len(file_content),
            "url": photo_url
        }
        
    except Exception as e:
        await capture_service.fail_upload(photo.id, str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/photos/{photo_id}/url")
async def get_photo_url(
    photo_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a pre-signed URL for viewing a photo."""
    result = await db.execute(
        select(PhotoCapture).where(PhotoCapture.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    
    if not photo or not photo.file_path:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    url = get_presigned_url(photo.file_path)
    
    return {
        "photo_id": photo_id,
        "url": url,
        "expires_in": 3600
    }


@router.post("/photos/{photo_id}/analyze")
async def analyze_photo(
    photo_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Analyze a photo using the AI pro-backend."""
    from app.core.pro_backend_client import get_pro_backend_client
    
    result = await db.execute(
        select(PhotoCapture).where(PhotoCapture.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    
    if not photo or not photo.file_path:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Get pre-signed URL for the photo
    photo_url = get_presigned_url(photo.file_path, expires=300)  # 5 min expiry for analysis
    
    # Get session for project_id
    result = await db.execute(
        select(CaptureSession).where(CaptureSession.id == photo.session_id)
    )
    session = result.scalar_one_or_none()
    
    # Call pro-backend for analysis
    pro_client = get_pro_backend_client()
    analysis_result = await pro_client.analyze_photo(
        photo_url=photo_url,
        project_id=session.project_id if session else None,
        stage_id=session.stage_id if session else None
    )
    
    # Store analysis result in photo metadata
    capture_service = CaptureService(db)
    await capture_service.add_photo_metadata(
        photo_id=photo_id,
        ai_analysis=analysis_result
    )
    
    return {
        "photo_id": photo_id,
        "analysis": analysis_result
    }
