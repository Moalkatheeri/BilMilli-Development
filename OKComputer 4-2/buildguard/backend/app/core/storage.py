"""
MinIO/S3 storage client for BuildGuard Pro.
Handles file uploads and pre-signed URL generation.
"""

import logging
from io import BytesIO
from typing import Optional

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger("buildguard.storage")


def get_minio_client() -> Minio:
    """Create a MinIO client from settings."""
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def ensure_bucket(client: Minio, bucket: str = None) -> None:
    """Ensure the bucket exists, create if not."""
    bucket = bucket or settings.minio_bucket
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info("Created bucket %s", bucket)
    except S3Error as e:
        logger.error("Failed to ensure bucket %s: %s", bucket, e)
        raise


async def upload_file(
    data: bytes,
    object_name: str,
    content_type: str = "application/octet-stream",
    bucket: str = None,
) -> str:
    """Upload bytes to MinIO. Returns the object key."""
    bucket = bucket or settings.minio_bucket
    client = get_minio_client()
    ensure_bucket(client, bucket)

    client.put_object(
        bucket,
        object_name,
        BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    logger.info("Uploaded %s (%d bytes) to %s/%s", object_name, len(data), bucket, object_name)
    return object_name


def get_presigned_url(
    object_name: str,
    bucket: str = None,
    expires_hours: int = 1,
) -> str:
    """Generate a pre-signed download URL for an object."""
    from datetime import timedelta

    bucket = bucket or settings.minio_bucket
    client = get_minio_client()

    try:
        url = client.presigned_get_object(
            bucket,
            object_name,
            expires=timedelta(hours=expires_hours),
        )
        return url
    except S3Error as e:
        logger.error("Failed to generate presigned URL for %s: %s", object_name, e)
        raise
