# BuildGuard Pro - Build Summary

## Overview
A production-grade construction oversight platform for luxury villa construction in UAE. Built to prevent costly mistakes BEFORE they happen using AI-powered monitoring.

## 5 Core Pillars Implemented

### ✅ Pillar 1: Project & Stage Lifecycle
**Location:** `backend/app/services/stage_manager.py`

**Features:**
- Auto-generates 12 construction stages when project is created
- UAE villa-specific stage templates (Mobilization → External Works)
- State gating: Can't start Stage 2 if Stage 1 not approved
- Checklist-based progress tracking per stage
- Payment percentage allocation per stage (total 100%)

**API Endpoints:**
- `POST /api/stages/{id}/can-start` - Check gating conditions
- `POST /api/stages/{id}/start` - Start stage (enforced)
- `POST /api/stages/{id}/submit` - Submit for approval
- `POST /api/stages/{id}/approve` - Approve stage
- `PATCH /api/stages/{id}/checklist` - Update checklist items

---

### ✅ Pillar 2: Mobile Field Capture
**Location:** `backend/app/services/capture_service.py`

**Features:**
- Photo capture sessions linked to projects and stages
- GPS metadata (latitude, longitude, altitude, accuracy)
- Compass heading (degrees from north)
- AR pose matrix (4x4 transformation for 3D anchoring)
- Device info tracking (model, OS, app version)
- Offline queue support for field work
- Sync status tracking

**API Endpoints:**
- `POST /api/captures/sessions` - Create capture session
- `POST /api/captures/photos` - Create photo entry
- `POST /api/captures/photos/{id}/metadata` - Add GPS/AR metadata
- `POST /api/captures/photos/{id}/upload` - Upload photo file
- `GET /api/captures/sessions/{id}/sync-status` - Get sync status

---

### ✅ Pillar 3: Thermal Analysis Engine
**Location:** `backend/app/services/thermal_analysis.py`

**Features:**
- Calculates cooling/heating loads from 3D geometry
- Climate data for 6 UAE locations (Dubai, Abu Dhabi, Sharjah, Al Ain, Ras Al Khaimah, Fujairah)
- Zone-by-zone thermal analysis
- Heatmap data generation for 3D visualization
- Annual energy cost estimation in AED
- Cooling load calculation with safety factors

**Climate Data Includes:**
- Outdoor design temperatures (summer/winter)
- Relative humidity
- Solar radiation (peak W/m²)
- Cooling/heating degree days

**API Endpoints:**
- `POST /api/analysis/` - Create thermal analysis
- `POST /api/analysis/{id}/run` - Run calculation
- `GET /api/analysis/{id}/summary` - Get results summary
- `GET /api/analysis/climate-data/{location}` - Get climate data

---

### ✅ Pillar 4: Deviation Detection
**Location:** `backend/app/services/deviation_detector.py`

**Features:**
- Compares actual vs expected positions from 3D model
- Tolerance rules (in millimeters):
  - Wall position: ±20mm
  - Column position: ±15mm
  - Beam position: ±15mm
  - Window/Door position: ±10mm
  - Floor level: ±5mm
- Severity classification:
  - Cosmetic (at tolerance)
  - Minor (1.5x tolerance)
  - Major (2x tolerance)
  - Critical (3x tolerance)
- Deviation workflow: Detected → Review → Accept/Reject → Rectify → Close

**API Endpoints:**
- `POST /api/deviations/check-position` - Check position deviation
- `GET /api/deviations/project/{id}` - List deviations
- `GET /api/deviations/critical/project/{id}` - Get critical deviations
- `POST /api/deviations/{id}/accept` - Accept deviation
- `POST /api/deviations/{id}/rectify` - Mark as rectified

---

### ✅ Pillar 5: Payment Gates & DLP
**Location:** `backend/app/services/payment_service.py`

**Features:**
- Payment blocking logic based on:
  1. Stage approval status (must be APPROVED)
  2. Critical/major deviations (unresolved)
  3. High-priority DLP tickets (open)
- Payment workflow: Pending → Ready → Approved → Released
- Defect Liability Period (DLP) ticket management
- Contractor assignment and verification workflow
- Cost tracking for rectification

**API Endpoints:**
- `POST /api/payments/gates` - Create payment gate
- `POST /api/payments/gates/{id}/check-readiness` - Check if releasable
- `POST /api/payments/gates/{id}/request-release` - Request release
- `POST /api/payments/gates/{id}/approve` - Approve payment
- `POST /api/payments/gates/{id}/release` - Release payment
- `POST /api/payments/tickets` - Create DLP ticket
- `POST /api/payments/tickets/{id}/assign` - Assign to contractor
- `POST /api/payments/tickets/{id}/complete` - Mark complete
- `POST /api/payments/tickets/{id}/verify` - Verify completion

---

## Project Structure

```
buildguard/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── projects.py      # Project CRUD + model upload
│   │   │       ├── stages.py        # Stage lifecycle management
│   │   │       ├── captures.py      # Photo capture with metadata
│   │   │       ├── analysis.py      # Thermal analysis engine
│   │   │       ├── deviations.py    # Deviation detection
│   │   │       └── payments.py      # Payment gates + DLP tickets
│   │   ├── core/
│   │   │   ├── config.py            # Environment configuration
│   │   │   └── database.py          # SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── project.py           # Project + ConstructionStage
│   │   │   ├── capture.py           # CaptureSession + PhotoCapture + PhotoMetadata
│   │   │   ├── analysis.py          # ThermalAnalysis + ThermalZone
│   │   │   ├── deviation.py         # DeviationEvent
│   │   │   └── payment.py           # PaymentGate + DlpTicket
│   │   ├── schemas/
│   │   │   └── *.py                 # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── stage_manager.py     # Pillar 1: Stage lifecycle
│   │   │   ├── capture_service.py   # Pillar 2: Field capture
│   │   │   ├── thermal_analysis.py  # Pillar 3: Thermal engine
│   │   │   ├── deviation_detector.py # Pillar 4: Deviation detection
│   │   │   └── payment_service.py   # Pillar 5: Payment gates
│   │   └── main.py                  # FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.ts               # API client for all 5 pillars
│   │   ├── App.tsx                  # Main dashboard
│   │   └── ...
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml               # Full stack orchestration
└── README.md
```

---

## Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** PostgreSQL 15 + SQLAlchemy 2.0 (async)
- **Cache/Queue:** Redis 7
- **Object Storage:** MinIO (S3-compatible)
- **Migrations:** Alembic

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx

---

## Quick Start

### 1. Start All Services
```bash
cd buildguard
docker-compose up -d
```

### 2. Access Services
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)

### 3. Test the Happy Path
```bash
# Create a project
curl -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Villa Al Barari",
    "address": "Al Barari, Dubai",
    "location": "Dubai",
    "contract_value": 1750000
  }'

# List stages
curl http://localhost:8000/api/stages/project/{project_id}

# Start first stage
curl -X POST http://localhost:8000/api/stages/{stage_id}/start \
  -d '{"user_id": "contractor_001"}'

# Check payment readiness
curl -X POST http://localhost:8000/api/payments/gates/{payment_id}/check-readiness
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/` | GET, POST | List/Create projects |
| `/api/projects/{id}` | GET, PATCH, DELETE | Project CRUD |
| `/api/projects/{id}/upload-model` | POST | Upload 3D model |
| `/api/stages/project/{id}` | GET | List stages |
| `/api/stages/{id}/start` | POST | Start stage (gated) |
| `/api/stages/{id}/approve` | POST | Approve stage |
| `/api/captures/sessions` | POST | Create capture session |
| `/api/captures/photos/{id}/metadata` | POST | Add GPS/AR metadata |
| `/api/analysis/` | POST | Create thermal analysis |
| `/api/analysis/{id}/run` | POST | Run calculation |
| `/api/deviations/check-position` | POST | Check deviation |
| `/api/payments/gates` | POST | Create payment gate |
| `/api/payments/gates/{id}/check-readiness` | POST | Check if releasable |
| `/api/payments/tickets` | POST | Create DLP ticket |

---

## Database Schema

### Projects Table
- `id`, `name`, `address`, `location`
- `contract_value`, `start_date`, `expected_completion`
- `model_url`, `model_metadata` (3D model data)
- `status`, `progress`

### Construction Stages Table
- `id`, `project_id`, `name`, `sequence`
- `status` (not_started, in_progress, pending_approval, approved, rejected)
- `checklist_items` (JSON array)
- `payment_percentage`, `payment_amount`
- `depends_on` (JSON array of stage dependencies)

### Photo Captures Table
- `id`, `session_id`, `file_path`, `status`
- Linked to `photo_metadata` (GPS, compass, AR pose)

### Thermal Analysis Table
- `id`, `project_id`, `location`, `status`
- `total_cooling_load_kw`, `total_heating_load_kw`
- `recommended_ac_tons`, `estimated_annual_cost_aed`
- Linked to `thermal_zones`

### Deviation Events Table
- `id`, `project_id`, `element_type`, `element_id`
- `expected_position`, `actual_position` (JSON)
- `position_deviation_mm`, `tolerance_mm`, `severity`
- `status` (detected, under_review, accepted, rejected, rectified, closed)

### Payment Gates Table
- `id`, `project_id`, `stage_id`, `amount`, `status`
- `block_reasons`, `blocking_deviation_ids`, `blocking_ticket_ids`

### DLP Tickets Table
- `id`, `project_id`, `title`, `description`
- `priority`, `status`, `assigned_to`
- `before_photos`, `after_photos` (JSON arrays)

---

## Next Steps (Future Enhancements)

1. **3D Viewer Integration**
   - Three.js or Babylon.js for model visualization
   - Thermal heatmap overlay
   - Deviation marker visualization

2. **AI/ML Features**
   - Computer vision for automatic deviation detection
   - Photo-to-model matching using ARKit/ARCore
   - Predictive analysis for schedule delays

3. **Mobile App**
   - React Native or Flutter app
   - Offline-first architecture
   - AR capture with real-time 3D anchoring

4. **Notifications**
   - Email/SMS alerts for critical deviations
   - Push notifications for stage approvals
   - Payment release notifications

5. **Reporting**
   - PDF report generation
   - Progress dashboards
   - Cost analysis reports

---

## License

MIT License
