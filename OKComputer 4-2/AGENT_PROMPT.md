# BuildGuard Pro — Make It Real

You are working on BuildGuard Pro, a construction oversight platform for UAE villa construction. The codebase is in `OKComputer 4-2/`. It has a FastAPI backend (`buildguard/backend/`) and a React/TypeScript frontend (`app/`). Right now both sides exist but are completely disconnected — the frontend runs entirely on hardcoded demo data and never talks to the backend. Your job is to make this a working, end-to-end application.

---

## Current State

- **Backend:** FastAPI + SQLAlchemy async + PostgreSQL. Has models, schemas, routes, and services for 5 pillars (stages, captures, thermal analysis, deviations, payments). Has bugs and is missing auth.
- **Frontend:** React 19 + TypeScript + Vite + Tailwind + Zustand. Beautiful UI with 50+ components. All data comes from `loadDemoData()` in the Zustand store. The API client (`lib/api.ts`) exists but is never called.
- **Infrastructure:** Docker Compose with PostgreSQL, Redis, MinIO, backend, and frontend (Nginx). Not production-hardened.

---

## Phase 1: Fix Backend Bugs (do this first)

### 1.1 Fix the `Boolean` import crash
In `buildguard/backend/app/models/deviation.py` line 4, add `Boolean` to the SQLAlchemy import:
```python
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Integer, Text, JSON, Boolean
```
Without this, the backend crashes on startup.

### 1.2 Fix double-commit in database session
In `buildguard/backend/app/core/database.py`, the `get_db()` function auto-commits. But route handlers also call `db.commit()`. Remove the explicit `db.commit()` calls from all route handlers in `buildguard/backend/app/api/routes/` — let `get_db()` handle commits and rollbacks.

### 1.3 Remove hardcoded secret defaults
In `buildguard/backend/app/core/config.py`:
- Remove the default value for `secret_key`. Require it from environment.
- Set `debug: bool = False` as default.
- Keep all other defaults for local dev convenience, but add a startup check in `main.py` that refuses to start if `secret_key` is still the placeholder or empty.

### 1.4 Lock down CORS
In `buildguard/backend/app/main.py`, change `allow_origins=["*"]` to read from a `CORS_ORIGINS` environment variable (comma-separated list), defaulting to `["http://localhost:3000", "http://localhost:5173"]` for local dev.

---

## Phase 2: Add Authentication

### 2.1 Implement JWT auth
Create `buildguard/backend/app/core/auth.py` with:
- `create_access_token(user_id: str, role: str)` using python-jose (already in requirements)
- `get_current_user` FastAPI dependency that extracts and validates the JWT from `Authorization: Bearer <token>` header
- A simple User model with fields: `id`, `email`, `password_hash`, `full_name`, `role` (owner/consultant/contractor/admin), `project_ids` (list of associated projects)
- Password hashing with passlib/bcrypt (already in requirements)

### 2.2 Auth routes
Create `buildguard/backend/app/api/routes/auth.py` with:
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — returns JWT token
- `GET /api/auth/me` — returns current user

### 2.3 Protect routes
Add `Depends(get_current_user)` to all existing route handlers. The user should have access only to projects listed in their `project_ids`.

---

## Phase 3: Connect Frontend to Backend (this is the big one)

### 3.1 Replace demo data with API calls
In `app/src/store/projectStore.ts`:
- Remove `loadDemoData` and the `demoData` import entirely
- Replace every action with an async function that calls the API client (`lib/api.ts`) and updates the store with the response
- Add `loading` and `error` handling for every async action
- Example pattern:
```typescript
loadProject: async (projectId: string) => {
  set({ loading: true, error: null });
  try {
    const project = await projectsApi.get(projectId);
    const stages = await stagesApi.list(projectId);
    const deviations = await deviationsApi.list(projectId);
    const payments = await paymentsApi.listGates(projectId);
    set({ project, stages, deviations, payments, loading: false });
  } catch (err) {
    set({ error: err instanceof ApiError ? err.message : 'Failed to load project', loading: false });
  }
},
```

### 3.2 Add auth to the API client
In `app/src/lib/api.ts`:
- Store the JWT token (localStorage or a Zustand auth store)
- Add `Authorization: Bearer <token>` header to every `fetchApi` call
- Add an auth API object:
```typescript
export const authApi = {
  login: (email: string, password: string) => fetchApi<{token: string}>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: any) => fetchApi<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => fetchApi<any>('/auth/me'),
};
```

### 3.3 Add a login page
Create a login/register page. If no JWT token is stored, show the login page instead of the dashboard. After successful login, store the token and load the project data.

### 3.4 Fix the App.tsx initialization
In `app/src/App.tsx`:
- Remove `loadDemoData()` from the useEffect
- Instead, check for stored auth token. If present, call `loadProject()`. If not, show login.
- Add a project selection screen if the user has multiple projects, or a "Create Project" flow if they have none.

### 3.5 Wire up every store action to the API
Every action in the Zustand store that mutates data must call the backend API first, then update local state with the response. Specifically:
- `startStage` → `POST /api/stages/{id}/start`
- `submitStage` → `POST /api/stages/{id}/submit`
- `approveStage` → `POST /api/stages/{id}/approve`
- `updateChecklist` → `PATCH /api/stages/{id}/checklist`
- `acceptDeviation` → `PATCH /api/deviations/{id}` with status update
- `rejectDeviation` → same
- `rectifyDeviation` → same
- `requestPaymentRelease` → `POST /api/payments/gates/{id}/request-release`
- `approvePayment` → `POST /api/payments/gates/{id}/approve`

### 3.6 Add proper TypeScript types
In `app/src/lib/api.ts`, replace every `any` with proper types that match the backend Pydantic schemas. The types already exist in `app/src/types/index.ts` — use them.

---

## Phase 4: Add Missing Backend Endpoints

### 4.1 Contractor routes
The frontend API client calls `/contractors/{id}/scorecard` and `/contractors/{id}/performance` but no backend router exists. Create `buildguard/backend/app/api/routes/contractors.py` with these endpoints. They should aggregate data from deviations, stages, and payments to compute:
- On-time completion rate
- Deviation rate
- Average rectification time
- Payment release rate

Register the router in `main.py`.

### 4.2 Evidence package routes
The frontend calls `/evidence/project/{id}/generate` and `/evidence/{id}/download`. Create `buildguard/backend/app/api/routes/evidence.py` that:
- Generates a JSON evidence package containing all project data (stages, photos, deviations, payments, thermal analysis)
- Returns it as a downloadable file

Register the router in `main.py`.

### 4.3 Add missing deviation update endpoint
The frontend needs to update deviation status (accept/reject/rectify). Add a `PATCH /api/deviations/{id}` endpoint to the existing deviations router that accepts status changes, review notes, and rectification notes.

---

## Phase 5: Add Error Handling and Logging

### 5.1 Backend logging
Add Python `logging` throughout the backend:
- Log every API request (method, path, user, response status)
- Log all service-layer operations (stage started, payment blocked, deviation detected)
- Log all errors with stack traces
- Use structured logging (JSON format)

### 5.2 Custom exceptions
Create `buildguard/backend/app/core/exceptions.py` with domain exceptions:
- `ProjectNotFoundError`
- `StageNotReadyError`
- `PaymentBlockedError`
- `UnauthorizedError`

Add a global exception handler in `main.py` that converts these to proper HTTP responses.

### 5.3 Frontend error handling
- Add toast notifications (sonner is already installed) for all API errors
- Add error boundaries around each section component
- Show inline error states when data fails to load
- Add retry buttons on failed loads

---

## Phase 6: Database and Infrastructure

### 6.1 Add Alembic migrations
Alembic is in requirements but not configured. Initialize it:
```
cd buildguard/backend
alembic init alembic
```
Configure it to use the async engine. Create an initial migration from the current models. Remove `Base.metadata.create_all` from `main.py` — use migrations instead.

### 6.2 Add database indexes
Add indexes to all models for commonly queried columns:
- `project_id` on every child table (stages, captures, deviations, payments, tickets)
- `status` on stages, deviations, payments, tickets
- `severity` on deviations
- `created_at` on all tables

### 6.3 Add pagination
All list endpoints should accept `skip` and `limit` query parameters (default limit=50). Return `{ items: [], total: int }` instead of bare arrays.

### 6.4 Fix Docker Compose secrets
Move all passwords/keys in `docker-compose.yml` to a `.env` file. Add `.env` to `.gitignore`. Create a `.env.example` with placeholder values.

### 6.5 Fix MinIO bucket policy
Remove `mc policy set public` from the MinIO init command. Use authenticated access with pre-signed URLs for photo uploads/downloads.

---

## Phase 7: Make Photo Upload Actually Work

### 7.1 Backend file handling
In the captures service/routes:
- Accept multipart file uploads for photos
- Store files in MinIO using the existing MinIO config
- Generate pre-signed URLs for photo retrieval
- Store the MinIO object key in the `photo_captures` table

### 7.2 Frontend upload flow
In the `ModelUploader` and `PhotoGallery` sections:
- Use actual file input and FormData upload to the backend
- Show upload progress
- Display photos from pre-signed URLs returned by the backend

---

## Phase 8: Tests

### 8.1 Backend tests
Write pytest tests for:
- All 5 service classes (stage_manager, capture_service, thermal_analysis, deviation_detector, payment_service)
- All API routes (use httpx AsyncClient with a test database)
- Auth flow (register, login, protected routes)
- Payment blocking logic (the most critical business logic)

Use pytest-asyncio and an in-memory SQLite or test PostgreSQL database.

### 8.2 Frontend tests
This is lower priority but if time allows:
- Test the Zustand store actions
- Test the API client error handling

---

## Constraints

- Do NOT rewrite the UI — it's good. Just wire it to real data.
- Do NOT change the 5-pillar architecture — it's sound. Just complete the implementations.
- Do NOT add features beyond what's already designed. Focus on making the existing features work end-to-end.
- Keep the Docker Compose setup working — everything should start with `docker compose up`.
- Use the existing tech stack. Do not add new frameworks or libraries unless strictly necessary.
- After every phase, verify the app starts and the modified features work by running `docker compose up --build` and testing manually or with the test suite.

---

## Definition of Done

The app is "done" when:
1. `docker compose up` starts all services without errors
2. A user can register, log in, and get a JWT token
3. A user can create a project and see it on the dashboard with real data from PostgreSQL
4. Stage lifecycle works end-to-end: start → checklist → submit → approve
5. Photos can be uploaded and stored in MinIO, then viewed in the gallery
6. Deviations can be detected, reviewed, accepted/rejected, and rectified
7. Payment gates correctly block/unblock based on stage status, deviations, and DLP tickets
8. Thermal analysis can be triggered and results displayed
9. All API errors show user-friendly messages in the frontend
10. The test suite passes
