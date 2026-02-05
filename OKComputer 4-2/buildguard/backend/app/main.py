"""
BuildGuard Pro - Backend API
Full-stack construction oversight platform
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.database import engine, Base

# Configure structured logging before anything else
setup_logging(debug=settings.debug)
from app.core.exceptions import (
    ProjectNotFoundError, StageNotReadyError,
    PaymentBlockedError, UnauthorizedError,
)
from app.api.routes import auth, projects, stages, captures, analysis, deviations, payments, contractors, evidence
# Ensure all models are imported so Base.metadata.create_all creates their tables
import app.models.user  # noqa: F401

logger = logging.getLogger("buildguard")


def _validate_secret_key():
    """Refuse to start if secret_key is a placeholder or empty."""
    forbidden = {"", "your-secret-key-change-in-production", "changeme", "secret"}
    if settings.secret_key in forbidden:
        raise RuntimeError(
            "SECRET_KEY is not set or still uses a placeholder value. "
            "Set a strong SECRET_KEY environment variable before starting."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_secret_key()
    # Startup - create tables (will be replaced by Alembic migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("BuildGuard Pro started")
    yield
    # Shutdown
    await engine.dispose()
    logger.info("BuildGuard Pro stopped")


app = FastAPI(
    title=settings.app_name,
    description="Construction oversight platform with AI-powered quality control",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - read allowed origins from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handlers for domain errors
# ---------------------------------------------------------------------------

@app.exception_handler(ProjectNotFoundError)
async def project_not_found_handler(request: Request, exc: ProjectNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(StageNotReadyError)
async def stage_not_ready_handler(request: Request, exc: StageNotReadyError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(PaymentBlockedError)
async def payment_blocked_handler(request: Request, exc: PaymentBlockedError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    return JSONResponse(status_code=403, content={"detail": str(exc)})


# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("request_start method=%s path=%s", request.method, request.url.path)
    response = await call_next(request)
    logger.info(
        "request_end method=%s path=%s status=%s",
        request.method, request.url.path, response.status_code,
    )
    return response


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(stages.router, prefix="/api/stages", tags=["Stages"])
app.include_router(captures.router, prefix="/api/captures", tags=["Captures"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(deviations.router, prefix="/api/deviations", tags=["Deviations"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(contractors.router, prefix="/api/contractors", tags=["Contractors"])
app.include_router(evidence.router, prefix="/api/evidence", tags=["Evidence"])


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
