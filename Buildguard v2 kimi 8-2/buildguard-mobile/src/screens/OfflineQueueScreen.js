import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { storageService } from '../services/storageService';
import { syncService } from '../services/syncService';

const typeIcons = {
  photo_upload: '📸',
  stage_start: '▶️',
  stage_submit: '📤',
  stage_approval: '✓',
  checklist_update: '☑️',
  payment_request: '💳',
  payment_approval: '💰',
  deviation_accept: '✅',
  deviation_reject: '❌',
  deviation_rectify: '🔧',
  model_upload: '🏗️',
};

const typeLabels = {
  photo_upload: 'Photo Upload',
  stage_start: 'Start Stage',
  stage_submit: 'Submit Stage',
  stage_approval: 'Approve Stage',
  checklist_update: 'Update Checklist',
  payment_request: 'Request Payment',
  payment_approval: 'Approve Payment',
  deviation_accept: 'Accept Deviation',
  deviation_reject: 'Reject Deviation',
  deviation_rectify: 'Rectify Deviation',
  model_upload: '3D Model Upload',
};

const statusColors = {
  pending: '#FFCC00',
  processing: '#00AAFF',
  completed: '#00D4AA',
  failed: '#FF4444',
};

export default function OfflineQueueScreen() {
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadQueue();
    
    // Subscribe to sync events
    const unsubscribe = syncService.addListener((event) => {
      if (event.type === 'sync_complete' || event.type === 'sync_error') {
        loadQueue();
        setIsSyncing(false);
      }
    });

    return unsubscribe;
  }, []);

  const loadQueue = async () => {
    const items = await storageService.getOfflineQueue();
    setQueue(items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await syncService.forceSync();
  };

  const handleClearCompleted = () => {
    Alert.alert(
      'Clear Completed',
      'Remove all completed items from the queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            const items = await storageService.getOfflineQueue();
            const incomplete = items.filter(item => item.status !== 'completed');
            await storageService.clearOfflineQueue();
            for (const item of incomplete) {
              await storageService.addToOfflineQueue(item);
            }
            loadQueue();
          }
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      'Remove all items from the queue? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await storageService.clearOfflineQueue();
            loadQueue();
          }
        },
      ]
    );
  };

  const handleRemoveItem = (itemId) => {
    Alert.alert(
      'Remove Item',
      'Remove this item from the queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            await storageService.removeFromOfflineQueue(itemId);
            loadQueue();
          }
        },
      ]
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.queueItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemType}>
          <Text style={styles.typeIcon}>{typeIcons[item.type] || '📦'}</Text>
          <View>
            <Text style={styles.typeLabel}>
              {typeLabels[item.type] || item.type}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: statusColors[item.status || 'pending'] }
        ]}>
          <Text style={styles.statusText}>
            {(item.status || 'pending').toUpperCase()}
          </Text>
        </View>
      </View>

      {item.data && (
        <View style={styles.itemDetails}>
          {item.data.projectId && (
            <Text style={styles.detailText}>
              Project: {item.data.projectId}
            </Text>
          )}
          {item.data.stageId && (
            <Text style={styles.detailText}>
              Stage: {item.data.stageId}
            </Text>
          )}
          {item.retryCount > 0 && (
            <Text style={styles.retryText}>
              Retries: {item.retryCount}
            </Text>
          )}
          {item.lastError && (
            <Text style={styles.errorText}>
              Error: {item.lastError}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.id)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const pendingCount = queue.filter(item => !item.status || item.status === 'pending').length;
  const failedCount = queue.filter(item => item.status === 'failed').length;

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{queue.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FFCC00' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FF4444' }]}>{failedCount}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton, isSyncing && styles.syncingButton]}
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#0A1628" />
          ) : (
            <Text style={styles.syncButtonText}>🔄 Sync Now</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.clearButton]}
          onPress={handleClearCompleted}
        >
          <Text style={styles.clearButtonText}>Clear Completed</Text>
        </TouchableOpacity>
      </View>

      {/* Queue List */}
      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>Queue is Empty</Text>
          <Text style={styles.emptyText}>
            All items have been synced successfully
          </Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Clear All Button */}
      {queue.length > 0 && (
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={handleClearAll}
        >
          <Text style={styles.clearAllButtonText}>Clear All Items</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#111D2E',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#00D4AA',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 4,
  },
  
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#0A1628',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  syncButton: {
    backgroundColor: '#00D4AA',
    flex: 1.5,
  },
  syncingButton: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: '#0A1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#1E3A5F',
  },
  clearButtonText: {
    color: '#8B9EB0',
    fontSize: 14,
  },
  
  listContent: {
    padding: 16,
  },
  queueItem: {
    backgroundColor: '#111D2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: '#8B9EB0',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  detailText: {
    color: '#8B9EB0',
    fontSize: 13,
    marginBottom: 4,
  },
  retryText: {
    color: '#FFCC00',
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  removeButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    color: '#00D4AA',
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
  },
  
  clearAllButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    alignItems: 'center',
  },
  clearAllButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});
