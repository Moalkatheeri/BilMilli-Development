import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useProject } from '../context/ProjectContext';

const { width } = Dimensions.get('window');

const stageColors = {
  pending: '#8B9EB0',
  in_progress: '#FFCC00',
  completed: '#00D4AA',
  blocked: '#FF4444',
};

export default function ProjectDetailScreen() {
  const route = useRoute();
  const { projectId } = route.params;
  const { fetchProject, fetchStages, currentProject, stages, isLoading } = useProject();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    await Promise.all([
      fetchProject(projectId),
      fetchStages(projectId),
    ]);
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Progress Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Construction Progress</Text>
        <View style={styles.progressCircle}>
          <Text style={styles.progressPercent}>{currentProject?.progress || 0}%</Text>
        </View>
        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatValue}>
              {stages.filter(s => s.status === 'completed').length}
            </Text>
            <Text style={styles.progressStatLabel}>Completed</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatValue}>
              {stages.filter(s => s.status === 'in_progress').length}
            </Text>
            <Text style={styles.progressStatLabel}>In Progress</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatValue}>
              {stages.filter(s => s.status === 'pending').length}
            </Text>
            <Text style={styles.progressStatLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Budget Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Budget Overview</Text>
        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetLabel}>Total Budget</Text>
            <Text style={styles.budgetValue}>
              AED {(currentProject?.budget / 1000000).toFixed(2)}M
            </Text>
          </View>
          <View>
            <Text style={styles.budgetLabel}>Spent</Text>
            <Text style={styles.budgetValueSpent}>
              AED {(currentProject?.spent / 1000000).toFixed(2)}M
            </Text>
          </View>
        </View>
        <View style={styles.budgetBar}>
          <View 
            style={[
              styles.budgetFill, 
              { width: `${Math.min((currentProject?.spent / currentProject?.budget) * 100, 100)}%` }
            ]} 
          />
        </View>
        <Text style={styles.budgetRemaining}>
          AED {((currentProject?.budget - currentProject?.spent) / 1000000).toFixed(2)}M remaining
        </Text>
      </View>

      {/* Timeline Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>
        <View style={styles.timelineRow}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Start Date</Text>
            <Text style={styles.timelineValue}>
              {currentProject?.startDate 
                ? new Date(currentProject.startDate).toLocaleDateString() 
                : 'Not set'}
            </Text>
          </View>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Expected Completion</Text>
            <Text style={styles.timelineValue}>
              {currentProject?.expectedCompletion 
                ? new Date(currentProject.expectedCompletion).toLocaleDateString() 
                : 'Not set'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStages = () => (
    <View style={styles.tabContent}>
      {stages.map((stage, index) => (
        <View key={stage.id} style={styles.stageCard}>
          <View style={styles.stageHeader}>
            <View style={styles.stageNumber}>
              <Text style={styles.stageNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stageInfo}>
              <Text style={styles.stageName}>{stage.name}</Text>
              <Text style={styles.stageDescription}>{stage.description}</Text>
            </View>
            <View style={[
              styles.stageStatus,
              { backgroundColor: stageColors[stage.status] || '#8B9EB0' }
            ]}>
              <Text style={styles.stageStatusText}>
                {stage.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          
          {stage.progress > 0 && (
            <View style={styles.stageProgress}>
              <View style={styles.stageProgressBar}>
                <View 
                  style={[
                    styles.stageProgressFill, 
                    { width: `${stage.progress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.stageProgressText}>{stage.progress}%</Text>
            </View>
          )}

          {stage.checklist && (
            <View style={styles.checklist}>
              {stage.checklist.map((item, idx) => (
                <View key={idx} style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>
                    {item.completed ? '✓' : '○'}
                  </Text>
                  <Text style={[
                    styles.checklistText,
                    item.completed && styles.checklistTextCompleted
                  ]}>
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {stage.status === 'completed' && stage.approvedBy && (
            <View style={styles.approvalInfo}>
              <Text style={styles.approvalText}>
                ✓ Approved by {stage.approvedBy} on {new Date(stage.approvedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderPhotos = () => (
    <View style={styles.tabContent}>
      <View style={styles.photosGrid}>
        {currentProject?.photos?.map((photo, index) => (
          <View key={index} style={styles.photoThumbnail}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>📷</Text>
            </View>
            <Text style={styles.photoDate}>
              {new Date(photo.date).toLocaleDateString()}
            </Text>
          </View>
        ))}
        {(!currentProject?.photos || currentProject.photos.length === 0) && (
          <View style={styles.emptyPhotos}>
            <Text style={styles.emptyPhotosText}>No photos yet</Text>
            <Text style={styles.emptyPhotosSubtext}>
              Take photos to document construction progress
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Loading project...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{currentProject?.name}</Text>
        <Text style={styles.headerSubtitle}>
          {currentProject?.location?.address}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'stages', 'photos'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'stages' && renderStages()}
        {activeTab === 'photos' && renderPhotos()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8B9EB0',
    marginTop: 16,
  },
  header: {
    padding: 20,
    backgroundColor: '#111D2E',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#8B9EB0',
    fontSize: 14,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#111D2E',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00D4AA',
  },
  tabText: {
    color: '#8B9EB0',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00D4AA',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  
  // Cards
  card: {
    backgroundColor: '#111D2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  
  // Progress
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 20,
  },
  progressPercent: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    color: '#00D4AA',
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressStatLabel: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Budget
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetLabel: {
    color: '#8B9EB0',
    fontSize: 12,
  },
  budgetValue: {
    color: '#00D4AA',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  budgetValueSpent: {
    color: '#FF6B6B',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  budgetBar: {
    height: 8,
    backgroundColor: '#1E3A5F',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  budgetRemaining: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  
  // Timeline
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineItem: {
    flex: 1,
  },
  timelineLabel: {
    color: '#8B9EB0',
    fontSize: 12,
  },
  timelineValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Stages
  stageCard: {
    backgroundColor: '#111D2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stageNumberText: {
    color: '#00D4AA',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stageDescription: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 2,
  },
  stageStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stageProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  stageProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1E3A5F',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stageProgressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 2,
  },
  stageProgressText: {
    color: '#8B9EB0',
    fontSize: 12,
    marginLeft: 8,
    width: 40,
    textAlign: 'right',
  },
  checklist: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checklistIcon: {
    color: '#00D4AA',
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  checklistText: {
    color: '#8B9EB0',
    fontSize: 13,
  },
  checklistTextCompleted: {
    color: '#FFFFFF',
    textDecorationLine: 'line-through',
  },
  approvalInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  approvalText: {
    color: '#00D4AA',
    fontSize: 12,
  },
  
  // Photos
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoThumbnail: {
    width: (width - 48) / 3,
    margin: 4,
  },
  photoPlaceholder: {
    aspectRatio: 1,
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 24,
  },
  photoDate: {
    color: '#8B9EB0',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyPhotos: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyPhotosText: {
    color: '#8B9EB0',
    fontSize: 16,
  },
  emptyPhotosSubtext: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 8,
  },
});
