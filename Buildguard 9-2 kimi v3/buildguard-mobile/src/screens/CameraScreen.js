import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useProject } from '../context/ProjectContext';
import { cameraService } from '../services/cameraService';
import { locationService } from '../services/locationService';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const navigation = useNavigation();
  const { currentProject } = useProject();
  const cameraRef = useRef(null);
  
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);
  const [isCapturing, setIsCapturing] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [arOverlay, setArOverlay] = useState(null);
  
  // Animation values
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    requestPermissions();
    startLocationTracking();
    startAnimations();
    
    return () => {
      locationService.stopOrientationTracking();
    };
  }, []);

  useEffect(() => {
    if (currentProject && locationData) {
      const overlay = cameraService.generateAROverlay(
        currentProject.location,
        locationData,
        currentProject.currentStage
      );
      setArOverlay(overlay);
    }
  }, [currentProject, locationData]);

  const requestPermissions = async () => {
    const granted = await cameraService.requestPermissions();
    setHasPermission(granted);
    
    if (granted) {
      await locationService.requestPermissions();
      await locationService.startOrientationTracking();
    }
  };

  const startLocationTracking = async () => {
    try {
      const position = await locationService.getCurrentPosition();
      setLocationData(position);
      
      // Watch for location updates
      locationService.watchPosition((newPosition) => {
        setLocationData(newPosition);
      });
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const startAnimations = () => {
    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for capture button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const takePicture = async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    cameraService.setCameraRef(cameraRef.current);
    
    try {
      const photo = await cameraService.takePhoto();
      
      navigation.navigate('PhotoReview', {
        photo,
        projectId: currentProject?.id,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      console.error('Capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  const toggleFlash = () => {
    const modes = [
      Camera.Constants.FlashMode.off,
      Camera.Constants.FlashMode.on,
      Camera.Constants.FlashMode.auto,
    ];
    const currentIndex = modes.indexOf(flashMode);
    setFlashMode(modes[(currentIndex + 1) % modes.length]);
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case Camera.Constants.FlashMode.on:
        return '⚡';
      case Camera.Constants.FlashMode.auto:
        return 'A';
      default:
        return '○';
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No access to camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        ratio="16:9"
        autoFocus={Camera.Constants.AutoFocus.on}
      >
        {/* AR Overlay Layer */}
        <View style={styles.overlayContainer}>
          {/* Grid Lines */}
          <View style={styles.gridContainer}>
            <View style={styles.gridLineVertical} />
            <View style={styles.gridLineVertical} />
            <View style={styles.gridLineHorizontal} />
            <View style={styles.gridLineHorizontal} />
          </View>

          {/* Scan Line */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, height * 0.6],
                  }),
                }],
              },
            ]}
          />

          {/* Corner Markers */}
          <View style={[styles.cornerMarker, styles.cornerTopLeft]} />
          <View style={[styles.cornerMarker, styles.cornerTopRight]} />
          <View style={[styles.cornerMarker, styles.cornerBottomLeft]} />
          <View style={[styles.cornerMarker, styles.cornerBottomRight]} />

          {/* Location Info Panel */}
          {locationData && (
            <View style={styles.locationPanel}>
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>
                  {locationData.accuracy ? `±${Math.round(locationData.accuracy)}m` : 'GPS'}
                </Text>
              </View>
              {arOverlay && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationIcon}>📏</Text>
                  <Text style={styles.locationText}>
                    {arOverlay.isAtSite ? 'At Site' : arOverlay.distanceFormatted}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Project Context */}
          {currentProject && (
            <View style={styles.projectPanel}>
              <Text style={styles.projectName}>{currentProject.name}</Text>
              <Text style={styles.projectStage}>
                {currentProject.currentStage?.name || 'No active stage'}
              </Text>
            </View>
          )}

          {/* Stage Indicator */}
          {currentProject?.currentStage && (
            <View style={styles.stageIndicator}>
              <View style={styles.stageDot} />
              <Text style={styles.stageText}>
                Stage {currentProject.currentStage.number}: {currentProject.currentStage.status}
              </Text>
            </View>
          )}

          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Text style={styles.controlButtonText}>{getFlashIcon()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
              <Text style={styles.controlButtonText}>↻</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Gallery Thumbnail */}
            <TouchableOpacity style={styles.galleryButton}>
              <View style={styles.galleryThumbnail}>
                <Text style={styles.galleryText}>🖼</Text>
              </View>
            </TouchableOpacity>

            {/* Capture Button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
                onPress={takePicture}
                disabled={isCapturing}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </Animated.View>

            {/* Project Selector */}
            <TouchableOpacity 
              style={styles.projectButton}
              onPress={() => navigation.navigate('Projects')}
            >
              <Text style={styles.projectButtonText}>
                {currentProject ? currentProject.name.substring(0, 2).toUpperCase() : 'P'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* AI Analysis Hint */}
          <View style={styles.aiHint}>
            <Text style={styles.aiHintText}>
              AI will analyze this photo for quality issues
            </Text>
          </View>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // Grid
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-around',
    flexDirection: 'row',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
  },
  
  // Scan Line
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0, 212, 170, 0.6)',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  
  // Corner Markers
  cornerMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00D4AA',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 100,
    left: 40,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 100,
    right: 40,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 180,
    left: 40,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 180,
    right: 40,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  
  // Location Panel
  locationPanel: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Project Panel
  projectPanel: {
    position: 'absolute',
    top: 100,
    left: 20,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
    maxWidth: 200,
  },
  projectName: {
    color: '#00D4AA',
    fontSize: 14,
    fontWeight: 'bold',
  },
  projectStage: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Stage Indicator
  stageIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.5)',
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4AA',
    marginRight: 8,
  },
  stageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Controls
  topControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  galleryThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryText: {
    fontSize: 24,
  },
  
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonActive: {
    backgroundColor: 'rgba(0, 212, 170, 0.5)',
    borderColor: '#00D4AA',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  
  projectButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 170, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  projectButtonText: {
    color: '#0A1628',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  aiHint: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  aiHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  
  // Permission
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: '#00D4AA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#0A1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
