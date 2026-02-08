import NetInfo from '@react-native-community/netinfo';
import { storageService } from './storageService';
import { apiService } from './apiService';

const SYNC_INTERVAL = 30000; // 30 seconds
const MAX_RETRIES = 3;

class SyncService {
  constructor() {
    this.syncInterval = null;
    this.isSyncing = false;
    this.listeners = [];
  }

  startSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.syncOfflineQueue();
    }, SYNC_INTERVAL);

    // Initial sync
    this.syncOfflineQueue();
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  async syncOfflineQueue() {
    if (this.isSyncing) return;
    
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('No internet connection, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_started' });

    try {
      const queue = await storageService.getOfflineQueue();
      
      if (queue.length === 0) {
        this.isSyncing = false;
        this.notifyListeners({ type: 'sync_complete', processed: 0 });
        return;
      }

      console.log(`Syncing ${queue.length} offline items...`);
      let processed = 0;
      let failed = 0;

      for (const item of queue) {
        try {
          const success = await this.processQueueItem(item);
          if (success) {
            await storageService.removeFromOfflineQueue(item.id);
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          failed++;
          
          // Increment retry count
          const newRetryCount = (item.retryCount || 0) + 1;
          if (newRetryCount >= MAX_RETRIES) {
            // Mark as permanently failed
            await storageService.updateOfflineQueueItem(item.id, {
              status: 'failed',
              error: error.message,
              retryCount: newRetryCount,
            });
          } else {
            await storageService.updateOfflineQueueItem(item.id, {
              retryCount: newRetryCount,
              lastError: error.message,
            });
          }
        }
      }

      this.notifyListeners({ 
        type: 'sync_complete', 
        processed, 
        failed,
        total: queue.length 
      });

    } catch (error) {
      console.error('Error during sync:', error);
      this.notifyListeners({ type: 'sync_error', error });
    } finally {
      this.isSyncing = false;
    }
  }

  async processQueueItem(item) {
    switch (item.type) {
      case 'photo_upload':
        return await this.processPhotoUpload(item);
      
      case 'photo_analysis':
        return await this.processPhotoAnalysis(item);
      
      case 'stage_update':
        return await this.processStageUpdate(item);
      
      case 'stage_approval':
        return await this.processStageApproval(item);
      
      case 'payment_approval':
        return await this.processPaymentApproval(item);
      
      case 'variation_approval':
        return await this.processVariationApproval(item);
      
      case 'model_upload':
        return await this.processModelUpload(item);
      
      default:
        console.warn('Unknown queue item type:', item.type);
        return false;
    }
  }

  async processPhotoUpload(item) {
    const { photoUri, metadata } = item.data;
    const result = await apiService.uploadPhoto(photoUri, metadata);
    return !!result;
  }

  async processPhotoAnalysis(item) {
    const { photoUri, metadata } = item.data;
    const result = await apiService.analyzePhoto(photoUri, metadata);
    return !!result;
  }

  async processStageUpdate(item) {
    const { projectId, stageId, stageData } = item.data;
    const result = await apiService.updateStage(projectId, stageId, stageData);
    return !!result;
  }

  async processStageApproval(item) {
    const { projectId, stageId, notes } = item.data;
    const result = await apiService.approveStage(projectId, stageId, notes);
    return !!result;
  }

  async processPaymentApproval(item) {
    const { projectId, paymentId, notes } = item.data;
    const result = await apiService.approvePayment(projectId, paymentId, notes);
    return !!result;
  }

  async processVariationApproval(item) {
    const { projectId, variationId, notes } = item.data;
    const result = await apiService.approveVariationOrder(projectId, variationId, notes);
    return !!result;
  }

  async processModelUpload(item) {
    const { fileUri, projectId } = item.data;
    const result = await apiService.uploadModel(fileUri, projectId);
    return !!result;
  }

  // Queue actions for offline processing
  async queuePhotoUpload(photoUri, metadata) {
    return await storageService.addToOfflineQueue({
      type: 'photo_upload',
      data: { photoUri, metadata },
    });
  }

  async queuePhotoAnalysis(photoUri, metadata) {
    return await storageService.addToOfflineQueue({
      type: 'photo_analysis',
      data: { photoUri, metadata },
    });
  }

  async queueStageUpdate(projectId, stageId, stageData) {
    return await storageService.addToOfflineQueue({
      type: 'stage_update',
      data: { projectId, stageId, stageData },
    });
  }

  async queueStageApproval(projectId, stageId, notes) {
    return await storageService.addToOfflineQueue({
      type: 'stage_approval',
      data: { projectId, stageId, notes },
    });
  }

  async queuePaymentApproval(projectId, paymentId, notes) {
    return await storageService.addToOfflineQueue({
      type: 'payment_approval',
      data: { projectId, paymentId, notes },
    });
  }

  async queueVariationApproval(projectId, variationId, notes) {
    return await storageService.addToOfflineQueue({
      type: 'variation_approval',
      data: { projectId, variationId, notes },
    });
  }

  async queueModelUpload(fileUri, projectId) {
    return await storageService.addToOfflineQueue({
      type: 'model_upload',
      data: { fileUri, projectId },
    });
  }

  // Force immediate sync
  async forceSync() {
    await this.syncOfflineQueue();
  }

  // Get sync status
  async getSyncStatus() {
    const queue = await storageService.getOfflineQueue();
    return {
      isSyncing: this.isSyncing,
      pendingItems: queue.length,
      failedItems: queue.filter(item => item.status === 'failed').length,
    };
  }
}

export const syncService = new SyncService();
