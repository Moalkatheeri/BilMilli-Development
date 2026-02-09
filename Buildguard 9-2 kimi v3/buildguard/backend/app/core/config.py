from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://buildguard:buildguard@localhost:5432/buildguard"
    
    # MinIO / S3
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "buildguard"
    minio_secure: bool = False
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # JWT - NO DEFAULT - MUST be set via environment variable
    secret_key: str  # No default - MUST be set via environment variable
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # App
    app_name: str = "BuildGuard Pro"
    debug: bool = False
    
    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"

settings = Settings()
