import axios from 'axios';
import { authService } from './authService';
import { storageService } from './storageService';

// Backend API URL - Update this with your deployed backend URL
const API_BASE_URL = 'https://api.buildguard.pro/api/v1';
// For local development: 'http://localhost:8000/api/v1'

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await authService.logout();
          // Trigger re-authentication
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== AUTH ====================
  async login(email, password) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.token) {
      await authService.setToken(response.data.token);
      await authService.setUser(response.data.user);
    }
    return response.data;
  }

  async register(userData) {
    const response = await this.client.post('/auth/register', userData);
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // ==================== PROJECTS ====================
  async getProjects() {
    const response = await this.client.get('/projects');
    return response.data;
  }

  async getProject(projectId) {
    const response = await this.client.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(projectData) {
    const response = await this.client.post('/projects', projectData);
    return response.data;
  }

  async updateProject(projectId, projectData) {
    const response = await this.client.put(`/projects/${projectId}`, projectData);
    return response.data;
  }

  // ==================== STAGES ====================
  async getStages(projectId) {
    const response = await this.client.get(`/projects/${projectId}/stages`);
    return response.data;
  }

  async updateStage(projectId, stageId, stageData) {
    const response = await this.client.put(
      `/projects/${projectId}/stages/${stageId}`,
      stageData
    );
    return response.data;
  }

  async approveStage(projectId, stageId, notes) {
    const response = await this.client.post(
      `/projects/${projectId}/stages/${stageId}/approve`,
      { notes }
    );
    return response.data;
  }

  // ==================== PHOTO ANALYSIS ====================
  async analyzePhoto(photoUri, metadata = {}) {
    const formData = new FormData();
    
    // Get file info
    const fileInfo = await storageService.getFileInfo(photoUri);
    
    formData.append('file', {
      uri: photoUri,
      name: fileInfo.name || 'photo.jpg',
      type: fileInfo.type || 'image/jpeg',
    });

    if (metadata.projectId) {
      formData.append('project_id', metadata.projectId);
    }
    if (metadata.stageId) {
      formData.append('stage_id', metadata.stageId);
    }

    const response = await this.client.post('/photos/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Upload photo with full metadata
  async uploadPhoto(photoUri, metadata = {}) {
    const formData = new FormData();
    
    const fileInfo = await storageService.getFileInfo(photoUri);
    
    formData.append('file', {
      uri: photoUri,
      name: fileInfo.name || 'photo.jpg',
      type: fileInfo.type || 'image/jpeg',
    });

    // Add all metadata
    Object.keys(metadata).forEach(key => {
      if (metadata[key] !== undefined && metadata[key] !== null) {
        formData.append(key, typeof metadata[key] === 'object' 
          ? JSON.stringify(metadata[key]) 
          : metadata[key]
        );
      }
    });

    const response = await this.client.post('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // ==================== 3D MODELS ====================
  async uploadModel(fileUri, projectId = null) {
    const formData = new FormData();
    
    const fileInfo = await storageService.getFileInfo(fileUri);
    
    formData.append('file', {
      uri: fileUri,
      name: fileInfo.name || 'model.dwg',
      type: fileInfo.type || 'application/octet-stream',
    });

    if (projectId) {
      formData.append('project_id', projectId);
    }

    const response = await this.client.post('/models/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for large files
    });

    return response.data;
  }

  async getModelStatus(modelId) {
    const response = await this.client.get(`/models/${modelId}/status`);
    return response.data;
  }

  async getModel(modelId) {
    const response = await this.client.get(`/models/${modelId}`);
    return response.data;
  }

  // ==================== PAYMENTS ====================
  async getPayments(projectId) {
    const response = await this.client.get(`/projects/${projectId}/payments`);
    return response.data;
  }

  async approvePayment(projectId, paymentId, notes) {
    const response = await this.client.post(
      `/projects/${projectId}/payments/${paymentId}/approve`,
      { notes }
    );
    return response.data;
  }

  // ==================== VARIATION ORDERS ====================
  async getVariationOrders(projectId) {
    const response = await this.client.get(`/projects/${projectId}/variations`);
    return response.data;
  }

  async createVariationOrder(projectId, variationData) {
    const response = await this.client.post(
      `/projects/${projectId}/variations`,
      variationData
    );
    return response.data;
  }

  async approveVariationOrder(projectId, variationId, notes) {
    const response = await this.client.post(
      `/projects/${projectId}/variations/${variationId}/approve`,
      { notes }
    );
    return response.data;
  }

  // ==================== AI ASSISTANT ====================
  async askAI(question, context = {}) {
    const response = await this.client.post('/ai/ask', {
      question,
      context,
    });
    return response.data;
  }

  async getAIRecommendations(projectId) {
    const response = await this.client.get(`/ai/recommendations/${projectId}`);
    return response.data;
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationRead(notificationId) {
    const response = await this.client.put(`/notifications/${notificationId}/read`);
    return response.data;
  }

  // ==================== HEALTH CHECK ====================
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
