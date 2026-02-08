# BuildGuard Pro — Complete Fix & Test Prompt

You are working on BuildGuard Pro, a construction oversight platform for UAE villa construction. The codebase is in `Buildguard kimi 8-2/`. It has a FastAPI backend, a React/TypeScript frontend, a React Native mobile app, and a separate AI/3D processing backend. **The code has serious bugs, security vulnerabilities, and missing integrations that must be fixed before it can run.** Your job is to fix every issue listed below, verify each fix, and make this a working end-to-end application.

---

## Current State Summary

What you built has **good architectural bones** — clean 3-layer separation (routes → services → models), solid domain modeling across 5 pillars, a comprehensive React UI with 50+ shadcn/ui components, and a useful AI/3D processing backend. However, **the application cannot run in its current state** due to a critical import bug, and even if patched, it has zero authentication, zero frontend-backend integration, hardcoded secrets, and no logging or tests.

Here is what needs to be fixed, organized from most critical to least.

---

## PHASE 0: BLOCKERS — Fix These First or Nothing Works

### 0.1 Missing `Boolean` Import — Backend Crashes on Startup

**File:** `buildguard/backend/app/models/deviation.py`
**Line 4** currently reads:
```python
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON
```

**Line 49** uses:
```python
is_within_tolerance = Column(Boolean, default=True)
```

`Boolean` is not in the import list. The backend will crash with `NameError: name 'Boolean' is not defined` when SQLAlchemy tries to load the `deviation_events` model.

**Fix:** Change line 4 to:
```python
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON, Boolean
```

**Verify:** After fixing, run `python -c "from app.models.deviation import DeviationEvent; print('OK')"` from the `buildguard/backend/` directory. It must print `OK` without errors.

### 0.2 Hardcoded Secret Key — JWT Tokens Can Be Forged by Anyone

**File:** `buildguard/backend/app/core/config.py`, line 19:
```python
secret_key: str = "your-secret-key-change-in-production"
```

**Also in** `buildguard/docker-compose.yml`, line 81:
```yaml
SECRET_KEY: your-secret-key-change-in-production
```

This placeholder value is used for JWT signing. If deployed, anyone who reads this source code can forge authentication tokens for any user.

**Fix:**
1. In `config.py`, remove the default value entirely:
   ```python
   secret_key: str  # No default — MUST be set via environment variable
   ```
2. In `buildguard/backend/app/main.py`, add a startup validation function that runs before the app starts:
   ```python
   FORBIDDEN_KEYS = {"", "your-secret-key-change-in-production", "changeme", "secret"}

   def _validate_secret_key():
       if settings.secret_key in FORBIDDEN_KEYS:
           raise RuntimeError(
               "SECRET_KEY is not set or uses a placeholder. "
               "Set a strong SECRET_KEY environment variable before starting."
           )
   ```
   Call `_validate_secret_key()` inside a `@app.on_event("startup")` handler.
3. In `docker-compose.yml`, change SECRET_KEY to reference a `.env` file (see Phase 5).
4. Create `buildguard/backend/.env.example` with:
   ```
   SECRET_KEY=generate-a-strong-random-key-here
   DATABASE_URL=postgresql+asyncpg://buildguard:buildguard@postgres:5432/buildguard
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   DEBUG=false
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

**Verify:** Start the backend without setting SECRET_KEY. It must refuse to start with a clear error message.

### 0.3 Debug Mode Enabled by Default

**File:** `buildguard/backend/app/core/config.py`, line 25:
```python
debug: bool = True
```

**Also in** `buildguard/docker-compose.yml`, line 83:
```yaml
DEBUG: "true"
```

Debug mode exposes stack traces, enables verbose SQL logging, and reveals internal application details to attackers.

**Fix:** Change the default to `False` in `config.py`:
```python
debug: bool = False
```

Change `docker-compose.yml` to `DEBUG: "false"` (or remove it entirely since the default is now False).

---

## PHASE 1: Security Hardening

### 1.1 CORS Allows All Origins with Credentials

**File:** `buildguard/backend/app/main.py`, lines 33-38:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Combining `allow_origins=["*"]` with `allow_credentials=True` is a CORS anti-pattern. Browsers actually block this combination per spec.

**Fix:**
1. Add to `config.py`:
   ```python
   cors_origins: str = "http://localhost:3000,http://localhost:5173"

   @property
   def cors_origins_list(self) -> list[str]:
       return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
   ```
2. Change `main.py` to:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=settings.cors_origins_list,
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

**Verify:** Start backend and make a request with `Origin: http://evil.com`. The response must NOT include `Access-Control-Allow-Origin: http://evil.com`.

### 1.2 MinIO Bucket Set to Public

**File:** `buildguard/docker-compose.yml`, line 65:
```yaml
/usr/bin/mc policy set public myminio/buildguard || true;
```

Anyone with network access to MinIO can read and write ALL uploaded construction photos and 3D models without authentication.

**Fix:** Remove the `mc policy set public` command. Use authenticated access only. When the backend needs to serve photos to the frontend, generate pre-signed URLs:
```python
# In capture_service.py or a new utility
from minio import Minio

def get_presigned_url(object_name: str, expires: int = 3600) -> str:
    client = Minio(settings.minio_endpoint, access_key=settings.minio_access_key, secret_key=settings.minio_secret_key, secure=False)
    return client.presigned_get_object("buildguard", object_name, expires=timedelta(seconds=expires))
```

### 1.3 Hardcoded Credentials in Docker Compose

**File:** `buildguard/docker-compose.yml` contains:
```yaml
POSTGRES_USER: buildguard        # line 9
POSTGRES_PASSWORD: buildguard    # line 10
MINIO_ROOT_USER: minioadmin      # line 41
MINIO_ROOT_PASSWORD: minioadmin  # line 42
```

**Fix:**
1. Create `buildguard/.env` (git-ignored) with actual values
2. Create `buildguard/.env.example` with placeholder values
3. In `docker-compose.yml`, use variable substitution:
   ```yaml
   POSTGRES_USER: ${POSTGRES_USER:-buildguard}
   POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
   MINIO_ROOT_USER: ${MINIO_ROOT_USER}
   MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
   ```
4. Add `.env` to `.gitignore`

### 1.4 Dockerfile Uses --reload in Production

**File:** `buildguard/backend/Dockerfile`, last line:
```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

`--reload` watches for file changes and restarts the server. This is a dev-only feature that reduces stability and performance in production.

**Fix:** Remove `--reload`:
```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

For local development, override in `docker-compose.yml`:
```yaml
backend:
  command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## PHASE 2: Fix Backend Code Quality Issues

### 2.1 Double Commit Pattern

**File:** `buildguard/backend/app/core/database.py`, lines 19-28:
```python
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()   # <-- auto-commits
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

But route handlers ALSO call `await db.commit()` explicitly. This results in double commits.

**Locations of explicit commits to REMOVE (let `get_db()` handle it):**
- `app/api/routes/projects.py` — every `await db.commit()` call (lines ~45, ~103, ~124)
- `app/api/routes/payments.py` — every `await db.commit()` call (lines ~40, ~86, ~111)
- `app/api/routes/stages.py` — every `await db.commit()` call
- `app/api/routes/captures.py` — every `await db.commit()` call
- `app/api/routes/analysis.py` — every `await db.commit()` call
- `app/api/routes/deviations.py` — every `await db.commit()` call

**Fix:** Search for `await db.commit()` in all route files and remove them. Keep `await db.flush()` calls — those are fine (they push changes to the DB within the transaction without committing). The `get_db()` dependency will handle the final commit.

**Verify:** After removing all explicit commits, test that creating a project, stage, and payment still persists to the database. The `get_db()` auto-commit should handle it.

### 2.2 Add Logging Throughout Backend

**There is not a single `logging` call in the entire backend.** When something fails in production, there will be zero trail to diagnose it.

**Fix:**
1. Create `buildguard/backend/app/core/logging_config.py`:
   ```python
   import logging
   import sys

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
   ```

2. Call `setup_logging(settings.debug)` at the top of `main.py`.

3. Add a request logging middleware in `main.py`:
   ```python
   import time
   logger = logging.getLogger("buildguard.api")

   @app.middleware("http")
   async def log_requests(request: Request, call_next):
       start = time.time()
       response = await call_next(request)
       duration = time.time() - start
       logger.info("method=%s path=%s status=%d duration=%.3fs",
                    request.method, request.url.path, response.status_code, duration)
       return response
   ```

4. Add logging to every service class. At minimum:
   - `stage_manager.py`: Log stage transitions (started, submitted, approved)
   - `payment_service.py`: Log payment gate creation, release requests, approvals, and especially blocks (with reasons)
   - `deviation_detector.py`: Log deviation checks and severity classifications
   - `capture_service.py`: Log photo uploads and sync operations
   - `thermal_analysis.py`: Log analysis requests and fallback behavior

   Example pattern:
   ```python
   logger = logging.getLogger("buildguard.services.payment")

   async def request_payment_release(self, ...):
       logger.info("payment_release_requested gate_id=%s", gate_id)
       # ... logic ...
       if blocked:
           logger.warning("payment_blocked gate_id=%s reasons=%s", gate_id, reasons)
       else:
           logger.info("payment_released gate_id=%s", gate_id)
   ```

### 2.3 Add Custom Exception Classes

**File to create:** `buildguard/backend/app/core/exceptions.py`

```python
class BuildGuardError(Exception):
    """Base exception for BuildGuard domain errors."""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)

class ProjectNotFoundError(BuildGuardError):
    def __init__(self, project_id: str):
        super().__init__(f"Project {project_id} not found", "PROJECT_NOT_FOUND")

class StageNotReadyError(BuildGuardError):
    def __init__(self, stage_id: str, reason: str):
        super().__init__(f"Stage {stage_id} not ready: {reason}", "STAGE_NOT_READY")

class PaymentBlockedError(BuildGuardError):
    def __init__(self, gate_id: str, reasons: list[str]):
        self.reasons = reasons
        super().__init__(f"Payment gate {gate_id} blocked: {', '.join(reasons)}", "PAYMENT_BLOCKED")

class UnauthorizedError(BuildGuardError):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, "UNAUTHORIZED")
```

Add global exception handlers in `main.py`:
```python
from app.core.exceptions import BuildGuardError, ProjectNotFoundError

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
```

Then use these exceptions in services instead of returning `(bool, str)` tuples.

### 2.4 Add Database Indexes

Every child table queries by `project_id` constantly, but there are no indexes. Add indexes to ALL models for commonly queried columns.

**Add `index=True` to these columns:**

In `app/models/project.py` (ConstructionStage model):
- `project_id` → `Column(String, ForeignKey("projects.id"), nullable=False, index=True)`
- `status` → `Column(Enum(StageStatus), ..., index=True)`

In `app/models/deviation.py`:
- `project_id` → add `index=True`
- `stage_id` → add `index=True`
- `severity` → add `index=True`
- `status` → add `index=True`

In `app/models/payment.py` (PaymentGate and DlpTicket):
- `project_id` → add `index=True`
- `stage_id` → add `index=True`
- `status` → add `index=True`

In `app/models/capture.py`:
- `project_id` → add `index=True`
- `session_id` → add `index=True`

In `app/models/analysis.py`:
- `project_id` → add `index=True`

**Verify:** After adding indexes, check that `Base.metadata.create_all` still works without errors.

### 2.5 Add Pagination to All List Endpoints

Currently all list endpoints return every record in the database. This will degrade badly with real data.

**Fix pattern for every list endpoint:**

```python
@router.get("/")
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    # Count total
    count_result = await db.execute(select(func.count()).select_from(Model))
    total = count_result.scalar()

    # Fetch page
    result = await db.execute(
        select(Model).offset(skip).limit(limit).order_by(Model.created_at.desc())
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "skip": skip, "limit": limit}
```

Apply this to:
- `GET /api/projects/`
- `GET /api/stages/project/{project_id}`
- `GET /api/deviations/project/{project_id}`
- `GET /api/payments/gates/project/{project_id}`
- `GET /api/payments/tickets/project/{project_id}`
- `GET /api/captures/sessions/project/{project_id}`
- `GET /api/analysis/project/{project_id}`

### 2.6 Fix Query Safety — Use `scalar_one_or_none()`

Several routes use `scalar_one()` which crashes if the record doesn't exist. Change all `scalar_one()` to `scalar_one_or_none()` and return a proper 404 if None.

**Pattern:**
```python
result = await db.execute(select(Model).where(Model.id == id))
item = result.scalar_one_or_none()
if not item:
    raise HTTPException(status_code=404, detail=f"Item {id} not found")
```

Check every route file for `scalar_one()` and fix them.

### 2.7 Fix test_api.py Hardcoded Path

**File:** `buildguard/backend/test_api.py`, line 7:
```python
sys.path.insert(0, '/mnt/okcomputer/output/buildguard/backend')
```

This path only works on the original build machine.

**Fix:** Replace with a relative path:
```python
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
```

### 2.8 Remove Duplicate httpx in requirements.txt

`httpx` appears twice in `buildguard/backend/requirements.txt`. Remove the duplicate.

---

## PHASE 3: Implement Authentication

### 3.1 Create Auth Module

**File to create:** `buildguard/backend/app/core/auth.py`

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    from app.models.user import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user
```

### 3.2 Create User Model

**File to create:** `buildguard/backend/app/models/user.py`

```python
import uuid
from sqlalchemy import Column, String, DateTime, JSON
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="owner")  # owner, consultant, contractor, admin
    project_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 3.3 Create Auth Routes

**File to create:** `buildguard/backend/app/api/routes/auth.py`

Implement:
- `POST /api/auth/register` — accepts `{email, password, full_name, role}`, returns `{token, user}`
- `POST /api/auth/login` — accepts `{email, password}`, returns `{token, user}`
- `GET /api/auth/me` — requires Bearer token, returns current user profile

Register this router in `main.py`:
```python
from app.api.routes.auth import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
```

### 3.4 Protect All Existing Routes

Add `current_user: User = Depends(get_current_user)` as a parameter to every route handler in:
- `projects.py`
- `stages.py`
- `captures.py`
- `analysis.py`
- `deviations.py`
- `payments.py`

Additionally, add project-level authorization: check that the requested `project_id` is in `current_user.project_ids` before allowing access.

**Verify:** After implementing auth, try calling `GET /api/projects/` without a token. It must return `401 Unauthorized`.

---

## PHASE 4: Connect Frontend to Backend

This is the biggest phase. The frontend currently runs 100% on hardcoded demo data and never calls the backend API.

### 4.1 Add Auth to the API Client

**File:** `app/src/lib/api.ts` (and `buildguard/frontend/src/lib/api.ts` — they're duplicates, fix both)

Add token management:
```typescript
export function getToken(): string | null {
    return localStorage.getItem('buildguard_token');
}
export function setToken(token: string): void {
    localStorage.setItem('buildguard_token', token);
}
export function clearToken(): void {
    localStorage.removeItem('buildguard_token');
}
```

Update `fetchApi` to include the token:
```typescript
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    // ... rest of fetch logic
}
```

Add auth API:
```typescript
export const authApi = {
    login: (email: string, password: string) =>
        fetchApi<{ token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    register: (data: { email: string; password: string; full_name: string; role: string }) =>
        fetchApi<{ token: string; user: any }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    me: () => fetchApi<any>('/auth/me'),
};
```

### 4.2 Fix ALL `any` Types in API Client

**Every single API method uses `fetchApi<any>` or `fetchApi<any[]>`.** The types already exist in `app/src/types/index.ts`. Use them.

Replace:
```typescript
list: () => fetchApi<any[]>('/projects/'),
```
With:
```typescript
list: () => fetchApi<{ items: Project[]; total: number }>('/projects/'),
```

Do this for every API method. Map the return types to the correct interfaces from `types/index.ts`.

### 4.3 Replace Demo Data with API Calls in Store

**File:** `app/src/store/projectStore.ts`

1. **Remove** `loadDemoData` and the `import` of `demoData` from `demo-data.ts`.
2. **Add auth state** to the store interface:
   ```typescript
   isAuthenticated: boolean;
   token: string | null;
   user: User | null;
   projects: Project[];
   ```
3. **Add auth actions:**
   ```typescript
   login: async (email: string, password: string) => {
       set({ loading: true, error: null });
       try {
           const { token, user } = await authApi.login(email, password);
           setToken(token);
           set({ isAuthenticated: true, token, user, loading: false });
       } catch (err) {
           set({ error: err instanceof Error ? err.message : 'Login failed', loading: false });
           throw err;
       }
   },
   logout: () => {
       clearToken();
       set({ isAuthenticated: false, token: null, user: null, project: null });
   },
   checkAuth: async () => {
       const token = getToken();
       if (!token) { set({ isAuthenticated: false }); return; }
       try {
           const user = await authApi.me();
           set({ isAuthenticated: true, token, user });
       } catch {
           clearToken();
           set({ isAuthenticated: false });
       }
   },
   ```
4. **Replace every store action** that mutates state with an async function that calls the backend API first, then updates local state with the response:
   - `startStage(stageId)` → call `stagesApi.start(stageId)` → update store
   - `submitStage(stageId)` → call `stagesApi.submit(stageId)` → update store
   - `approveStage(stageId)` → call `stagesApi.approve(stageId)` → update store
   - `updateChecklist(stageId, itemIndex, completed)` → call `stagesApi.updateChecklist(stageId, itemIndex, completed)` → update store
   - `acceptDeviation(id, reviewer, notes)` → call `deviationsApi.accept(id, reviewer, notes)` → update store
   - `rejectDeviation(id, reviewer, notes)` → call `deviationsApi.reject(id, reviewer, notes)` → update store
   - `rectifyDeviation(id, notes)` → call `deviationsApi.rectify(id, notes)` → update store
   - `requestPaymentRelease(gateId)` → call `paymentsApi.requestRelease(gateId)` → update store
   - `approvePayment(gateId)` → call `paymentsApi.approve(gateId)` → update store
5. **Add a `loadProject` action:**
   ```typescript
   loadProject: async (projectId: string) => {
       set({ loading: true, error: null });
       try {
           const project = await projectsApi.get(projectId);
           const stagesResp = await stagesApi.list(projectId);
           const devsResp = await deviationsApi.list(projectId);
           const paysResp = await paymentsApi.listGates(projectId);
           set({
               project,
               stages: stagesResp.items,
               deviations: devsResp.items,
               payments: paysResp.items,
               loading: false,
           });
       } catch (err) {
           set({ error: err instanceof Error ? err.message : 'Failed to load project', loading: false });
       }
   },
   ```

### 4.4 Create Login Page Component

**File to create:** `app/src/sections/LoginPage.tsx`

Create a login/register page with:
- Email and password inputs
- Login button that calls `store.login(email, password)`
- Register toggle that shows additional fields (full_name, role)
- Error display for failed login/register
- Loading spinner while authenticating

### 4.5 Create Project Selector Component

**File to create:** `app/src/sections/ProjectSelector.tsx`

After login, if the user has multiple projects, show a project selection screen. If they have zero projects, show a "Create Project" button that navigates to ProjectWizard.

### 4.6 Update App.tsx

**File:** `app/src/App.tsx`

Replace the `loadDemoData()` call with proper auth flow:
```tsx
const { isAuthenticated, project, loading, checkAuth, activeTab } = useProjectStore();

useEffect(() => {
    checkAuth();
}, [checkAuth]);

if (!isAuthenticated) {
    return <LoginPage />;
}

if (!project && activeTab !== 'new-project') {
    return <ProjectSelector />;
}

// ... rest of dashboard
```

### 4.7 Add Error Toast Notifications

The `sonner` library (toast notifications) is already in `package.json` but never used.

1. Add `<Toaster />` to `App.tsx` or `main.tsx`
2. In every store action's catch block, call `toast.error(message)`
3. On successful actions (stage approved, payment released), call `toast.success(message)`

### 4.8 Add Error Boundaries

Wrap each section component in an error boundary so that a crash in one section doesn't take down the whole dashboard.

### 4.9 Fix ProjectWizard — Actually Create Projects

**File:** `app/src/sections/ProjectWizard.tsx`

The "Create Project" button in the final step does nothing. Wire it to:
```typescript
const handleCreateProject = async () => {
    setLoading(true);
    try {
        const project = await projectsApi.create({
            name: formData.projectName,
            location: formData.location,
            // ... other fields
        });
        store.loadProject(project.id);
        toast.success('Project created successfully');
    } catch (err) {
        toast.error('Failed to create project');
    } finally {
        setLoading(false);
    }
};
```

### 4.10 Fix ModelUploader — Actually Upload Files

**File:** `app/src/sections/ModelUploader.tsx`

The upload is currently 100% simulated with fake progress. Replace with real multipart upload:
```typescript
const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', project.id);

    const response = await fetch(`${API_BASE_URL}/projects/${project.id}/upload-model`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData,
    });
    // ... handle response
};
```

---

## PHASE 5: Add Missing Backend Endpoints

### 5.1 Contractor Routes

**File to create:** `buildguard/backend/app/api/routes/contractors.py`

The frontend API client calls these but they don't exist:
- `GET /api/contractors/{id}/scorecard` — aggregate performance metrics from deviations, stages, and payments
- `GET /api/contractors/{id}/performance` — historical performance data

Implement by querying across multiple tables:
- **On-time completion rate:** Count stages completed before deadline vs. total
- **Deviation rate:** Count deviations per stage assigned to this contractor
- **Average rectification time:** Average time between deviation detection and resolution
- **Payment release rate:** Percentage of payment gates released on first request

Register the router in `main.py`.

### 5.2 Evidence Package Routes

**File to create:** `buildguard/backend/app/api/routes/evidence.py`

The frontend calls:
- `POST /api/evidence/project/{id}/generate` — collect all project data into a JSON package
- `GET /api/evidence/{id}/download` — download as a file

The evidence package should include: project details, all stages with checklists, all photos with metadata, all deviations with resolution history, all payment gates with approval status, thermal analysis results.

Register the router in `main.py`.

### 5.3 Deviation Update Endpoint

The frontend needs to update deviation status (accept/reject/rectify). Add to the existing deviations router:
- `PATCH /api/deviations/{id}` — accepts `{status, reviewer, notes, rectification_notes}`

---

## PHASE 6: Make Photo Upload Actually Work

### 6.1 Backend — Accept File Uploads

In captures routes, modify `POST /api/captures/photos` to accept `multipart/form-data`:
```python
@router.post("/photos")
async def upload_photo(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    stage_id: str = Form(None),
    latitude: float = Form(None),
    longitude: float = Form(None),
    heading: float = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Store file in MinIO
    object_name = f"{project_id}/{uuid.uuid4()}/{file.filename}"
    minio_client.put_object("buildguard", object_name, file.file, file.size)

    # Create database record
    photo = PhotoCapture(
        project_id=project_id,
        stage_id=stage_id,
        file_key=object_name,
        latitude=latitude,
        longitude=longitude,
        heading=heading,
        uploaded_by=current_user.id,
    )
    db.add(photo)
    await db.flush()

    # Generate pre-signed URL for viewing
    photo_url = minio_client.presigned_get_object("buildguard", object_name)
    return {"id": photo.id, "url": photo_url}
```

### 6.2 Frontend — Real Upload Flow

Replace the simulated upload in `PhotoGallery.tsx` and `ModelUploader.tsx` with real file uploads using `FormData`.

---

## PHASE 7: Database Migrations with Alembic

### 7.1 Initialize Alembic

```bash
cd buildguard/backend
alembic init alembic
```

### 7.2 Configure Alembic for Async

Edit `alembic/env.py` to use the async engine:
```python
from app.core.database import Base, engine
target_metadata = Base.metadata

# Use async run_migrations
```

### 7.3 Create Initial Migration

```bash
alembic revision --autogenerate -m "initial schema"
```

### 7.4 Remove create_all from main.py

Replace `Base.metadata.create_all` in `main.py` with a startup check that verifies tables exist (or runs migrations).

---

## PHASE 8: Write Tests

### 8.1 Backend Unit Tests

Create `buildguard/backend/tests/` directory with:

**`tests/conftest.py`:**
- Set up a test database (SQLite in-memory or test PostgreSQL)
- Create test client with `httpx.AsyncClient`
- Fixtures for: test user, test project, test stages

**`tests/test_stage_manager.py`:**
- Test creating 12 stages for a new project
- Test that Stage 2 cannot start until Stage 1 is approved
- Test stage lifecycle: NOT_STARTED → IN_PROGRESS → SUBMITTED → APPROVED
- Test checklist completion tracking

**`tests/test_payment_service.py`:**
- Test payment gate creation with correct percentage allocation
- Test payment blocking when stage not approved
- Test payment blocking when critical deviations exist
- Test payment blocking when open DLP tickets exist
- Test payment release when all conditions met

**`tests/test_deviation_detector.py`:**
- Test position deviation calculation (Euclidean distance)
- Test severity classification (cosmetic, minor, major, critical)
- Test tolerance rules for different element types (wall ±20mm, column ±15mm, etc.)

**`tests/test_thermal_analysis.py`:**
- Test cooling load calculation for Dubai climate
- Test heating load calculation for Al Ain climate
- Test solar gain factors by orientation
- Test ventilation load calculation

**`tests/test_auth.py`:**
- Test user registration
- Test login with correct credentials
- Test login with wrong password
- Test accessing protected route without token
- Test accessing protected route with expired token

**`tests/test_routes.py`:**
- Integration tests for every API endpoint
- Test creating a project → creating stages → uploading photos → detecting deviations → checking payment gates
- Test the full happy path end-to-end

### 8.2 Run Tests and Fix Failures

```bash
cd buildguard/backend
pytest tests/ -v --tb=short
```

Every test must pass. If any test reveals a bug in the application code, fix the bug.

---

## PHASE 9: Mobile App Fixes

### 9.1 Verify Mobile Service Layer

The mobile app in `buildguard-mobile/` has proper architecture but may have issues. Verify:
- `apiService.js` points to the correct backend URL
- `authService.js` login flow matches the new JWT auth endpoints
- `syncService.js` offline queue actually works

### 9.2 TypeScript Migration (Optional)

The mobile app is in plain JavaScript. Consider migrating to TypeScript for type safety, consistent with the web frontend.

---

## PHASE 10: Pro-Backend Integration

### 10.1 Connect Pro-Backend to Main Backend

The `buildguard-pro-backend/` is a separate FastAPI service for AI/3D processing. It needs to:
- Share authentication with the main backend (validate the same JWT tokens)
- Be added to `docker-compose.yml` as a service
- Be called from the main backend for:
  - Photo analysis (when a photo is uploaded, send it to pro-backend for AI analysis)
  - 3D model processing (when an IFC/GLB is uploaded, process it)

### 10.2 Fix Pro-Backend CORS

`buildguard-pro-backend/app/main.py` also has `allow_origins=["*"]`. Apply the same CORS fix as the main backend.

### 10.3 Fix Pro-Backend Storage

The pro-backend stores files in `/tmp/buildguard-uploads/` which is ephemeral. It should use MinIO (same as main backend) or a persistent Docker volume.

---

## Constraints

- **Do NOT rewrite the UI components** — the 50+ shadcn/ui components are well-built. Just wire them to real data.
- **Do NOT change the 5-pillar architecture** — it's sound. Just complete the integrations.
- **Do NOT add new frameworks or libraries** unless strictly necessary. The existing stack (FastAPI, React, Zustand, Three.js) is appropriate.
- **Keep Docker Compose working** — after every phase, verify `docker compose up --build` starts all services.
- **Preserve the `app/` and `buildguard/frontend/` directories** even though they're duplicates. Fix both consistently, or consolidate them into one and update references.

---

## Verification Checklist

After completing all phases, verify each of these works:

1. [ ] `docker compose up --build` starts all services without errors
2. [ ] Backend starts without crashing (Boolean import fixed)
3. [ ] Backend refuses to start with placeholder SECRET_KEY
4. [ ] CORS rejects requests from unauthorized origins
5. [ ] MinIO bucket is NOT publicly accessible
6. [ ] `POST /api/auth/register` creates a new user
7. [ ] `POST /api/auth/login` returns a valid JWT token
8. [ ] `GET /api/projects/` without token returns 401
9. [ ] `GET /api/projects/` with valid token returns user's projects
10. [ ] Creating a project auto-generates 12 construction stages
11. [ ] Stage lifecycle works: start → checklist → submit → approve
12. [ ] Stage 2 cannot be started until Stage 1 is approved
13. [ ] Photo upload stores the file in MinIO and returns a URL
14. [ ] Deviation check calculates correct Euclidean distance and severity
15. [ ] Payment gate blocks release when stage not approved
16. [ ] Payment gate blocks release when critical deviations exist
17. [ ] Payment gate allows release when all conditions met
18. [ ] Thermal analysis returns correct cooling load for Dubai climate
19. [ ] Frontend login page authenticates and shows dashboard
20. [ ] Frontend dashboard shows real data from PostgreSQL (not demo data)
21. [ ] Frontend stage actions persist to backend
22. [ ] Frontend deviation actions persist to backend
23. [ ] Frontend payment actions persist to backend
24. [ ] Frontend shows error toasts when API calls fail
25. [ ] All API endpoints return paginated results
26. [ ] Request logging shows method, path, status, duration
27. [ ] `pytest tests/ -v` passes all tests
28. [ ] Contractor scorecard endpoint returns aggregated metrics
29. [ ] Evidence package endpoint generates downloadable file
30. [ ] Mobile app can log in and list projects

---

## Order of Operations

Execute phases in this order. Do not skip ahead.

1. **Phase 0** — Fix blockers (Boolean import, secret key, debug mode)
2. **Phase 1** — Security hardening (CORS, MinIO, credentials, Dockerfile)
3. **Phase 2** — Code quality (double commits, logging, exceptions, indexes, pagination)
4. **Phase 3** — Authentication (auth module, user model, auth routes, protect routes)
5. **Phase 4** — Frontend-backend integration (API client, store, login page, wiring)
6. **Phase 5** — Missing endpoints (contractors, evidence, deviation update)
7. **Phase 6** — Photo upload (backend file handling, frontend upload)
8. **Phase 7** — Database migrations (Alembic)
9. **Phase 8** — Tests (unit + integration)
10. **Phase 9** — Mobile app fixes
11. **Phase 10** — Pro-backend integration

After each phase, run `docker compose up --build` and verify the relevant checklist items pass.
