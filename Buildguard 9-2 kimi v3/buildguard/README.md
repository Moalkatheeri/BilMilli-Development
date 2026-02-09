# BuildGuard Pro - Construction Oversight Platform

A production-grade construction oversight platform for luxury villa construction in UAE. Prevents costly mistakes BEFORE they happen using AI-powered monitoring across 5 core pillars.

## 5 Core Pillars

### Pillar 1: Project & Stage Lifecycle
- Auto-generates 12 construction stages for UAE villa builds
- State gating: Can't start Stage 2 if Stage 1 not approved
- Checklist-based progress tracking
- Payment percentage allocation per stage

### Pillar 2: Mobile Field Capture
- Photo uploads with GPS coordinates
- Compass heading (degrees from north)
- AR pose matrix (4x4 transformation for 3D anchoring)
- Offline queue support for field work

### Pillar 3: Thermal Analysis Engine
- Calculates cooling/heating loads from 3D geometry
- Climate data for UAE locations (Dubai, Abu Dhabi, Sharjah, Al Ain, etc.)
- Zone-by-zone analysis with heatmap data
- Annual energy cost estimation in AED

### Pillar 4: Deviation Detection
- Compares actual vs expected positions from 3D model
- Tolerance rules (±20mm for walls, ±15mm for columns, etc.)
- Severity classification (cosmetic, minor, major, critical)
- Payment blocking for critical/major deviations

### Pillar 5: Payment Gates & DLP
- Payment blocking logic based on:
  - Stage approval status
  - Critical/major deviations
  - High-priority DLP tickets
- Defect Liability Period (DLP) ticket management
- Contractor assignment and verification workflow

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)

### Run with Docker Compose

```bash
# Clone and navigate to project
cd buildguard

# Start all services
docker-compose up -d

# Wait for services to start (check with)
docker-compose ps

# Access the services:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
```

### Run Backend Locally (Development)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations (auto-created on startup)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Endpoints

#### Projects
- `POST /api/projects/` - Create project with auto-generated stages
- `GET /api/projects/` - List projects
- `GET /api/projects/{id}` - Get project details
- `PATCH /api/projects/{id}` - Update project
- `POST /api/projects/{id}/upload-model` - Upload 3D model (IFC/OBJ)

#### Stages
- `GET /api/stages/project/{project_id}` - List stages
- `POST /api/stages/{id}/can-start` - Check if stage can start
- `POST /api/stages/{id}/start` - Start stage (with gating)
- `POST /api/stages/{id}/submit` - Submit for approval
- `POST /api/stages/{id}/approve` - Approve stage
- `PATCH /api/stages/{id}/checklist` - Update checklist item

#### Captures
- `POST /api/captures/sessions` - Create capture session
- `POST /api/captures/photos` - Create photo entry
- `POST /api/captures/photos/{id}/metadata` - Add GPS/AR metadata
- `POST /api/captures/photos/{id}/upload` - Upload photo file
- `GET /api/captures/sessions/{id}/sync-status` - Get sync status

#### Analysis
- `POST /api/analysis/` - Create thermal analysis
- `POST /api/analysis/{id}/run` - Run analysis calculation
- `GET /api/analysis/{id}/summary` - Get cooling load summary
- `GET /api/analysis/climate-data/{location}` - Get climate data

#### Deviations
- `POST /api/deviations/check-position` - Check position deviation
- `GET /api/deviations/project/{project_id}` - List deviations
- `GET /api/deviations/critical/project/{project_id}` - Get critical deviations
- `POST /api/deviations/{id}/accept` - Accept deviation
- `POST /api/deviations/{id}/rectify` - Mark as rectified

#### Payments
- `POST /api/payments/gates` - Create payment gate
- `POST /api/payments/gates/{id}/check-readiness` - Check if releasable
- `POST /api/payments/gates/{id}/request-release` - Request release
- `POST /api/payments/gates/{id}/approve` - Approve payment
- `POST /api/payments/tickets` - Create DLP ticket
- `POST /api/payments/tickets/{id}/assign` - Assign ticket

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  PostgreSQL │
│   (React)   │◀────│  (FastAPI)  │◀────│   (Data)    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  Redis  │  │  MinIO  │  │  AR/AI  │
        │ (Cache) │  │ (Files) │  │ (Future)│
        └─────────┘  └─────────┘  └─────────┘
```

## Testing the Happy Path

### 1. Create a Project
```bash
curl -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Villa Al Barari",
    "address": "Al Barari, Dubai",
    "location": "Dubai",
    "contract_value": 1750000
  }'
```

### 2. Start First Stage
```bash
curl -X POST http://localhost:8000/api/stages/{stage_id}/start \
  -H "Content-Type: application/json" \
  -d '{"user_id": "contractor_001"}'
```

### 3. Complete Checklist & Submit
```bash
# Update checklist items
curl -X PATCH http://localhost:8000/api/stages/{stage_id}/checklist \
  -H "Content-Type: application/json" \
  -d '{"item_index": 0, "completed": true}'

# Submit for approval
curl -X POST http://localhost:8000/api/stages/{stage_id}/submit
```

### 4. Approve Stage & Release Payment
```bash
# Approve stage
curl -X POST http://localhost:8000/api/stages/{stage_id}/approve \
  -H "Content-Type: application/json" \
  -d '{"approved_by": "owner_001"}'

# Check payment readiness
curl -X POST http://localhost:8000/api/payments/gates/{payment_id}/check-readiness

# Release payment
curl -X POST http://localhost:8000/api/payments/gates/{payment_id}/release
```

## License

MIT License - See LICENSE file
