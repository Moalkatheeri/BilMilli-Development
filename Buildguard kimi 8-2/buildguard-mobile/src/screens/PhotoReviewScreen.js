import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useProject } from '../context/ProjectContext';
import { apiService } from '../services/apiService';
import { storageService } from '../services/storageService';
import { syncService } from '../services/syncService';

export default function PhotoReviewScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { photo, projectId: initialProjectId } = route.params;
  const { projects, currentProject, analyzePhoto } = useProject();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedProject, setSelectedProject] = useState(currentProject);
  const [selectedStage, setSelectedStage] = useState(null);
  const [notes, setNotes] = useState('');
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (photo) {
      // Auto-analyze the photo
      handleAnalyze();
    }
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const metadata = {
        projectId: selectedProject?.id,
        stageId: selectedStage?.id,
        ...photo.metadata,
      };
      
      const result = await analyzePhoto(photo.uri, metadata);
      setAnalysisResult(result.analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Error', 'Could not analyze photo. You can still upload it.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const metadata = {
        projectId: selectedProject?.id,
        stageId: selectedStage?.id,
        notes,
        ...photo.metadata,
      };
      
      // Try immediate upload
      try {
        await apiService.uploadPhoto(photo.uri, metadata);
        Alert.alert('Success', 'Photo uploaded successfully!');
        navigation.goBack();
      } catch (error) {
        // Queue for offline sync
        await syncService.queuePhotoUpload(photo.uri, metadata);
        Alert.alert(
          'Queued for Upload',
          'Photo saved locally and will upload when connection is available.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Photo?',
      'This photo will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => {
            storageService.deleteFile(photo.localUri);
            navigation.goBack();
          }
        },
      ]
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#FF4444';
      case 'major': return '#FF8800';
      case 'minor': return '#FFCC00';
      default: return '#00D4AA';
    }
  };

  const getQualityScoreColor = (score) => {
    if (score >= 90) return '#00D4AA';
    if (score >= 70) return '#FFCC00';
    return '#FF4444';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView}>
        {/* Photo Preview */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" />
          
          {/* Photo Metadata Overlay */}
          <View style={styles.metadataOverlay}>
            <Text style={styles.metadataText}>
              {photo.width} × {photo.height}
            </Text>
            {photo.metadata?.location && (
              <Text style={styles.metadataText}>
                📍 {photo.metadata.location.latitude.toFixed(6)}, {photo.metadata.location.longitude.toFixed(6)}
              </Text>
            )}
          </View>
        </View>

        {/* AI Analysis Results */}
        {isAnalyzing ? (
          <View style={styles.analysisLoading}>
            <ActivityIndicator size="large" color="#00D4AA" />
            <Text style={styles.analysisLoadingText}>AI Analyzing Photo...</Text>
            <Text style={styles.analysisSubtext}>
              Checking for quality issues, construction errors, and compliance
            </Text>
          </View>
        ) : analysisResult ? (
          <View style={styles.analysisContainer}>
            <View style={styles.analysisHeader}>
              <Text style={styles.analysisTitle}>AI Analysis Results</Text>
              <View style={[
                styles.qualityBadge,
                { backgroundColor: getQualityScoreColor(analysisResult.qualityScore) }
              ]}>
                <Text style={styles.qualityScore}>{analysisResult.qualityScore}</Text>
              </View>
            </View>

            {/* Detected Issues */}
            {analysisResult.issues && analysisResult.issues.length > 0 && (
              <View style={styles.issuesSection}>
                <Text style={styles.sectionTitle}>Detected Issues</Text>
                {analysisResult.issues.map((issue, index) => (
                  <View key={index} style={styles.issueCard}>
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(issue.severity) }
                    ]}>
                      <Text style={styles.severityText}>
                        {issue.severity.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.issueContent}>
                      <Text style={styles.issueTitle}>{issue.title}</Text>
                      <Text style={styles.issueDescription}>{issue.description}</Text>
                      {issue.recommendation && (
                        <Text style={styles.issueRecommendation}>
                          💡 {issue.recommendation}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Detected Elements */}
            {analysisResult.detectedElements && analysisResult.detectedElements.length > 0 && (
              <View style={styles.elementsSection}>
                <Text style={styles.sectionTitle}>Detected Elements</Text>
                <View style={styles.elementsList}>
                  {analysisResult.detectedElements.map((element, index) => (
                    <View key={index} style={styles.elementChip}>
                      <Text style={styles.elementText}>{element}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Construction Stage */}
            {analysisResult.detectedStage && (
              <View style={styles.stageSection}>
                <Text style={styles.sectionTitle}>Detected Stage</Text>
                <Text style={styles.detectedStage}>{analysisResult.detectedStage}</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Project Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assign to Project</Text>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowProjectSelector(!showProjectSelector)}
          >
            <Text style={styles.selectorText}>
              {selectedProject ? selectedProject.name : 'Select a project'}
            </Text>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>
          
          {showProjectSelector && (
            <View style={styles.dropdown}>
              {projects.map(project => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedProject(project);
                    setShowProjectSelector(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{project.name}</Text>
                  {selectedProject?.id === project.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={4}
            placeholder="Add notes about this photo..."
            placeholderTextColor="#8B9EB0"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Location Details */}
        {photo.metadata?.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Details</Text>
            <View style={styles.locationDetails}>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Latitude:</Text>
                <Text style={styles.locationValue}>
                  {photo.metadata.location.latitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Longitude:</Text>
                <Text style={styles.locationValue}>
                  {photo.metadata.location.longitude.toFixed(6)}
                </Text>
              </View>
              {photo.metadata.location.accuracy && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Accuracy:</Text>
                  <Text style={styles.locationValue}>
                    ±{Math.round(photo.metadata.location.accuracy)}m
                  </Text>
                </View>
              )}
              {photo.metadata.heading && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Heading:</Text>
                  <Text style={styles.locationValue}>
                    {Math.round(photo.metadata.heading)}°
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.discardButton]}
          onPress={handleDiscard}
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.uploadButton, isUploading && styles.uploadingButton]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#0A1628" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload Photo</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  scrollView: {
    flex: 1,
  },
  
  photoContainer: {
    backgroundColor: '#000000',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 300,
  },
  metadataOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  
  analysisLoading: {
    padding: 30,
    alignItems: 'center',
  },
  analysisLoadingText: {
    color: '#00D4AA',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  analysisSubtext: {
    color: '#8B9EB0',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  
  analysisContainer: {
    padding: 16,
    backgroundColor: '#111D2E',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qualityBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityScore: {
    color: '#0A1628',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  sectionTitle: {
    color: '#8B9EB0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  
  issuesSection: {
    marginTop: 16,
  },
  issueCard: {
    backgroundColor: '#0A1628',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  issueDescription: {
    color: '#8B9EB0',
    fontSize: 14,
    marginBottom: 8,
  },
  issueRecommendation: {
    color: '#00D4AA',
    fontSize: 13,
  },
  
  elementsSection: {
    marginTop: 16,
  },
  elementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  elementChip: {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  elementText: {
    color: '#00D4AA',
    fontSize: 13,
  },
  
  stageSection: {
    marginTop: 16,
  },
  detectedStage: {
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  selector: {
    backgroundColor: '#111D2E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  selectorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  selectorArrow: {
    color: '#8B9EB0',
    fontSize: 12,
  },
  dropdown: {
    backgroundColor: '#111D2E',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  checkmark: {
    color: '#00D4AA',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  notesInput: {
    backgroundColor: '#111D2E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  
  locationDetails: {
    backgroundColor: '#111D2E',
    borderRadius: 12,
    padding: 16,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  locationLabel: {
    color: '#8B9EB0',
    fontSize: 14,
  },
  locationValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#0A1628',
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  discardButton: {
    backgroundColor: '#1E3A5F',
  },
  discardButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#00D4AA',
    flex: 2,
  },
  uploadingButton: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#0A1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
