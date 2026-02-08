# BuildGuard Pro — v1 Upgrade Prompt

You are working on BuildGuard Pro v1, a construction oversight platform for UAE villa construction. The codebase is in `Buildguard kimi 8-2 v1/`. A previous fix pass (v0 → v1) applied most of the critical fixes: Boolean import, secret key hardening, debug mode, CORS, double commits, logging, indexes, auth system, frontend-backend wiring, and new endpoints. **However, v1 has unfinished integrations, contract mismatches between frontend and backend, a syntax error, and dead code that prevent it from running end-to-end.** Your job is to finish every incomplete integration, fix every mismatch, and deliver a working application.

---

## What v1 Got Right (Do NOT Redo)

These are done. Do not touch them unless a fix below specifically references them:

- ✅ `Boolean` import in `deviation.py`
- ✅ Secret key validation with forbidden list + 32-char minimum
- ✅ `debug: bool = False` default
- ✅ CORS uses `settings.cors_origins_list` (not `*`)
- ✅ MinIO bucket policy is no longer public
- ✅ Credentials externalized via `${VAR:-default}` in `docker-compose.yml`
- ✅ `--reload` removed from Dockerfile CMD
- ✅ All 31 explicit `await db.commit()` removed from routes
- ✅ Structured JSON logging with request middleware
- ✅ 19 database indexes added across all models
- ✅ Auth module (`core/auth.py`), User model, auth routes (register/login/me)
- ✅ Frontend: token management, API client with typed responses, Zustand store with async API calls, LoginPage, ProjectSelector
- ✅ Custom exception classes defined in `core/exceptions.py`
- ✅ Exception handlers registered in `main.py`
- ✅ Contractor scorecard + evidence package endpoints
- ✅ Pro-backend client (`core/pro_backend_client.py`)
- ✅ Test suite (7 test files)

---

## PHASE 0: BLOCKERS — Fix These First or Nothing Works

### 0.1 Syntax Error in `projects.py` — Backend Crashes on Import

**File:** `buildguard/backend/app/api/routes/projects.py`, lines 227-232

The `get_model_status` endpoint has orphaned code after `return status`:

```python
    return status
        success=True,
        message="Model uploaded and parsed successfully",
        model_url=project.model_url,
        parsed_metadata=model_metadata
    )
```

This is a `SyntaxError`. Python will refuse to import the module, which means ALL project routes fail and the backend cannot start.

**Fix:** Remove the orphaned lines (228-232). The endpoint should simply return the status from the pro-backend:

```python
@router.get("/{project_id}/model-status")
async def get_model_status(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get the processing status of the project's 3D model."""
    from app.core.pro_backend_client import get_pro_backend_client

    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.model_metadata or not project.model_metadata.get("processing_id"):
        return {"status": "no_model", "message": "No model uploaded for this project"}

    pro_client = get_pro_backend_client()
    status = await pro_client.get_model_status(project.model_metadata["processing_id"])

    return status
```

**Verify:** Run `python -c "from app.api.routes.projects import router; print('OK')"` from `buildguard/backend/`. It must print `OK`.

### 0.2 Frontend-Backend Response Contract Mismatch — Frontend Will Crash

The frontend API client expects paginated `{ items: T[], total: number }` responses from ALL list endpoints. But the backend returns bare arrays for most of them. When the frontend calls `.items` on a bare array, it gets `undefined`, and the UI crashes.

**Here are the exact mismatches:**

| Frontend Expects (in `api.ts`) | Backend Returns (in route handler) | Status |
|------|--------|--------|
| `projectsApi.list()` → `{ items: Project[], total, skip, limit }` | `List[ProjectListResponse]` (bare array) | **MISMATCH** |
| `stagesApi.list()` → `{ items: ConstructionStage[], total }` | `List[StageResponse]` (bare array) | **MISMATCH** |
| `paymentsApi.listGates()` → `{ items: PaymentGate[], total }` | `List[PaymentGateResponse]` (bare array) | **MISMATCH** |
| `deviationsApi.list()` → `{ items: Deviation[], total }` | `DeviationListResponse` with `{ deviations: [...], total, by_severity }` | **FIELD NAME MISMATCH** (`deviations` not `items`) |

**Fix each one — see Phase 1 for the full pagination implementation.**

### 0.3 Pro-Backend Build Path Wrong in Docker Compose

**File:** `buildguard/docker-compose.yml`, line 98:
```yaml
pro-backend:
    build: ./pro-backend
```

The pro-backend directory is actually at `../buildguard-pro-backend` relative to the `buildguard/` directory. There is no `./pro-backend` folder inside `buildguard/`. Docker build will fail.

**Fix:**
```yaml
pro-backend:
    build: ../buildguard-pro-backend
```

**Verify:** Run `docker compose config` from the `buildguard/` directory. It must resolve the build path without errors.

---

## PHASE 1: Add Pagination to ALL List Endpoints

The frontend expects every list endpoint to return `{ items: T[], total: number }`. Currently only `list_projects` has `skip`/`limit` params, and even it returns a bare array.

### 1.1 Create a Pagination Helper

**File to create:** `buildguard/backend/app/core/pagination.py`

```python
from fastapi import Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import TypeVar, Generic, List, Any
from pydantic import BaseModel

T = TypeVar("T")

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True

async def paginate(
    db: AsyncSession,
    query,
    model,
    skip: int = 0,
    limit: int = 50,
):
    """Execute a query with pagination, returning {items, total, skip, limit}."""
    # Count total matching records
    count_query = select(func.count()).select_from(model)
    # If the query has a WHERE clause, apply it to the count
    if hasattr(query, 'whereclause') and query.whereclause is not None:
        count_query = count_query.where(query.whereclause)
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    # Fetch page
    result = await db.execute(query.offset(skip).limit(limit))
    items = result.scalars().all()

    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

### 1.2 Fix `list_projects` — Return Paginated Object

**File:** `buildguard/backend/app/api/routes/projects.py`, lines 48-62

**Current:**
```python
@router.get("/", response_model=List[ProjectListResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
    )
    projects = result.scalars().all()
    return projects
```

**Fix:**
```python
@router.get("/")
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List all projects with pagination."""
    count_result = await db.execute(select(func.count()).select_from(Project))
    total = count_result.scalar()

    result = await db.execute(
        select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

Add the import at the top:
```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func
```

### 1.3 Fix `list_stages` — Return `{ items, total }`

**File:** `buildguard/backend/app/api/routes/stages.py`, lines 24-36

**Current:**
```python
@router.get("/project/{project_id}", response_model=List[StageResponse])
async def list_stages(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConstructionStage)
        .where(ConstructionStage.project_id == project_id)
        .order_by(ConstructionStage.sequence)
    )
    stages = result.scalars().all()
    return stages
```

**Fix:**
```python
@router.get("/project/{project_id}")
async def list_stages(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List all stages for a project with pagination."""
    count_result = await db.execute(
        select(func.count()).select_from(ConstructionStage)
        .where(ConstructionStage.project_id == project_id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(ConstructionStage)
        .where(ConstructionStage.project_id == project_id)
        .order_by(ConstructionStage.sequence)
        .offset(skip).limit(limit)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

Add imports:
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
```

### 1.4 Fix `list_payment_gates` — Return `{ items, total }`

**File:** `buildguard/backend/app/api/routes/payments.py`, lines 43-55

**Current:**
```python
@router.get("/gates/project/{project_id}", response_model=List[PaymentGateResponse])
async def list_payment_gates(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PaymentGate)
        .where(PaymentGate.project_id == project_id)
        .order_by(PaymentGate.created_at)
    )
    payments = result.scalars().all()
    return payments
```

**Fix:**
```python
@router.get("/gates/project/{project_id}")
async def list_payment_gates(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List all payment gates for a project with pagination."""
    count_result = await db.execute(
        select(func.count()).select_from(PaymentGate)
        .where(PaymentGate.project_id == project_id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(PaymentGate)
        .where(PaymentGate.project_id == project_id)
        .order_by(PaymentGate.created_at)
        .offset(skip).limit(limit)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

Add imports:
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
```

### 1.5 Fix `list_deviations` — Rename `deviations` to `items`

**File:** `buildguard/backend/app/api/routes/deviations.py`, lines 53-81

The current response uses `deviations` as the key, but the frontend expects `items`.

**Fix:** Change the return in `list_deviations`:
```python
@router.get("/project/{project_id}")
async def list_deviations(
    project_id: str,
    severity: Optional[List[str]] = None,
    status: Optional[List[str]] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List all deviations for a project with optional filtering and pagination."""
    query = select(DeviationEvent).where(DeviationEvent.project_id == project_id)

    if severity:
        query = query.where(DeviationEvent.severity.in_(severity))
    if status:
        query = query.where(DeviationEvent.status.in_(status))

    # Count total matching
    count_query = select(func.count()).select_from(DeviationEvent).where(DeviationEvent.project_id == project_id)
    if severity:
        count_query = count_query.where(DeviationEvent.severity.in_(severity))
    if status:
        count_query = count_query.where(DeviationEvent.status.in_(status))
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    result = await db.execute(
        query.order_by(DeviationEvent.detected_at.desc()).offset(skip).limit(limit)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

Also update the `DeviationListResponse` schema in `app/schemas/deviation.py` (line 85-88):

```python
class DeviationListResponse(BaseModel):
    items: List[DeviationResponse]
    total: int
    skip: int = 0
    limit: int = 50
```

Add imports to `deviations.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_, func
```

### 1.6 Fix `list_dlp_tickets` — Return `{ items, total }`

**File:** `buildguard/backend/app/api/routes/payments.py`, lines 228-245

Apply the same pagination pattern:

```python
@router.get("/tickets/project/{project_id}")
async def list_dlp_tickets(
    project_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """List DLP tickets for a project with pagination."""
    query = select(DlpTicket).where(DlpTicket.project_id == project_id)
    count_query = select(func.count()).select_from(DlpTicket).where(DlpTicket.project_id == project_id)

    if status:
        query = query.where(DlpTicket.status == status)
        count_query = count_query.where(DlpTicket.status == status)
    if priority:
        query = query.where(DlpTicket.priority == priority)
        count_query = count_query.where(DlpTicket.priority == priority)

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    result = await db.execute(query.order_by(DlpTicket.reported_at.desc()).offset(skip).limit(limit))
    items = result.scalars().all()

    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

### 1.7 Fix `list_capture_sessions` — Return `{ items, total }`

**File:** `buildguard/backend/app/api/routes/captures.py`, lines 80-92

Apply the same pattern. Add `skip`/`limit` query params and return `{ items, total, skip, limit }`.

### 1.8 Fix `list_analyses` — Return `{ items, total }`

**File:** `buildguard/backend/app/api/routes/analysis.py`, lines 49-61

Apply the same pattern.

**Verify after all pagination fixes:** Start the backend, create a project, then call `GET /api/stages/project/{id}`. The response must be `{"items": [...], "total": 12, "skip": 0, "limit": 50}`, NOT a bare array.

---

## PHASE 2: Protect All Routes with Authentication

The auth system exists (`core/auth.py` has `get_current_user`) but it is NOT applied to any route except `/api/auth/me`. Every endpoint is currently accessible without a token. This must be fixed.

### 2.1 Add `current_user` Dependency to All Route Handlers

For every route handler in these 6 files, add `current_user: User = Depends(get_current_user)` as a parameter:

**Files to modify:**
- `app/api/routes/projects.py` — all 7 endpoints
- `app/api/routes/stages.py` — all 8 endpoints
- `app/api/routes/captures.py` — all 13 endpoints
- `app/api/routes/analysis.py` — all 9 endpoints
- `app/api/routes/deviations.py` — all 8 endpoints
- `app/api/routes/payments.py` — all 13 endpoints
- `app/api/routes/contractors.py` — all 2 endpoints
- `app/api/routes/evidence.py` — all 3 endpoints

**Add these imports** at the top of each file:
```python
from app.core.auth import get_current_user
from app.models.user import User
```

**Example for `projects.py` `create_project`:**

Before:
```python
@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
```

After:
```python
@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
```

Do this for **every single route handler** in all 8 files listed above.

### 2.2 Add Project-Level Authorization

After adding `current_user` to all routes, add a project-level check. The `User` model has a `project_ids` JSON column (list of project IDs the user can access).

**Create a helper** in `app/core/auth.py`:

```python
def check_project_access(user: User, project_id: str):
    """Verify the user has access to the given project."""
    if user.role == "admin":
        return  # Admins can access everything
    if user.project_ids and project_id not in user.project_ids:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this project"
        )
```

Then call `check_project_access(current_user, project_id)` at the top of every route that takes a `project_id` parameter.

### 2.3 Auto-Assign Project on Creation

When a user creates a project, automatically add the new project ID to their `project_ids` list.

**In `projects.py` `create_project`:**
```python
    # After project creation
    if current_user.project_ids is None:
        current_user.project_ids = []
    current_user.project_ids = current_user.project_ids + [project.id]
```

**Verify:** Call `GET /api/projects/` without a token. It must return `401 Unauthorized`. Call it with a valid token. It must return the user's projects.

---

## PHASE 3: Wire Custom Exceptions into Services

v1 created 9 custom exception classes in `core/exceptions.py` and registered 4 exception handlers in `main.py`. But no service or route actually throws them — they all still use `raise HTTPException(...)`. The exceptions are dead code.

### 3.1 Replace `HTTPException(404)` with Domain Exceptions in Routes

**Pattern — in every route file**, replace:
```python
if not project:
    raise HTTPException(status_code=404, detail="Project not found")
```

With:
```python
if not project:
    raise ProjectNotFoundError(project_id)
```

**Mapping:**

| Current Pattern | Replace With | Files |
|----------------|-------------|-------|
| `HTTPException(404, "Project not found")` | `ProjectNotFoundError(project_id)` | projects.py, analysis.py |
| `HTTPException(404, "Stage not found")` | `StageNotFoundError(stage_id)` | stages.py |
| `HTTPException(404, "Deviation not found")` | `DeviationNotFoundError(deviation_id)` | deviations.py |
| `HTTPException(404, "Payment gate not found")` | `PaymentGateNotFoundError(payment_id)` | payments.py |
| `HTTPException(400, message)` where stage can't start/submit/approve | `StageNotReadyError(stage_id, message)` | stages.py |
| `HTTPException(400, message)` where payment blocked | `PaymentBlockedError(payment_id, [message])` | payments.py |

**Add missing exception handlers** in `main.py` for the exceptions not yet handled:

```python
from app.core.exceptions import (
    BuildGuardError, ProjectNotFoundError, StageNotReadyError,
    PaymentBlockedError, StageNotFoundError, DeviationNotFoundError,
    PaymentGateNotFoundError, InvalidTransitionError, FileUploadError
)

@app.exception_handler(StageNotFoundError)
async def stage_not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"error": exc.code, "message": exc.message})

@app.exception_handler(DeviationNotFoundError)
async def deviation_not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"error": exc.code, "message": exc.message})

@app.exception_handler(PaymentGateNotFoundError)
async def payment_gate_not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"error": exc.code, "message": exc.message})

@app.exception_handler(InvalidTransitionError)
async def invalid_transition_handler(request, exc):
    return JSONResponse(status_code=409, content={"error": exc.code, "message": exc.message})

@app.exception_handler(FileUploadError)
async def file_upload_error_handler(request, exc):
    return JSONResponse(status_code=500, content={"error": exc.code, "message": exc.message})
```

**Verify:** After wiring, try to get a nonexistent project. The response must be `{"error": "PROJECT_NOT_FOUND", "message": "Project abc not found"}`, not a generic 500 or raw HTTPException.

---

## PHASE 4: Fix Remaining Frontend-Backend Integration Issues

### 4.1 Fix `submit_for_approval` Body Requirement

**File:** `buildguard/backend/app/api/routes/stages.py`, lines 84-97

The `submit_for_approval` endpoint requires a `StageSubmitRequest` body:
```python
async def submit_for_approval(
    stage_id: str,
    request: StageSubmitRequest,  # <-- requires JSON body
    ...
```

But `StageSubmitRequest` only has `notes: Optional[str] = None`. The frontend sends no body at all:
```typescript
submit: (id: string) => fetchApi<...>(`/stages/${id}/submit`, { method: 'POST' }),
```

The frontend sends `Content-Type: application/json` with no body. FastAPI will return `422 Unprocessable Entity` because it can't parse the empty body as JSON.

**Fix — make the body optional** by giving it a default:
```python
@router.post("/{stage_id}/submit", response_model=StageSubmitResponse)
async def submit_for_approval(
    stage_id: str,
    request: StageSubmitRequest = StageSubmitRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
```

Or alternatively, use `Body(default=None)`:
```python
from fastapi import Body

@router.post("/{stage_id}/submit", response_model=StageSubmitResponse)
async def submit_for_approval(
    stage_id: str,
    request: Optional[StageSubmitRequest] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if request is None:
        request = StageSubmitRequest()
    ...
```

### 4.2 Add Toast Notifications to Store Actions

**File:** `app/src/store/projectStore.ts`

The `sonner` library is installed and `<Toaster />` is in App.tsx, but no store action actually calls `toast()`. Add success/error toasts.

**Add import:**
```typescript
import { toast } from 'sonner';
```

**Add success toasts** after every successful mutation:
```typescript
// In startStage, after the API call:
toast.success('Stage started');

// In submitStage:
toast.success('Stage submitted for approval');

// In approveStage:
toast.success('Stage approved');

// In acceptDeviation:
toast.success('Deviation accepted');

// In rejectDeviation:
toast.success('Deviation rejected — rectification required');

// In rectifyDeviation:
toast.success('Deviation marked as rectified');

// In requestPaymentRelease:
toast.success('Payment release requested');

// In approvePayment:
toast.success('Payment approved');

// In createProject:
toast.success('Project created');
```

**Replace `set({ error: ... })` in catch blocks** with toast errors:
```typescript
catch (err: any) {
  const message = err.message || 'Operation failed';
  toast.error(message);
  set({ error: message, loading: false });
}
```

### 4.3 Add Error Boundary Component

**File to create:** `app/src/components/ErrorBoundary.tsx`

```tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-red-600">Something went wrong</h3>
          <p className="text-sm text-gray-500 mt-2">{this.state.error?.message}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Wrap each section in App.tsx:**
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// In the render, wrap each tab's content:
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

### 4.4 Fix ProjectWizard — Wire Create to API

**File:** `app/src/sections/ProjectWizard.tsx`

Find the "Create Project" button handler. It should call:
```typescript
const handleCreateProject = async () => {
    setLoading(true);
    try {
        const project = await createProject({
            name: formData.projectName,
            address: formData.location,
            location: formData.location,
            contract_value: parseFloat(formData.budget) || 0,
            start_date: formData.startDate,
            expected_completion: formData.endDate,
        });
        if (project) {
            await loadProject(project.id);
            setActiveTab('overview');
            toast.success('Project created successfully');
        }
    } catch (err) {
        toast.error('Failed to create project');
    } finally {
        setLoading(false);
    }
};
```

If the button handler currently does nothing or sets local state, replace it with this API call.

---

## PHASE 5: Developer Experience & Infrastructure

### 5.1 Create `.env.example`

**File to create:** `buildguard/.env.example`

```env
# BuildGuard Pro — Environment Variables
# Copy this file to .env and fill in real values

# REQUIRED — App will refuse to start without this
SECRET_KEY=generate-a-strong-random-key-at-least-32-chars

# Database
POSTGRES_USER=buildguard
POSTGRES_PASSWORD=change-this-password
POSTGRES_DB=buildguard

# MinIO Object Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-this-password

# CORS — comma-separated allowed origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Debug mode (set to true only in development)
DEBUG=false
```

### 5.2 Add `.env` to `.gitignore`

**File:** `buildguard/.gitignore` (create if it doesn't exist)

```gitignore
# Environment files with secrets
.env
!.env.example

# Python
__pycache__/
*.pyc
.pytest_cache/

# Node
node_modules/

# Docker
docker-compose.override.yml
```

### 5.3 Remove Password Defaults from Docker Compose

**File:** `buildguard/docker-compose.yml`

Change these lines to remove default fallbacks for passwords (keep defaults only for non-sensitive values):

```yaml
# Line 10 — CHANGE:
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-buildguard}
# TO:
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}

# Line 42 — CHANGE:
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
# TO:
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?Set MINIO_ROOT_PASSWORD in .env}
```

The `:?` syntax makes Docker Compose fail with a clear error message if the variable is not set, instead of silently using a weak default.

### 5.4 Add Dev Override for `--reload`

**File to create:** `buildguard/docker-compose.override.yml`

```yaml
version: '3.8'

services:
  backend:
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

This file is automatically picked up by `docker compose up` and overrides the production CMD with dev-mode hot-reload. Since it's in `.gitignore`, it won't affect production.

### 5.5 Initialize Alembic Migrations

**Commands to run from `buildguard/backend/`:**

```bash
pip install alembic
alembic init alembic
```

**Edit `alembic/env.py`** to use the async engine:

```python
from app.core.database import Base
from app.core.config import settings

target_metadata = Base.metadata

def get_url():
    return settings.database_url

# In run_migrations_online(), use async engine
```

**Edit `alembic.ini`:**
```ini
sqlalchemy.url = %(DATABASE_URL)s
```

**Create initial migration:**
```bash
alembic revision --autogenerate -m "initial schema"
```

**Remove `create_all` from `main.py`** lifespan and replace with a comment:
```python
# Database tables are managed by Alembic migrations.
# Run: alembic upgrade head
```

---

## PHASE 6: Mobile App Alignment

### 6.1 Fix Mobile API Base URL

**File:** `buildguard-mobile/src/services/apiService.js`

Check the `BASE_URL` constant. It should point to the backend API:
```javascript
const BASE_URL = 'http://localhost:8000/api';
```

If it points to a different URL or hardcoded IP, fix it. Also consider making it configurable via environment or a config file.

### 6.2 Align Mobile Auth with JWT Endpoints

**File:** `buildguard-mobile/src/services/authService.js`

Verify the login endpoint matches `POST /api/auth/login` with `{ email, password }` body. Verify it stores the JWT token and sends it as `Authorization: Bearer <token>` in subsequent requests.

**File:** `buildguard-mobile/src/context/AuthContext.js`

Verify the auth context uses the correct token storage and the check-auth flow calls `GET /api/auth/me`.

---

## PHASE 7: Pro-Backend Hardening

### 7.1 Fix Pro-Backend CORS

**File:** `buildguard-pro-backend/app/main.py`

If it has `allow_origins=["*"]`, apply the same CORS fix as the main backend:
```python
from app.core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(",") if hasattr(settings, 'cors_origins') else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 7.2 Share JWT Validation

The pro-backend should validate the same JWT tokens as the main backend. Copy the `get_current_user` dependency logic or create a shared JWT validation utility. The `SECRET_KEY` is already passed via docker-compose environment.

### 7.3 Fix Pro-Backend Storage

**File:** `buildguard-pro-backend/app/main.py`

The pro-backend stores files in `/tmp/buildguard-uploads/` which is ephemeral. v1 added a Docker volume mount for this (`pro_backend_data:/tmp/buildguard-uploads`), which is good. But ideally it should use MinIO for consistency with the main backend.

For now, verify the volume mount works. Long-term, migrate to MinIO.

---

## PHASE 8: Run Tests and Fix Failures

### 8.1 Install Test Dependencies

```bash
cd buildguard/backend
pip install pytest pytest-asyncio httpx
```

### 8.2 Run the Test Suite

```bash
cd buildguard/backend
pytest tests/ -v --tb=short
```

### 8.3 Fix Failures

Tests may fail because:

1. **Auth changes** — protected routes now require tokens. Update `conftest.py` to create a test user and include the auth token in all test requests:
   ```python
   @pytest.fixture
   async def auth_headers(client, db_session):
       # Register a test user
       response = await client.post("/api/auth/register", json={
           "email": "test@test.com",
           "password": "testpassword123",
           "full_name": "Test User",
           "role": "admin"
       })
       token = response.json()["token"]
       return {"Authorization": f"Bearer {token}"}
   ```

2. **Pagination format** — tests that check list responses need to access `.items` instead of treating the response as a bare array.

3. **Exception format** — 404 responses now return `{"error": "...", "message": "..."}` instead of `{"detail": "..."}`.

**Every test must pass before moving on.**

---

## Constraints

- **Do NOT rewrite the UI components** — the 50+ shadcn/ui components are well-built. Just wire them to real data.
- **Do NOT change the 5-pillar architecture** — it's sound. Just complete the integrations.
- **Do NOT add new frameworks or libraries** unless strictly necessary.
- **Keep Docker Compose working** — after every phase, verify `docker compose config` is valid.
- **Do NOT redo any of the v1 fixes** listed in "What v1 Got Right" above.
- **Preserve backward compatibility** in the API — if you change a response format, make sure the frontend client in `api.ts` matches.

---

## Verification Checklist

After completing all phases, verify each of these works:

1. [ ] Backend starts without syntax errors (`python -c "from app.main import app; print('OK')"`)
2. [ ] `docker compose config` resolves all build paths and env vars
3. [ ] `GET /api/projects/` without token returns `401 Unauthorized`
4. [ ] `GET /api/projects/` with valid token returns `{"items": [...], "total": N, "skip": 0, "limit": 50}`
5. [ ] `GET /api/stages/project/{id}` returns `{"items": [...], "total": 12, ...}`, NOT a bare array
6. [ ] `GET /api/payments/gates/project/{id}` returns `{"items": [...], "total": N, ...}`, NOT a bare array
7. [ ] `GET /api/deviations/project/{id}` returns `{"items": [...], "total": N, ...}` with `items` key (not `deviations`)
8. [ ] `POST /api/stages/{id}/submit` with empty body succeeds (does not return 422)
9. [ ] Frontend login → project list → open project → see stages/deviations/payments (no crashes)
10. [ ] Stage actions (start/submit/approve) persist to backend and show toast notifications
11. [ ] Deviation actions (accept/reject/rectify) persist to backend and show toast notifications
12. [ ] Payment actions (request release/approve) persist to backend and show toast notifications
13. [ ] `ProjectNotFoundError` returns `{"error": "PROJECT_NOT_FOUND", ...}` (not raw HTTPException)
14. [ ] Creating a project auto-assigns it to the current user's `project_ids`
15. [ ] `.env.example` file exists with all required variables documented
16. [ ] `.env` is in `.gitignore`
17. [ ] `docker compose up --build` starts all 6 services (postgres, redis, minio, backend, pro-backend, frontend)
18. [ ] `pytest tests/ -v` passes all tests (updated for auth + pagination)
19. [ ] Error boundary catches component crashes without killing the whole dashboard
20. [ ] Toast notifications appear on success and error

---

## Order of Operations

Execute phases in this order. Do not skip ahead.

1. **Phase 0** — Fix blockers (syntax error, response contract mismatches, pro-backend build path)
2. **Phase 1** — Add pagination to all list endpoints (match frontend contract)
3. **Phase 2** — Protect all routes with authentication
4. **Phase 3** — Wire custom exceptions into routes (replace HTTPException)
5. **Phase 4** — Fix frontend integration issues (submit body, toasts, error boundaries, project wizard)
6. **Phase 5** — Developer experience (`.env.example`, `.gitignore`, Alembic, dev override)
7. **Phase 6** — Mobile app alignment
8. **Phase 7** — Pro-backend hardening
9. **Phase 8** — Run tests and fix failures

After each phase, verify the relevant checklist items pass.
