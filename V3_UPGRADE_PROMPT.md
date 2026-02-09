# BuildGuard Pro v3 — iOS-Ready, Fully Integrated, Production Build

You are working on BuildGuard Pro, a construction oversight platform for UAE villa construction. The codebase is in `Buildguard v2 kimi 8-2/`. It has:

- **Main backend** (`buildguard/backend/`) — FastAPI + SQLAlchemy async + PostgreSQL
- **Pro-backend** (`buildguard-pro-backend/`) — FastAPI AI/ML services (Claude Vision photo analysis, IFC/GLB model processing, OpenCV floor plan analysis)
- **Web frontend** (`app/`) — React 19 + TypeScript + Vite + Tailwind + Zustand
- **Mobile app** (`buildguard-mobile/`) — React Native + Expo SDK 50

v2 fixed the major v1 issues (frontend-backend integration, JWT auth, pagination, error handling, tests). But a full review found **remaining bugs, security holes, and iOS blockers** that must be fixed before the mobile app can run on a real iPhone.

**Do ALL phases below in a single pass. Do not stop between phases. After completing everything, verify the full stack works and write the setup guide.**

---

## Phase 1: Fix iOS Blockers (Mobile App)

These 3 issues prevent the app from running on iOS.

### 1.1 Add missing `@react-native-community/netinfo` dependency

`buildguard-mobile/src/services/syncService.js` line 1 imports:
```javascript
import NetInfo from '@react-native-community/netinfo';
```
But this package is **NOT in `package.json`**. The sync service starts automatically on app load (30-second interval), so the app crashes immediately on launch.

**Fix:**
1. Add `@react-native-community/netinfo` to `package.json` dependencies (use version `11.1.0` which is compatible with Expo SDK 50)
2. Add the Expo config plugin to `app.json` plugins array:
```json
["@react-native-community/netinfo"]
```

### 1.2 Fix hardcoded `localhost` API URL

`buildguard-mobile/src/services/apiService.js` line 6:
```javascript
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
```
`localhost` does not resolve on a physical iPhone — it refers to the phone itself, not the Mac running the backend. This means zero API calls will work on a real device.

**Fix:**
1. Create a config file `buildguard-mobile/src/config.js`:
```javascript
import Constants from 'expo-constants';

// API Configuration
// Priority: Expo extra config > environment variable > default
const getApiBaseUrl = () => {
  // 1. Check Expo config (set in app.json or app.config.js)
  const expoApiUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (expoApiUrl) return expoApiUrl;

  // 2. Default for development
  // Use your Mac's local IP when testing on physical device
  // Use localhost when testing on iOS Simulator
  if (__DEV__) {
    return 'http://192.168.1.100:8000/api'; // Change to your Mac's IP
  }

  // 3. Production
  return 'https://api.buildguard.pro/api';
};

export const Config = {
  API_BASE_URL: getApiBaseUrl(),
  PRO_API_BASE_URL: getApiBaseUrl().replace(':8000', ':8001').replace('/api', '/api/v1'),
  WS_BASE_URL: getApiBaseUrl().replace('http', 'ws').replace('/api', '/ws'),
};

export default Config;
```

2. Update `apiService.js` to import from config:
```javascript
import Config from '../config';
const API_BASE_URL = Config.API_BASE_URL;
```

3. Add `expo-constants` to `package.json` if not already present

4. Add to `app.json` under `expo.extra`:
```json
"extra": {
  "eas": { "projectId": "buildguard-pro" },
  "apiBaseUrl": "http://192.168.1.100:8000/api"
}
```

5. Add a comment at the top of `config.js` explaining how to find your Mac's IP:
```javascript
// To find your Mac's local IP: System Settings > Network > Wi-Fi > Details > IP Address
// Or run: ipconfig getifaddr en0
// Replace 192.168.1.100 with your actual IP
```

### 1.3 Create EAS Build configuration

There is no `eas.json` file. Without it, `eas build` cannot produce an `.ipa` for TestFlight or App Store.

**Fix:**
1. Create `buildguard-mobile/eas.json`:
```json
{
  "cli": {
    "version": ">= 7.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "distribution": "app-store",
        "autoIncrement": true
      },
      "android": {
        "distribution": "play-store",
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

2. Add EAS CLI scripts to `package.json`:
```json
"scripts": {
  "start": "expo start",
  "ios": "expo start --ios",
  "android": "expo start --android",
  "build:dev": "eas build --profile development --platform ios",
  "build:preview": "eas build --profile preview --platform ios",
  "build:prod": "eas build --profile production --platform ios",
  "submit:ios": "eas submit --platform ios"
}
```

### 1.4 Create placeholder asset files

`app.json` references `./assets/icon.png`, `./assets/splash.png`, `./assets/adaptive-icon.png`, and `./assets/favicon.png`. If these files don't exist, the build will fail.

**Fix:**
1. Create the `buildguard-mobile/assets/` directory if it doesn't exist
2. Generate simple placeholder images using a script or create them programmatically:
   - `icon.png` — 1024x1024 PNG with "BG" text on dark blue (#0A1628) background
   - `splash.png` — 1284x2778 PNG with "BuildGuard Pro" text on dark blue background
   - `adaptive-icon.png` — 1024x1024 PNG (same as icon)
   - `favicon.png` — 48x48 PNG with "BG" text
3. If you cannot generate images, create a script `buildguard-mobile/scripts/generate-assets.js` that uses `canvas` or `sharp` to generate them, and document that the user should run it or replace with real assets

---

## Phase 2: Fix Unprotected Backend Endpoints

Six endpoint groups are missing `Depends(get_current_user)`. Anyone with network access can read project data, export evidence packages, and view contractor performance.

### 2.1 Fix `projects.py` — GET `/` missing auth

File: `buildguard/backend/app/api/routes/projects.py`, the `list_projects` function (around line 51):
```python
@router.get("/", response_model=PaginatedProjectListResponse)
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
```
**Fix:** Add `current_user = Depends(get_current_user)` and filter projects to only return those the user has access to (owned projects, or all for admin role).

### 2.2 Fix `evidence.py` — ALL 3 endpoints missing auth

File: `buildguard/backend/app/api/routes/evidence.py` — none of the 3 routes have auth:
- `POST /project/{project_id}/generate` (line 25)
- `GET /{package_id}/download` (line 195)
- `POST /project/{project_id}/share-teyaseer` (line 214)

**Fix:** Add `current_user = Depends(get_current_user)` to all 3 endpoints. For `generate` and `share-teyaseer`, also add `await check_project_access(current_user, project_id, db)`. For `download`, verify the user has access to the project that generated the package.

### 2.3 Fix `contractors.py` — both endpoints missing auth

File: `buildguard/backend/app/api/routes/contractors.py`:
- `GET /{contractor_id}/scorecard` (line 15) — no auth
- `GET /{contractor_id}/performance` (line 136) — no auth

**Fix:** Add `current_user = Depends(get_current_user)` to both endpoints.

### 2.4 Fix `deviations.py` — 3 endpoints missing auth

File: `buildguard/backend/app/api/routes/deviations.py`:
- `POST /check-position` (line 24) — no auth
- `GET /critical/project/{project_id}` — no auth
- `GET /{deviation_id}` — no auth

**Fix:** Add auth dependency. For project-scoped endpoints, add `check_project_access`. For `check-position`, add auth and validate the user has access to the referenced project.

### 2.5 Fix `captures.py` — 2 endpoints missing auth

File: `buildguard/backend/app/api/routes/captures.py`:
- `POST /sessions` (line 44) — no auth
- `GET /sessions/{session_id}` (line 64) — no auth

**Fix:** Add `current_user = Depends(get_current_user)` to both. For `POST /sessions`, verify the user has access to the project. For `GET /sessions/{session_id}`, look up the session's project and verify access.

### 2.6 Fix `analysis.py` — `POST /` and `GET /{analysis_id}` missing auth

File: `buildguard/backend/app/api/routes/analysis.py`:
- `POST /` (line 25) — no auth
- `GET /{analysis_id}` — no auth

**Fix:** Add auth dependency and project access checks.

---

## Phase 3: Fix Evidence Package Storage

File: `buildguard/backend/app/api/routes/evidence.py` line 22:
```python
generated_packages: Dict[str, Dict[str, Any]] = {}
```
Evidence packages are stored in a Python dict. They vanish on server restart and leak memory.

**Fix:**
1. Create a new SQLAlchemy model `EvidencePackage` in `buildguard/backend/app/models/evidence.py`:
```python
from sqlalchemy import Column, String, DateTime, JSON, Text, ForeignKey
from app.core.database import Base
import uuid
from datetime import datetime

class EvidencePackage(Base):
    __tablename__ = "evidence_packages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    generated_by = Column(String, ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    format = Column(String, default="json")
    data = Column(JSON, nullable=False)
    summary = Column(JSON, nullable=False)
```

2. Import it in `app/models/__init__.py`

3. Rewrite `evidence.py` routes to store and retrieve packages from the database instead of the in-memory dict

---

## Phase 4: Fix Frontend Docker Build

The `buildguard/docker-compose.yml` line 113-120 builds the frontend from `./frontend`:
```yaml
frontend:
  build: ./frontend
```
But `buildguard/frontend/` has only a Dockerfile, nginx.conf, and config files — **no `src/` directory**. The actual React source code is in the top-level `app/` directory. The Docker build will fail because there is no source to compile.

**Fix — Option A (move source into buildguard/frontend/):**
1. Copy the entire contents of `app/` into `buildguard/frontend/` (package.json, src/, etc.)
2. Remove the standalone `app/` directory
3. This makes the `buildguard/` directory self-contained

**Fix — Option B (fix docker-compose to use app/):**
1. Change docker-compose.yml to:
```yaml
frontend:
  build:
    context: ../app
    dockerfile: Dockerfile
```
2. Create a `Dockerfile` in `app/` that copies source, builds, and serves via nginx
3. Copy the existing `nginx.conf` from `buildguard/frontend/` into `app/`

**Choose Option A** — it's cleaner for the monorepo structure. Make sure the `buildguard/frontend/Dockerfile` works with the copied source. The Dockerfile already expects `package*.json` and a `dist/` output from `npm run build`, so just ensure the source is there.

---

## Phase 5: Wire Pro-Backend to Mobile App

The pro-backend runs on port 8001 and provides AI photo analysis (Claude Vision) and 3D model processing. But the mobile app only talks to the main backend on port 8000. AI features won't work from mobile.

### 5.1 Add pro-backend proxy to main backend

The cleanest solution is to proxy AI requests through the main backend so the mobile app only needs one API base URL.

Add new routes in `buildguard/backend/app/api/routes/` — create `ai_proxy.py`:
```python
"""Proxy routes to pro-backend AI/ML services."""
from fastapi import APIRouter, Depends, UploadFile, File
from app.core.auth import get_current_user
from app.core.pro_backend_client import ProBackendClient

router = APIRouter()

@router.post("/photos/analyze")
async def analyze_photo(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Proxy photo analysis to pro-backend."""
    client = ProBackendClient()
    result = await client.analyze_photo(file)
    return result

@router.post("/models/upload")
async def upload_model(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Proxy model upload to pro-backend."""
    client = ProBackendClient()
    result = await client.upload_model(file)
    return result

@router.get("/models/{model_id}/status")
async def model_status(
    model_id: str,
    current_user = Depends(get_current_user)
):
    """Proxy model status check to pro-backend."""
    client = ProBackendClient()
    return await client.get_model_status(model_id)

@router.post("/floorplan/analyze")
async def analyze_floorplan(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Proxy floor plan analysis to pro-backend."""
    client = ProBackendClient()
    result = await client.analyze_floorplan(file)
    return result
```

There is already a `pro_backend_client.py` in `buildguard/backend/app/core/`. Verify it has methods for `analyze_photo`, `upload_model`, `get_model_status`, and `analyze_floorplan`. If not, add them. The client should use `httpx.AsyncClient` to call the pro-backend at `http://pro-backend:8000/api/v1/` (Docker internal network).

Register the new router in `main.py` with prefix `/api/ai`.

### 5.2 Update mobile app to use AI endpoints

Update `buildguard-mobile/src/services/apiService.js`:
- Change `analyzePhoto()` to call `/api/ai/photos/analyze` (through main backend proxy)
- Change model upload to call `/api/ai/models/upload`
- Add `analyzeFloorplan()` method calling `/api/ai/floorplan/analyze`

### 5.3 Wire FloorPlanAnalyzer to real API

In `app/src/sections/FloorPlanAnalyzer.tsx`, replace the hardcoded `mockAnalysis` object with a real API call to `/api/ai/floorplan/analyze`. Upload the floor plan image, get real analysis results from the pro-backend's OpenCV service, and display them.

---

## Phase 6: Add `.env.example` and Environment Config

### 6.1 Create `buildguard/.env.example`:
```bash
# PostgreSQL
POSTGRES_USER=buildguard
POSTGRES_PASSWORD=change-me-to-a-strong-password
POSTGRES_DB=buildguard

# MinIO Object Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-me-to-a-strong-password

# Backend
SECRET_KEY=change-me-to-a-random-string-at-least-32-characters-long
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
DEBUG=false
LOG_LEVEL=INFO

# Pro-Backend (AI Services)
ANTHROPIC_API_KEY=sk-ant-your-key-here
PRO_BACKEND_URL=http://pro-backend:8000

# Redis
REDIS_URL=redis://redis:6379/0
```

### 6.2 Create `buildguard/.env` (for local dev, gitignored):
Same content as `.env.example` but with working default values for local development. Use a generated random `SECRET_KEY` (at least 32 chars).

### 6.3 Add `CORS_ORIGINS` to docker-compose backend environment:
```yaml
backend:
  environment:
    CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3000,http://localhost:5173}
```

### 6.4 Add `PRO_BACKEND_URL` to docker-compose backend environment:
```yaml
backend:
  environment:
    PRO_BACKEND_URL: ${PRO_BACKEND_URL:-http://pro-backend:8000}
```

---

## Phase 7: Add Form Validation to Mobile App

### 7.1 Email validation
In `buildguard-mobile/src/screens/LoginScreen.js`, add email regex validation:
```javascript
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```
Show an inline error below the email input if invalid.

### 7.2 Password strength
On the register form, enforce:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
Show a password strength indicator (weak/medium/strong) using color-coded text.

### 7.3 Full name validation
Require at least 2 characters for the full name field during registration.

---

## Phase 8: Update Tests for New Code

### 8.1 Add tests for the new auth-protected endpoints
In `buildguard/backend/tests/test_routes.py`, add tests that verify:
- Unauthenticated requests to `/evidence/project/{id}/generate` return 401
- Unauthenticated requests to `/contractors/{id}/scorecard` return 401
- Unauthenticated requests to GET `/projects/` return 401
- Authenticated requests with valid project access succeed

### 8.2 Add test for EvidencePackage model
In `buildguard/backend/tests/`, add `test_evidence.py`:
- Test generating an evidence package
- Test downloading it
- Test that the package persists (not in-memory)

### 8.3 Add test for AI proxy routes
In `buildguard/backend/tests/`, add `test_ai_proxy.py`:
- Mock the pro-backend responses
- Test photo analysis proxy
- Test model upload proxy

---

## Phase 9: Write the Setup Guide

After completing ALL phases above, create `SETUP_GUIDE.md` in the project root with the following sections:

### Section 1: Prerequisites
List everything needed:
- macOS (version)
- Xcode (version, how to install from App Store)
- Node.js (version, recommend using nvm)
- Python 3.11+
- Docker Desktop for Mac
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Expo Go app (install from App Store on iPhone for quick testing)
- Apple Developer Account (for TestFlight/App Store — note: Expo Go testing doesn't require this)

### Section 2: Clone and Configure
```bash
git clone <repo-url>
cd BilMilli-Development/Buildguard\ v2\ kimi\ 8-2/
```

### Section 3: Start the Backend (Docker)
Step-by-step:
```bash
cd buildguard
cp .env.example .env
# Edit .env — set SECRET_KEY to a random 32+ char string
# Edit .env — set ANTHROPIC_API_KEY if you want AI photo analysis
docker compose up --build -d
# Wait for health checks
docker compose ps  # All services should show "healthy"
# Verify backend
curl http://localhost:8000/health
curl http://localhost:8001/health
```

### Section 4: Run the Web Frontend (Development)
```bash
cd app
npm install
npm run dev
# Open http://localhost:5173
# Register a new account, create a project
```

### Section 5: Run on iOS Simulator (Expo Go)
Step-by-step:
```bash
cd buildguard-mobile
npm install

# Start Expo dev server
npx expo start --ios
# This opens the iOS Simulator and loads the app via Expo Go
# The Simulator uses localhost, so the default API URL works
```

### Section 6: Run on Physical iPhone (Expo Go)
Step-by-step:
1. Find your Mac's local IP:
```bash
ipconfig getifaddr en0
# Example output: 192.168.1.42
```
2. Update `buildguard-mobile/src/config.js` — replace `192.168.1.100` with your actual IP
3. Make sure your iPhone and Mac are on the **same Wi-Fi network**
4. Install "Expo Go" from the App Store on your iPhone
5. Start the dev server:
```bash
cd buildguard-mobile
npx expo start
```
6. Scan the QR code shown in the terminal with your iPhone camera
7. The app opens in Expo Go

### Section 7: Build for TestFlight (EAS Build)
Step-by-step:
1. Create an Expo account at https://expo.dev
2. Log in:
```bash
npx eas login
```
3. Configure the project:
```bash
npx eas build:configure
```
4. Edit `eas.json` — fill in your Apple Team ID and App Store Connect app ID
5. Build:
```bash
npx eas build --profile preview --platform ios
# This builds in the cloud and returns a download link
# For App Store: use --profile production
```
6. Submit to TestFlight:
```bash
npx eas submit --platform ios
```

### Section 8: Build Locally with Xcode (Advanced)
Step-by-step for generating a native Xcode project:
```bash
cd buildguard-mobile
npx expo prebuild --platform ios
# This generates the ios/ directory with Xcode project files
cd ios
pod install
open BuildGuardPro.xcworkspace
# In Xcode: select your signing team, target device, and hit Run
```

### Section 9: Troubleshooting
Cover common issues:
- "Network request failed" → Check Mac IP, check same Wi-Fi, check Docker is running
- "Unable to resolve module" → Run `npm install`, clear cache with `npx expo start --clear`
- Camera not working in Simulator → Camera requires physical device, use Expo Go on iPhone
- "No bundle URL present" → Kill the Metro bundler, restart with `npx expo start --clear`
- Backend returns 500 → Check `docker compose logs backend` for errors
- MinIO upload fails → Verify MinIO is healthy: `curl http://localhost:9000/minio/health/live`

### Section 10: Architecture Overview
Include a simple ASCII diagram showing:
```
iPhone (Expo Go / TestFlight)
  │
  ├── Wi-Fi ──→ Mac (192.168.x.x)
  │                │
  │                ├── :8000 → Backend API (FastAPI)
  │                │     ├── PostgreSQL (:5432)
  │                │     ├── Redis (:6379)
  │                │     ├── MinIO (:9000)
  │                │     └── Pro-Backend (:8001) — AI/ML
  │                │
  │                └── :5173 → Web Frontend (Vite dev)
  │
  └── App Store ──→ Production API (api.buildguard.pro)
```

---

## Constraints

- Do NOT rewrite the UI — it's good. Just fix the integration bugs.
- Do NOT change the 5-pillar architecture — just complete the wiring.
- Do NOT add features beyond what's listed above. Focus on making existing features work on iOS.
- Keep the Docker Compose setup working — `docker compose up` must start all services.
- Use the existing tech stack. No new frameworks.
- After completing ALL phases, verify:
  1. `docker compose up --build` starts without errors
  2. `curl http://localhost:8000/health` returns OK
  3. The web frontend loads at `http://localhost:5173` with login
  4. `cd buildguard-mobile && npm install` succeeds with no missing deps
  5. `npx expo start --ios` launches in the Simulator without crashes
  6. The mobile app can log in and load a project
  7. Photo capture works (on device or mock)
  8. All backend tests pass: `cd buildguard/backend && pytest tests/ -v`

---

## Definition of Done

The app is "done" when:
1. `npm install` in `buildguard-mobile/` has zero missing dependency errors
2. `npx expo start --ios` launches without crashes (NetInfo resolved)
3. Physical iPhone can connect to backend via local IP (config.js working)
4. `eas.json` exists with dev/preview/production profiles
5. All backend endpoints require authentication (zero public data endpoints)
6. Evidence packages persist in PostgreSQL (not in-memory)
7. `docker compose up --build` produces a working frontend container
8. Mobile app can call AI photo analysis through the main backend proxy
9. FloorPlanAnalyzer uses real API instead of mock data
10. `.env.example` exists with all required variables documented
11. Login form validates email format and password strength
12. All existing + new tests pass
13. `SETUP_GUIDE.md` exists and is complete with iOS Simulator, physical device, and TestFlight instructions
