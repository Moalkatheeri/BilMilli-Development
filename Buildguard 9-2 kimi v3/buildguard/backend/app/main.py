"""
BuildGuard Pro - Backend API
Full-stack construction oversight platform
"""

import logging
import sys
import time
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import List, Optional

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.routes import projects, stages, captures, analysis, deviations, payments, auth, contractors, evidence, ai_proxy

# Setup logging
def setup_logging(debug: bool = False):
    level = logging.DEBUG if debug else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
    ))
    logging.basicConfig(level=level, handlers=[handler])
    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING if not debug else logging.INFO)

setup_logging(settings.debug)
logger = logging.getLogger("buildguard.api")

# Forbidden secret keys
FORBIDDEN_KEYS = {"", "your-secret-key-change-in-production", "changeme", "secret", "password", "admin", "123456"}

def _validate_secret_key():
    """Validate that SECRET_KEY is set and not a placeholder."""
    if settings.secret_key in FORBIDDEN_KEYS or len(settings.secret_key) < 32:
        raise RuntimeError(
            "SECRET_KEY is not set or uses a placeholder. "
            "Set a strong SECRET_KEY environment variable (at least 32 characters) before starting."
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    _validate_secret_key()
    logger.info("Starting %s", settings.app_name)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")
    yield
    # Shutdown
    logger.info("Shutting down %s", settings.app_name)
    await engine.dispose()

app = FastAPI(
    title=settings.app_name,
    description="Construction oversight platform with AI-powered quality control",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - Use configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info("method=%s path=%s status=%d duration=%.3fs",
                request.method, request.url.path, response.status_code, duration)
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
app.include_router(ai_proxy.router, prefix="/api/ai", tags=["AI Proxy"])

# Exception handlers
from app.core.exceptions import BuildGuardError, ProjectNotFoundError, StageNotReadyError, PaymentBlockedError

@app.exception_handler(ProjectNotFoundError)
async def project_not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"error": exc.code, "message": exc.message})

@app.exception_handler(StageNotReadyError)
async def stage_not_ready_handler(request, exc):
    return JSONResponse(status_code=409, content={"error": exc.code, "message": exc.message})

@app.exception_handler(PaymentBlockedError)
async def payment_blocked_handler(request, exc):
    return JSONResponse(status_code=409, content={"error": exc.code, "message": exc.message, "reasons": exc.reasons})

@app.exception_handler(BuildGuardError)
async def generic_domain_error_handler(request, exc):
    return JSONResponse(status_code=400, content={"error": exc.code, "message": exc.message})

@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
