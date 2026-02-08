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
      
      case 'stage_start':
        return await this.processStageStart(item);
      
      case 'stage_submit':
        return await this.processStageSubmit(item);
      
      case 'stage_approval':
        return await this.processStageApproval(item);
      
      case 'checklist_update':
        return await this.processChecklistUpdate(item);
      
      case 'payment_request':
        return await this.processPaymentRequest(item);
      
      case 'payment_approval':
        return await this.processPaymentApproval(item);
      
      case 'deviation_accept':
        return await this.processDeviationAccept(item);
      
      case 'deviation_reject':
        return await this.processDeviationReject(item);
      
      case 'deviation_rectify':
        return await this.processDeviationRectify(item);
      
      case 'model_upload':
        return await this.processModelUpload(item);
      
      default:
        console.warn('Unknown queue item type:', item.type);
        return false;
    }
  }

  async processPhotoUpload(item) {
    const { photoUri, metadata } = item.data;
    const result = await apiService.uploadPhotoDirect(photoUri, metadata);
    return !!result;
  }

  async processStageStart(item) {
    const { stageId, userId } = item.data;
    const result = await apiService.startStage(stageId, userId);
    return !!result;
  }

  async processStageSubmit(item) {
    const { stageId } = item.data;
    const result = await apiService.submitStage(stageId);
    return !!result;
  }

  async processStageApproval(item) {
    const { stageId, approvedBy } = item.data;
    const result = await apiService.approveStage(stageId, approvedBy);
    return !!result;
  }

  async processChecklistUpdate(item) {
    const { stageId, itemIndex, completed } = item.data;
    const result = await apiService.updateChecklist(stageId, itemIndex, completed);
    return !!result;
  }

  async processPaymentRequest(item) {
    const { paymentId, requestedBy } = item.data;
    const result = await apiService.requestPaymentRelease(paymentId, requestedBy);
    return !!result;
  }

  async processPaymentApproval(item) {
    const { paymentId, approvedBy } = item.data;
    const result = await apiService.approvePayment(paymentId, approvedBy);
    return !!result;
  }

  async processDeviationAccept(item) {
    const { deviationId, reviewedBy, notes } = item.data;
    const result = await apiService.acceptDeviation(deviationId, reviewedBy, notes);
    return !!result;
  }

  async processDeviationReject(item) {
    const { deviationId, reviewedBy, notes } = item.data;
    const result = await apiService.rejectDeviation(deviationId, reviewedBy, notes);
    return !!result;
  }

  async processDeviationRectify(item) {
    const { deviationId, notes, actualCost } = item.data;
    const result = await apiService.rectifyDeviation(deviationId, notes, actualCost);
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

  async queueStageStart(stageId, userId) {
    return await storageService.addToOfflineQueue({
      type: 'stage_start',
      data: { stageId, userId },
    });
  }

  async queueStageSubmit(stageId) {
    return await storageService.addToOfflineQueue({
      type: 'stage_submit',
      data: { stageId },
    });
  }

  async queueStageApproval(stageId, approvedBy) {
    return await storageService.addToOfflineQueue({
      type: 'stage_approval',
      data: { stageId, approvedBy },
    });
  }

  async queueChecklistUpdate(stageId, itemIndex, completed) {
    return await storageService.addToOfflineQueue({
      type: 'checklist_update',
      data: { stageId, itemIndex, completed },
    });
  }

  async queuePaymentRequest(paymentId, requestedBy) {
    return await storageService.addToOfflineQueue({
      type: 'payment_request',
      data: { paymentId, requestedBy },
    });
  }

  async queuePaymentApproval(paymentId, approvedBy) {
    return await storageService.addToOfflineQueue({
      type: 'payment_approval',
      data: { paymentId, approvedBy },
    });
  }

  async queueDeviationAccept(deviationId, reviewedBy, notes) {
    return await storageService.addToOfflineQueue({
      type: 'deviation_accept',
      data: { deviationId, reviewedBy, notes },
    });
  }

  async queueDeviationReject(deviationId, reviewedBy, notes) {
    return await storageService.addToOfflineQueue({
      type: 'deviation_reject',
      data: { deviationId, reviewedBy, notes },
    });
  }

  async queueDeviationRectify(deviationId, notes, actualCost) {
    return await storageService.addToOfflineQueue({
      type: 'deviation_rectify',
      data: { deviationId, notes, actualCost },
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
