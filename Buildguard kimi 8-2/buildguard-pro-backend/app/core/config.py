"""
BuildGuard Pro - Configuration
"""

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "BuildGuard Pro API"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB
    UPLOAD_DIR: str = "/tmp/buildguard-uploads"
    
    # Claude AI
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Database (for future use)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./buildguard.db")
    
    # Redis (for future use)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # AWS S3 (for production file storage)
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_BUCKET_NAME: str = os.getenv("AWS_BUCKET_NAME", "buildguard-pro")
    
    class Config:
        env_file = ".env"

settings = Settings()
