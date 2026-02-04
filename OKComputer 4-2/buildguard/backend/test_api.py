"""
Simple test script to verify API structure
"""

import asyncio
import sys
sys.path.insert(0, '/mnt/okcomputer/output/buildguard/backend')

async def test_imports():
    """Test that all imports work correctly"""
    try:
        # Test core imports
        from app.core.config import settings
        from app.core.database import engine, Base, get_db
        print("✓ Core imports successful")
        
        # Test model imports
        from app.models.project import Project, ConstructionStage, StageStatus
        from app.models.capture import CaptureSession, PhotoCapture, PhotoMetadata, CaptureStatus
        from app.models.analysis import ThermalAnalysis, ThermalZone, AnalysisStatus
        from app.models.deviation import DeviationEvent, DeviationStatus, DeviationSeverity
        from app.models.payment import PaymentGate, DlpTicket, PaymentStatus, TicketStatus, TicketPriority
        print("✓ Model imports successful")
        
        # Test service imports
        from app.services.stage_manager import StageManager, DEFAULT_STAGE_TEMPLATES
        from app.services.capture_service import CaptureService
        from app.services.thermal_analysis import ThermalAnalysisEngine, CLIMATE_DATA
        from app.services.deviation_detector import DeviationDetector, DEFAULT_TOLERANCES
        from app.services.payment_service import PaymentService
        print("✓ Service imports successful")
        
        # Test schema imports
        from app.schemas.project import ProjectCreate, ProjectResponse
        from app.schemas.stage import StageResponse, StageStartRequest
        from app.schemas.capture import CaptureSessionCreate, PhotoCaptureResponse
        from app.schemas.analysis import ThermalAnalysisCreate, ThermalAnalysisResponse
        from app.schemas.deviation import DeviationCreate, DeviationResponse
        from app.schemas.payment import PaymentGateCreate, PaymentGateResponse
        print("✓ Schema imports successful")
        
        # Test route imports
        from app.api.routes import projects, stages, captures, analysis, deviations, payments
        print("✓ Route imports successful")
        
        # Test main app
        from app.main import app
        print("✓ Main app import successful")
        
        print("\n=== All imports successful! ===")
        return True
        
    except Exception as e:
        print(f"✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_imports())
    sys.exit(0 if result else 1)
