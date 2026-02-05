"""
Captures API - Pillar 2: Mobile Field Capture
Handles photo uploads with GPS, compass, and AR pose metadata.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.capture import CaptureSession, PhotoCapture, PhotoMetadata, CaptureStatus
from app.services.capture_service import CaptureService
from app.schemas.capture import (
    CaptureSessionCreate, CaptureSessionResponse,
    PhotoCaptureResponse, PhotoMetadataCreate, PhotoMetadataResponse,
    UploadCompleteRequest, UploadCompleteResponse,
    SyncStatusResponse, PhotoWithMetadataResponse
)

router = APIRouter()


@router.post("/sessions", response_model=CaptureSessionResponse)
async def create_capture_session(
    request: CaptureSessionCreate,
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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


@router.get("/sessions/project/{project_id}", response_model=List[CaptureSessionResponse])
async def list_capture_sessions(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all capture sessions for a project."""
    result = await db.execute(
        select(CaptureSession)
        .where(CaptureSession.project_id == project_id)
        .order_by(CaptureSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return sessions


@router.post("/photos", response_model=PhotoCaptureResponse)
async def create_photo_capture(
    session_id: str,
    file_size: int = 0,
    file_type: str = "image/jpeg",
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a photo file to MinIO."""
    import logging
    from app.core.storage import upload_file, get_presigned_url

    logger = logging.getLogger("buildguard.captures")
    capture_service = CaptureService(db)

    # Start upload
    await capture_service.start_upload(photo_id)

    file_content = await file.read()
    content_type = file.content_type or "image/jpeg"
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    object_name = f"photos/{photo_id}.{ext}"

    try:
        await upload_file(file_content, object_name, content_type=content_type)
    except Exception as exc:
        logger.error("MinIO upload failed for %s: %s", photo_id, exc)
        await capture_service.fail_upload(photo_id, str(exc))
        raise HTTPException(status_code=500, detail="Photo upload failed")

    # Complete upload – store the MinIO object key
    await capture_service.complete_upload(
        photo_id=photo_id,
        file_path=object_name,
        file_size=len(file_content),
    )

    # Return a pre-signed URL for immediate display
    try:
        url = get_presigned_url(object_name)
    except Exception:
        url = None

    return {
        "success": True,
        "message": "Photo uploaded successfully",
        "photo_id": photo_id,
        "file_path": object_name,
        "file_size": len(file_content),
        "url": url,
    }


@router.get("/sessions/{session_id}/photos", response_model=List[PhotoWithMetadataResponse])
async def get_session_photos(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all photos in a session with metadata."""
    capture_service = CaptureService(db)
    photos = await capture_service.get_session_photos(session_id)
    return photos


@router.post("/sessions/{session_id}/sync-start")
async def start_sync(
    session_id: str,
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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


@router.get("/photos/{photo_id}/url")
async def get_photo_url(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a pre-signed URL for a photo stored in MinIO."""
    from app.core.storage import get_presigned_url

    result = await db.execute(
        select(PhotoCapture).where(PhotoCapture.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    if not photo or not photo.file_path:
        raise HTTPException(status_code=404, detail="Photo not found or not yet uploaded")

    try:
        url = get_presigned_url(photo.file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")

    return {"photo_id": photo_id, "url": url}


@router.get("/pending-uploads")
async def get_pending_uploads(
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
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
