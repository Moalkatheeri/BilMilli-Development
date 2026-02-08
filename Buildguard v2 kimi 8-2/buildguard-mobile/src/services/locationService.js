import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';

class LocationService {
  constructor() {
    this.motionSubscription = null;
    this.lastHeading = 0;
    this.lastOrientation = null;
  }

  async requestPermissions() {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (locationStatus !== 'granted') {
      throw new Error('Location permission not granted');
    }

    return true;
  }

  async getCurrentPosition(options = {}) {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        ...options,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };
    } catch (error) {
      console.error('Error getting position:', error);
      throw error;
    }
  }

  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        return {
          street: address.street,
          city: address.city,
          region: address.region,
          country: address.country,
          postalCode: address.postalCode,
          formattedAddress: [
            address.street,
            address.city,
            address.region,
            address.country,
          ].filter(Boolean).join(', '),
        };
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Start listening to device orientation
  async startOrientationTracking() {
    try {
      const isAvailable = await DeviceMotion.isAvailableAsync();
      if (!isAvailable) {
        console.warn('Device motion not available');
        return false;
      }

      // Set update interval (in ms)
      DeviceMotion.setUpdateInterval(100);

      this.motionSubscription = DeviceMotion.addListener((motionData) => {
        this.lastOrientation = {
          pitch: motionData.rotation?.beta || 0, // X-axis rotation
          roll: motionData.rotation?.gamma || 0, // Y-axis rotation
          yaw: motionData.rotation?.alpha || 0,  // Z-axis rotation
          
          // Acceleration (without gravity)
          accelerationX: motionData.acceleration?.x || 0,
          accelerationY: motionData.acceleration?.y || 0,
          accelerationZ: motionData.acceleration?.z || 0,
          
          // Acceleration including gravity
          accelerationIncludingGravityX: motionData.accelerationIncludingGravity?.x || 0,
          accelerationIncludingGravityY: motionData.accelerationIncludingGravity?.y || 0,
          accelerationIncludingGravityZ: motionData.accelerationIncludingGravity?.z || 0,
        };
      });

      return true;
    } catch (error) {
      console.error('Error starting orientation tracking:', error);
      return false;
    }
  }

  stopOrientationTracking() {
    if (this.motionSubscription) {
      this.motionSubscription.remove();
      this.motionSubscription = null;
    }
  }

  getLastOrientation() {
    return this.lastOrientation;
  }

  // Get compass heading
  async getHeading() {
    try {
      const heading = await Location.getHeadingAsync();
      this.lastHeading = heading.trueHeading || heading.magHeading;
      return {
        trueHeading: heading.trueHeading,
        magneticHeading: heading.magHeading,
        accuracy: heading.accuracy,
      };
    } catch (error) {
      console.error('Error getting heading:', error);
      return null;
    }
  }

  // Watch position changes
  async watchPosition(callback, options = {}) {
    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 10,
        ...options,
      },
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      }
    );
  }

  // Get complete capture metadata for a photo
  async getCaptureMetadata() {
    try {
      const [position, headingData] = await Promise.all([
        this.getCurrentPosition(),
        this.getHeading().catch(() => null),
      ]);

      const address = await this.getAddressFromCoordinates(
        position.latitude,
        position.longitude
      );

      return {
        location: {
          latitude: position.latitude,
          longitude: position.longitude,
          altitude: position.altitude,
          accuracy: position.accuracy,
        },
        address,
        heading: headingData?.trueHeading || headingData?.magneticHeading || null,
        orientation: this.lastOrientation,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch (error) {
      console.error('Error getting capture metadata:', error);
      return {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        error: error.message,
      };
    }
  }

  // Calculate distance between two coordinates (in meters)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Check if position is within a geofence
  isWithinGeofence(lat, lon, centerLat, centerLon, radiusMeters) {
    const distance = this.calculateDistance(lat, lon, centerLat, centerLon);
    return distance <= radiusMeters;
  }
}

export const locationService = new LocationService();
