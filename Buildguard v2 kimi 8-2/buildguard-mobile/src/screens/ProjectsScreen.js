import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProject } from '../context/ProjectContext';

const statusColors = {
  planning: '#8B9EB0',
  active: '#00D4AA',
  on_hold: '#FFCC00',
  completed: '#00AAFF',
  cancelled: '#FF4444',
};

const statusLabels = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ProjectsScreen() {
  const navigation = useNavigation();
  const { 
    projects, 
    isLoading, 
    fetchProjects, 
    setCurrentProject,
    getProjectStats 
  } = useProject();
  
  const [refreshing, setRefreshing] = useState(false);
  const stats = getProjectStats();

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects(true);
    setRefreshing(false);
  };

  const handleProjectPress = (project) => {
    setCurrentProject(project);
    navigation.navigate('ProjectDetail', { projectId: project.id });
  };

  const renderProjectCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.projectCard}
      onPress={() => handleProjectPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectLocation}>{item.location?.address || 'No location'}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: statusColors[item.status] || '#8B9EB0' }
        ]}>
          <Text style={styles.statusText}>{statusLabels[item.status] || item.status}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressValue}>{item.progress || 0}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${item.progress || 0}%` }
          ]} />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Current Stage</Text>
          <Text style={styles.footerValue}>
            {item.currentStage?.name || 'Not started'}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Budget</Text>
          <Text style={styles.footerValue}>
            {item.budget ? `AED ${(item.budget / 1000000).toFixed(2)}M` : 'N/A'}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Photos</Text>
          <Text style={styles.footerValue}>{item.photoCount || 0}</Text>
        </View>
      </View>

      {item.hasAlerts && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠️ Issues require attention</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.totalProjects || 0}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.activeProjects || 0}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.completedProjects || 0}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>
          {stats?.totalValue ? `AED ${(stats.totalValue / 1000000).toFixed(1)}M` : '0'}
        </Text>
        <Text style={styles.statLabel}>Total Value</Text>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        renderItem={renderProjectCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D4AA"
            colors={['#00D4AA']}
          />
        }
        ListHeaderComponent={renderStats}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyTitle}>No Projects Yet</Text>
            <Text style={styles.emptyText}>
              Create your first project to start tracking your construction
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#111D2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  statValue: {
    color: '#00D4AA',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Project Card
  projectCard: {
    backgroundColor: '#111D2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  projectLocation: {
    color: '#8B9EB0',
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#8B9EB0',
    fontSize: 12,
  },
  progressValue: {
    color: '#00D4AA',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1E3A5F',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 3,
  },
  
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  footerItem: {
    alignItems: 'center',
  },
  footerLabel: {
    color: '#8B9EB0',
    fontSize: 11,
    marginBottom: 4,
  },
  footerValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  alertBanner: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  alertText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#8B9EB0',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#0A1628',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
