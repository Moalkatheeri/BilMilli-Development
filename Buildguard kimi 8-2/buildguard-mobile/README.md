# BuildGuard Pro - Mobile App

React Native mobile application with Expo for construction site documentation using AR photo capture with GPS and orientation metadata.

## Features

### AR Camera with Construction Context
- Real-time AR overlay with grid lines and scan animation
- GPS coordinates capture with accuracy display
- Device orientation tracking (pitch, roll, yaw)
- Compass heading capture
- Site proximity indicator
- Project context display

### AI Photo Analysis
- Automatic photo analysis using Claude Vision API
- Quality scoring (0-100)
- Construction issue detection
- Element recognition (walls, columns, beams, etc.)
- Stage detection
- Prevention recommendations

### Offline Support
- Automatic offline queue for all actions
- Background sync when connection restored
- Local photo storage
- Draft saving
- Cache management

### Project Management
- Project dashboard with progress tracking
- Stage-by-stage construction tracking
- Payment gate management
- Variation order workflow
- Photo gallery with metadata

## Tech Stack

- **Framework**: React Native with Expo SDK 50
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **Storage**: AsyncStorage + SecureStore
- **Camera**: expo-camera
- **Location**: expo-location
- **Sensors**: expo-sensors (DeviceMotion)
- **File System**: expo-file-system
- **Media Library**: expo-media-library

## Installation

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Configuration

Update the API base URL in `src/services/apiService.js`:

```javascript
const API_BASE_URL = 'https://api.buildguard.pro/api/v1';
// For local development: 'http://localhost:8000/api/v1'
```

## Permissions

The app requires the following permissions:

- **Camera**: For capturing construction photos
- **Location**: For GPS geotagging
- **Motion Sensors**: For orientation capture
- **Photo Library**: For saving documentation
- **Storage**: For offline data

## Project Structure

```
src/
├── screens/           # Screen components
│   ├── CameraScreen.js
│   ├── PhotoReviewScreen.js
│   ├── ProjectsScreen.js
│   ├── ProjectDetailScreen.js
│   ├── StagesScreen.js
│   ├── ProfileScreen.js
│   ├── OfflineQueueScreen.js
│   └── LoginScreen.js
├── components/        # Reusable components
├── services/          # API and service layers
│   ├── apiService.js
│   ├── authService.js
│   ├── storageService.js
│   ├── syncService.js
│   ├── cameraService.js
│   └── locationService.js
├── context/           # React Context providers
│   ├── AuthContext.js
│   └── ProjectContext.js
└── utils/             # Utility functions
```

## Key Features

### AR Photo Capture
- Grid overlay for alignment
- Corner markers for framing
- Scan line animation
- Location accuracy display
- Project context panel
- Stage indicator

### Photo Metadata
- GPS coordinates (latitude, longitude, altitude)
- Location accuracy
- Compass heading
- Device orientation (pitch, roll, yaw)
- Timestamp
- Timezone
- Project/Stage association

### Offline Queue
- Automatic queuing when offline
- Retry mechanism with exponential backoff
- Manual sync trigger
- Queue management UI
- Failed item handling

## Build for Production

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# EAS Build (recommended)
eas build --platform ios
eas build --platform android
```

## License

Proprietary - BuildGuard Pro
