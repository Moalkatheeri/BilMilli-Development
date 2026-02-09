# BuildGuard Pro v3 - Setup Guide

Complete setup guide for iOS-ready, fully integrated production build.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Mobile App Setup](#mobile-app-setup)
7. [Pro-Backend Setup](#pro-backend-setup)
8. [iOS Build & Deployment](#ios-build--deployment)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker & Docker Compose** (v2.0+)
- **Node.js** (v18+)
- **Python** (v3.11+)
- **Git**
- **Expo CLI** (for mobile): `npm install -g expo-cli`
- **EAS CLI** (for iOS builds): `npm install -g eas-cli`

### For iOS Development

- **macOS** (required for iOS builds)
- **Xcode** (v15+)
- **Apple Developer Account** (for physical device testing)

### System Resources

- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 20GB free space
- **Network**: Stable internet connection

---

## Quick Start

### 1. Clone and Navigate

```bash
cd /mnt/okcomputer/output/buildguard
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your values
nano .env
```

### 3. Start All Services

```bash
docker-compose up -d
```

### 4. Verify Installation

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# Check pro-backend
curl http://localhost:8001/api/v1/health
```

---

## Environment Configuration

### Required Variables

Edit `.env` file with your values:

```bash
# =============================================================================
# SECURITY - REQUIRED
# =============================================================================
# Generate a strong secret key (at least 32 characters)
SECRET_KEY=your-super-secret-key-change-this-in-production

# =============================================================================
# DATABASE - REQUIRED
# =============================================================================
POSTGRES_USER=buildguard
POSTGRES_PASSWORD=your-secure-database-password
POSTGRES_DB=buildguard

# =============================================================================
# OBJECT STORAGE (MinIO) - REQUIRED
# =============================================================================
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-secure-minio-password

# =============================================================================
# CORS - REQUIRED for frontend access
# =============================================================================
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:19006

# =============================================================================
# OPTIONAL - Advanced Configuration
# =============================================================================
DEBUG=false
LOG_LEVEL=INFO
PRO_BACKEND_URL=http://localhost:8001
```

### Generate Secret Key

```bash
# Generate a secure secret key
openssl rand -hex 32
```

---

## Backend Setup

### Local Development (without Docker)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql+asyncpg://buildguard:password@localhost:5432/buildguard
export SECRET_KEY=your-secret-key
export MINIO_ENDPOINT=localhost:9000
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minio-password

# Run migrations (auto-created on startup)
python -c "import asyncio; from app.core.database import init_db; asyncio.run(init_db())"

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

---

## Frontend Setup

### Local Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Access

- Development: http://localhost:5173
- Production build: http://localhost:3000 (via Docker)

---

## Mobile App Setup

### 1. Install Dependencies

```bash
cd buildguard-mobile

npm install
```

### 2. Configure API URL

The app uses dynamic configuration based on environment. For local development:

**iOS Simulator:**
```javascript
// Uses localhost:8000 automatically
```

**Physical iOS Device:**
Edit `src/config.js` and set your machine's local IP:
```javascript
const API_BASE_URL = 'http://192.168.1.100:8000/api';
```

**Android Emulator:**
```javascript
// Uses 10.0.2.2:8000 automatically (Android emulator gateway to host)
```

### 3. Start Development Server

```bash
# Start Expo
npx expo start

# iOS Simulator
i

# Android Emulator
a
```

### 4. Run on Physical Device

```bash
# Install Expo Go app from App Store/Google Play
# Scan QR code from terminal
```

---

## Pro-Backend Setup

The pro-backend is a separate service for AI/3D processing.

```bash
cd ../buildguard-pro-backend

# Build Docker image
docker build -t buildguard-pro-backend .

# Run
docker run -p 8001:8000 \
  -e SECRET_KEY=your-secret-key \
  -e DEBUG=false \
  buildguard-pro-backend
```

---

## iOS Build & Deployment

### 1. Configure EAS

```bash
cd buildguard-mobile

# Login to Expo
npx eas login

# Configure project
npx eas build:configure
```

### 2. Build for iOS Simulator

```bash
# Development build for simulator
npx eas build --platform ios --profile development
```

### 3. Build for Physical Device (Development)

```bash
# Requires Apple Developer account
npx eas build --platform ios --profile development:device
```

### 4. Build for App Store (Production)

```bash
# Production build
npx eas build --platform ios --profile production

# Submit to App Store
npx eas submit --platform ios
```

### 5. Local iOS Build (macOS only)

```bash
# Generate native iOS project
npx expo prebuild --platform ios

# Open in Xcode
cd ios
open BuildGuardPro.xcworkspace

# Build and run from Xcode
```

---

## Production Deployment

### 1. Server Requirements

- Ubuntu 22.04 LTS or similar
- Docker & Docker Compose
- Nginx (for reverse proxy)
- SSL certificates (Let's Encrypt)

### 2. Deploy with Docker Compose

```bash
# On production server
git clone <your-repo>
cd buildguard

# Create production .env
cp .env.example .env
# Edit with production values

# Start services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f
```

### 3. Configure Nginx

```nginx
server {
    listen 80;
    server_name api.buildguard.pro;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.buildguard.pro;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Database Backups

```bash
# Automated backup script
#!/bin/bash
docker exec buildguard-postgres pg_dump -U buildguard buildguard > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### Backend Issues

**Problem**: `SECRET_KEY is not set or uses a placeholder`

**Solution**: Set a strong SECRET_KEY in `.env`:
```bash
SECRET_KEY=$(openssl rand -hex 32)
```

**Problem**: Database connection failed

**Solution**: 
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs buildguard-postgres

# Reset database (WARNING: data loss)
docker-compose down -v
docker-compose up -d
```

### Mobile App Issues

**Problem**: `Cannot find module '@react-native-community/netinfo'`

**Solution**:
```bash
cd buildguard-mobile
npm install @react-native-community/netinfo@11.1.0
```

**Problem**: Network request failed on physical device

**Solution**: 
- Ensure device and server are on same network
- Use machine's local IP instead of localhost
- Check firewall settings

### iOS Build Issues

**Problem**: `Provisioning profile not found`

**Solution**:
```bash
# Register device with Apple Developer account
npx eas device:create

# Rebuild
npx eas build --platform ios --profile development:device
```

**Problem**: EAS build fails

**Solution**:
```bash
# Clear cache
npx eas build --platform ios --clear-cache

# Check credentials
npx eas credentials
```

### MinIO Issues

**Problem**: Cannot upload files

**Solution**:
```bash
# Check MinIO is running
docker ps | grep minio

# Access MinIO console
open http://localhost:9001
# Login with MINIO_ROOT_USER/MINIO_ROOT_PASSWORD
```

---

## API Documentation

Once running, access API docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Support

For issues and feature requests, please contact the development team.

---

## License

Proprietary - BuildGuard Pro
