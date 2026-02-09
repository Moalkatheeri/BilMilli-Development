"""
Capture Service - Pillar 2: Mobile Field Capture

Handles photo uploads with metadata (GPS, compass, AR pose).
Manages offline queue and sync.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.capture import CaptureSession, PhotoCapture, PhotoMetadata, CaptureStatus


class CaptureService:
    """Manages photo capture sessions and uploads"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_capture_session(
        self,
        project_id: str,
        stage_id: str,
        name: str,
        description: str = "",
        captured_by: str = "",
        is_offline: bool = False
    ) -> CaptureSession:
        """Create a new capture session"""
        session = CaptureSession(
            project_id=project_id,
            stage_id=stage_id,
            name=name,
            description=description,
            captured_by=captured_by,
            status=CaptureStatus.PENDING,
            is_offline=is_offline,
        )
        
        self.db.add(session)
        await self.db.flush()
        
        return session
    
    async def add_photo_to_session(
        self,
        session_id: str,
        file_size: int = 0,
        file_type: str = "image/jpeg"
    ) -> PhotoCapture:
        """Add a new photo to a capture session"""
        photo = PhotoCapture(
            session_id=session_id,
            file_size=file_size,
            file_type=file_type,
            status=CaptureStatus.PENDING,
        )
        
        self.db.add(photo)
        await self.db.flush()
        
        return photo
    
    async def add_photo_metadata(
        self,
        photo_id: str,
        gps_data: Optional[Dict[str, float]] = None,
        orientation_data: Optional[Dict[str, float]] = None,
        ar_pose: Optional[Dict[str, Any]] = None,
        device_info: Optional[Dict[str, str]] = None,
        capture_timestamp: Optional[datetime] = None,
        timezone: str = "UTC"
    ) -> PhotoMetadata:
        """Add metadata to a photo capture"""
        metadata = PhotoMetadata(
            photo_id=photo_id,
            # GPS
            latitude=gps_data.get("latitude") if gps_data else None,
            longitude=gps_data.get("longitude") if gps_data else None,
            altitude=gps_data.get("altitude") if gps_data else None,
            gps_accuracy=gps_data.get("accuracy") if gps_data else None,
            # Orientation
            compass_heading=orientation_data.get("heading") if orientation_data else None,
            pitch=orientation_data.get("pitch") if orientation_data else None,
            roll=orientation_data.get("roll") if orientation_data else None,
            # AR Pose
            ar_pose_matrix=ar_pose.get("matrix") if ar_pose else None,
            ar_confidence=ar_pose.get("confidence") if ar_pose else None,
            # Device
            device_id=device_info.get("device_id") if device_info else None,
            device_model=device_info.get("model") if device_info else None,
            os_version=device_info.get("os_version") if device_info else None,
            app_version=device_info.get("app_version") if device_info else None,
            # Capture
            capture_timestamp=capture_timestamp or datetime.utcnow(),
            timezone=timezone,
        )
        
        self.db.add(metadata)
        await self.db.flush()
        
        return metadata
    
    async def start_upload(self, photo_id: str) -> bool:
        """Mark photo as uploading"""
        result = await self.db.execute(
            select(PhotoCapture).where(PhotoCapture.id == photo_id)
        )
        photo = result.scalar_one_or_none()
        
        if not photo:
            return False
        
        photo.status = CaptureStatus.UPLOADING
        await self.db.flush()
        return True
    
    async def complete_upload(
        self, 
        photo_id: str, 
        file_path: str,
        file_size: int
    ) -> bool:
        """Mark photo upload as complete"""
        result = await self.db.execute(
            select(PhotoCapture).where(PhotoCapture.id == photo_id)
        )
        photo = result.scalar_one_or_none()
        
        if not photo:
            return False
        
        photo.status = CaptureStatus.UPLOADED
        photo.file_path = file_path
        photo.file_size = file_size
        photo.uploaded_at = datetime.utcnow()
        
        await self.db.flush()
        return True
    
    async def fail_upload(self, photo_id: str, error: str) -> bool:
        """Mark photo upload as failed"""
        result = await self.db.execute(
            select(PhotoCapture).where(PhotoCapture.id == photo_id)
        )
        photo = result.scalar_one_or_none()
        
        if not photo:
            return False
        
        photo.status = CaptureStatus.FAILED
        photo.upload_error = error
        
        await self.db.flush()
        return True
    
    async def start_sync(self, session_id: str) -> bool:
        """Start sync for an offline capture session"""
        result = await self.db.execute(
            select(CaptureSession).where(CaptureSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False
        
        session.sync_started_at = datetime.utcnow()
        
        # Update all pending photos to uploading
        result = await self.db.execute(
            select(PhotoCapture).where(
                PhotoCapture.session_id == session_id,
                PhotoCapture.status == CaptureStatus.PENDING
            )
        )
        photos = result.scalars().all()
        
        for photo in photos:
            photo.status = CaptureStatus.UPLOADING
        
        await self.db.flush()
        return True
    
    async def complete_sync(self, session_id: str) -> bool:
        """Complete sync for a capture session"""
        result = await self.db.execute(
            select(CaptureSession).where(CaptureSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False
        
        session.sync_completed_at = datetime.utcnow()
        session.is_offline = False
        
        # Check if all photos uploaded
        result = await self.db.execute(
            select(PhotoCapture).where(PhotoCapture.session_id == session_id)
        )
        photos = result.scalars().all()
        
        all_uploaded = all(p.status == CaptureStatus.UPLOADED for p in photos)
        
        if all_uploaded:
            session.status = CaptureStatus.COMPLETED
        else:
            session.status = CaptureStatus.FAILED
        
        await self.db.flush()
        return True
    
    async def get_pending_uploads(
        self, 
        session_id: Optional[str] = None
    ) -> List[PhotoCapture]:
        """Get photos pending upload (for offline queue processing)"""
        query = select(PhotoCapture).where(
            PhotoCapture.status.in_([
                CaptureStatus.PENDING,
                CaptureStatus.FAILED
            ])
        )
        
        if session_id:
            query = query.where(PhotoCapture.session_id == session_id)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_session_photos(
        self, 
        session_id: str,
        with_metadata: bool = True
    ) -> List[Dict[str, Any]]:
        """Get all photos in a session with metadata"""
        result = await self.db.execute(
            select(PhotoCapture, PhotoMetadata)
            .outerjoin(PhotoMetadata, PhotoCapture.id == PhotoMetadata.photo_id)
            .where(PhotoCapture.session_id == session_id)
        )
        rows = result.all()
        
        photos = []
        for photo, metadata in rows:
            photo_data = {
                "id": photo.id,
                "status": photo.status.value,
                "file_path": photo.file_path,
                "file_size": photo.file_size,
                "created_at": photo.created_at.isoformat() if photo.created_at else None,
                "uploaded_at": photo.uploaded_at.isoformat() if photo.uploaded_at else None,
            }
            
            if metadata and with_metadata:
                photo_data["metadata"] = {
                    "gps": {
                        "latitude": metadata.latitude,
                        "longitude": metadata.longitude,
                        "altitude": metadata.altitude,
                        "accuracy": metadata.gps_accuracy,
                    } if metadata.latitude else None,
                    "orientation": {
                        "heading": metadata.compass_heading,
                        "pitch": metadata.pitch,
                        "roll": metadata.roll,
                    } if metadata.compass_heading else None,
                    "ar_pose": {
                        "matrix": metadata.ar_pose_matrix,
                        "confidence": metadata.ar_confidence,
                    } if metadata.ar_pose_matrix else None,
                    "device": {
                        "model": metadata.device_model,
                        "os": metadata.os_version,
                    } if metadata.device_model else None,
                    "anchored_element": metadata.anchored_element_id,
                }
            
            photos.append(photo_data)
        
        return photos
