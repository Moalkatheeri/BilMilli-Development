import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const OFFLINE_QUEUE_KEY = '@buildguard_offline_queue';
const DRAFTS_KEY = '@buildguard_drafts';
const CACHE_KEY = '@buildguard_cache';

class StorageService {
  // ==================== OFFLINE QUEUE ====================
  async addToOfflineQueue(action) {
    try {
      const queue = await this.getOfflineQueue();
      const newAction = {
        ...action,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      queue.push(newAction);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return newAction;
    } catch (error) {
      console.error('Error adding to offline queue:', error);
      throw error;
    }
  }

  async getOfflineQueue() {
    try {
      const queue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  async removeFromOfflineQueue(actionId) {
    try {
      const queue = await this.getOfflineQueue();
      const filtered = queue.filter(item => item.id !== actionId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing from offline queue:', error);
    }
  }

  async updateOfflineQueueItem(actionId, updates) {
    try {
      const queue = await this.getOfflineQueue();
      const index = queue.findIndex(item => item.id === actionId);
      if (index !== -1) {
        queue[index] = { ...queue[index], ...updates };
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Error updating offline queue item:', error);
    }
  }

  async clearOfflineQueue() {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }

  // ==================== DRAFTS ====================
  async saveDraft(key, data) {
    try {
      const drafts = await this.getDrafts();
      drafts[key] = {
        ...data,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  async getDraft(key) {
    try {
      const drafts = await this.getDrafts();
      return drafts[key] || null;
    } catch (error) {
      console.error('Error getting draft:', error);
      return null;
    }
  }

  async getDrafts() {
    try {
      const drafts = await AsyncStorage.getItem(DRAFTS_KEY);
      return drafts ? JSON.parse(drafts) : {};
    } catch (error) {
      console.error('Error getting drafts:', error);
      return {};
    }
  }

  async removeDraft(key) {
    try {
      const drafts = await this.getDrafts();
      delete drafts[key];
      await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error('Error removing draft:', error);
    }
  }

  // ==================== CACHE ====================
  async setCache(key, data, ttlMinutes = 60) {
    try {
      const cache = await this.getAllCache();
      cache[key] = {
        data,
        expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  async getCache(key) {
    try {
      const cache = await this.getAllCache();
      const item = cache[key];
      if (!item) return null;
      if (Date.now() > item.expiresAt) {
        delete cache[key];
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return null;
      }
      return item.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  async getAllCache() {
    try {
      const cache = await AsyncStorage.getItem(CACHE_KEY);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.error('Error getting all cache:', error);
      return {};
    }
  }

  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // ==================== FILE OPERATIONS ====================
  async getFileInfo(uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const filename = uri.split('/').pop();
      const extension = filename.split('.').pop().toLowerCase();
      
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'heic': 'image/heic',
        'dwg': 'application/acad',
        'dxf': 'application/dxf',
        'ifc': 'application/ifc',
        'pdf': 'application/pdf',
        'glb': 'model/gltf-binary',
        'gltf': 'model/gltf+json',
        'obj': 'model/obj',
        'fbx': 'application/octet-stream',
      };

      return {
        uri,
        name: filename,
        size: fileInfo.size,
        type: mimeTypes[extension] || 'application/octet-stream',
        extension,
        exists: fileInfo.exists,
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        uri,
        name: uri.split('/').pop(),
        type: 'application/octet-stream',
        exists: false,
      };
    }
  }

  async copyFile(sourceUri, destinationPath) {
    try {
      return await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationPath,
      });
    } catch (error) {
      console.error('Error copying file:', error);
      throw error;
    }
  }

  async deleteFile(uri) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  async createDirectory(path) {
    try {
      const dirInfo = await FileSystem.getInfoAsync(path);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      }
    } catch (error) {
      console.error('Error creating directory:', error);
    }
  }

  // ==================== PHOTO STORAGE ====================
  async savePhotoLocally(photoUri, metadata = {}) {
    try {
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      await this.createDirectory(photosDir);

      const filename = `photo_${Date.now()}.jpg`;
      const destinationUri = `${photosDir}${filename}`;

      await this.copyFile(photoUri, destinationUri);

      // Save metadata
      const metaPath = `${photosDir}${filename}.meta.json`;
      await FileSystem.writeAsStringAsync(
        metaPath,
        JSON.stringify({
          ...metadata,
          savedAt: new Date().toISOString(),
          localUri: destinationUri,
        })
      );

      return {
        localUri: destinationUri,
        filename,
        metadata,
      };
    } catch (error) {
      console.error('Error saving photo locally:', error);
      throw error;
    }
  }

  async getLocalPhotos() {
    try {
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      const dirInfo = await FileSystem.getInfoAsync(photosDir);
      
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(photosDir);
      const photos = [];

      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const metaPath = `${photosDir}${file}`;
          const metaContent = await FileSystem.readAsStringAsync(metaPath);
          photos.push(JSON.parse(metaContent));
        }
      }

      return photos.sort((a, b) => 
        new Date(b.savedAt) - new Date(a.savedAt)
      );
    } catch (error) {
      console.error('Error getting local photos:', error);
      return [];
    }
  }

  // ==================== GENERAL ====================
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing all storage:', error);
    }
  }

  async getStorageStats() {
    try {
      const queue = await this.getOfflineQueue();
      const drafts = await this.getDrafts();
      const cache = await this.getAllCache();

      return {
        offlineQueueLength: queue.length,
        draftsCount: Object.keys(drafts).length,
        cacheEntries: Object.keys(cache).length,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        offlineQueueLength: 0,
        draftsCount: 0,
        cacheEntries: 0,
      };
    }
  }
}

export const storageService = new StorageService();
