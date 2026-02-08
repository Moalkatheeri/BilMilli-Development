import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { locationService } from './locationService';
import { storageService } from './storageService';

class CameraService {
  constructor() {
    this.camera = null;
    this.hasPermission = null;
  }

  async requestPermissions() {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    
    this.hasPermission = cameraStatus === 'granted' && mediaStatus === 'granted';
    return this.hasPermission;
  }

  setCameraRef(ref) {
    this.camera = ref;
  }

  async takePhoto(options = {}) {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    try {
      // Get location and orientation data before taking photo
      const metadataPromise = locationService.getCaptureMetadata();

      // Take the photo
      const photo = await this.camera.takePictureAsync({
        quality: 0.95,
        base64: false,
        exif: true,
        skipProcessing: false,
        ...options,
      });

      // Get metadata
      const metadata = await metadataPromise;

      // Combine photo with metadata
      const enrichedPhoto = {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        exif: photo.exif,
        metadata,
      };

      // Save to local storage
      const saved = await storageService.savePhotoLocally(photo.uri, metadata);
      
      return {
        ...enrichedPhoto,
        localUri: saved.localUri,
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  async saveToGallery(uri) {
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      return asset;
    } catch (error) {
      console.error('Error saving to gallery:', error);
      throw error;
    }
  }

  // Get available camera ratios
  async getAvailablePictureSizes(ratio) {
    if (!this.camera) return [];
    try {
      return await this.camera.getAvailablePictureSizesAsync(ratio);
    } catch (error) {
      console.error('Error getting picture sizes:', error);
      return [];
    }
  }

  // Get supported flash modes
  getSupportedFlashModes() {
    return [
      Camera.Constants.FlashMode.off,
      Camera.Constants.FlashMode.on,
      Camera.Constants.FlashMode.auto,
      Camera.Constants.FlashMode.torch,
    ];
  }

  // Get supported white balance modes
  getSupportedWhiteBalance() {
    return [
      Camera.Constants.WhiteBalance.auto,
      Camera.Constants.WhiteBalance.sunny,
      Camera.Constants.WhiteBalance.cloudy,
      Camera.Constants.WhiteBalance.shadow,
      Camera.Constants.WhiteBalance.fluorescent,
      Camera.Constants.WhiteBalance.incandescent,
    ];
  }

  // Generate AR overlay data for construction context
  generateAROverlay(projectLocation, currentPosition, stageInfo) {
    if (!projectLocation || !currentPosition) return null;

    const distance = locationService.calculateDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      projectLocation.latitude,
      projectLocation.longitude
    );

    const isAtSite = distance < 100; // Within 100 meters

    return {
      distance,
      isAtSite,
      distanceFormatted: distance < 1000 
        ? `${Math.round(distance)}m` 
        : `${(distance / 1000).toFixed(1)}km`,
      direction: this.calculateDirection(
        currentPosition.latitude,
        currentPosition.longitude,
        projectLocation.latitude,
        projectLocation.longitude
      ),
      stageInfo,
      accuracy: currentPosition.accuracy,
    };
  }

  calculateDirection(lat1, lon1, lat2, lon2) {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    const bearing = ((θ * 180) / Math.PI + 360) % 360;

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    
    return {
      bearing: Math.round(bearing),
      cardinal: directions[index],
    };
  }

  // Get camera settings for construction documentation
  getOptimalSettings() {
    return {
      flashMode: Camera.Constants.FlashMode.auto,
      whiteBalance: Camera.Constants.WhiteBalance.auto,
      autoFocus: Camera.Constants.AutoFocus.on,
      ratio: '16:9',
      quality: 0.95,
    };
  }

  // Process photo for construction analysis
  async preprocessPhoto(uri) {
    // This could include:
    // - Image enhancement
    // - Compression optimization
    // - Adding watermarks
    // - Generating thumbnails
    
    return {
      uri,
      processed: true,
      timestamp: new Date().toISOString(),
    };
  }
}

export const cameraService = new CameraService();
