"""
BuildGuard Pro - Backend API
Full-stack construction oversight platform
"""

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api.routes import projects, stages, captures, analysis, deviations, payments

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.app_name,
    description="Construction oversight platform with AI-powered quality control",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(stages.router, prefix="/api/stages", tags=["Stages"])
app.include_router(captures.router, prefix="/api/captures", tags=["Captures"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(deviations.router, prefix="/api/deviations", tags=["Deviations"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

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
