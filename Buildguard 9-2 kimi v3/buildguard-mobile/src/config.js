/**
 * BuildGuard Pro Mobile - Configuration
 * Handles dynamic API URL configuration for different environments
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get extra config from app.json
const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

// iOS Simulator uses localhost, physical device needs host machine IP
// For development, use 10.0.2.2 for Android emulator, localhost for iOS simulator
// For physical devices, you'll need to use your machine's local IP
const getDefaultApiUrl = () => {
  if (Platform.OS === 'ios') {
    // iOS Simulator can use localhost
    // Physical device needs the host machine's IP address
    // You can override this by setting API_BASE_URL environment variable
    return 'http://localhost:8000/api';
  } else if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host
    return 'http://10.0.2.2:8000/api';
  }
  return 'http://localhost:8000/api';
};

// Determine the environment
const getEnvironment = () => {
  if (__DEV__) {
    return 'development';
  }
  // Check if running in EAS build
  if (extra.eas) {
    return 'production';
  }
  return 'development';
};

// Get the appropriate API base URL
export const getApiBaseUrl = () => {
  const env = getEnvironment();
  
  // Priority: 1. Environment variable, 2. Extra config, 3. Default
  if (extra.apiBaseUrl) {
    if (typeof extra.apiBaseUrl === 'string') {
      return extra.apiBaseUrl;
    }
    // Object with environment-specific URLs
    if (extra.apiBaseUrl[env]) {
      return extra.apiBaseUrl[env];
    }
  }
  
  return getDefaultApiUrl();
};

// Export configuration object
export const config = {
  apiBaseUrl: getApiBaseUrl(),
  environment: getEnvironment(),
  isDevelopment: getEnvironment() === 'development',
  isProduction: getEnvironment() === 'production',
  
  // Feature flags
  features: {
    offlineMode: true,
    aiAnalysis: true,
    thermalAnalysis: true,
    paymentGates: true,
  },
  
  // Sync configuration
  sync: {
    interval: 30000, // 30 seconds
    maxRetries: 3,
    batchSize: 10,
  },
  
  // Upload configuration
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    chunkSize: 5 * 1024 * 1024, // 5MB chunks for large files
    timeout: 300000, // 5 minutes
  },
};

export default config;
