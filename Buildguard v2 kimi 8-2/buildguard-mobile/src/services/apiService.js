import axios from 'axios';
import { authService } from './authService';
import { storageService } from './storageService';

// Backend API URL - Configure via environment or use default
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
// Production: 'https://api.buildguard.pro/api'

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
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // ==================== PROJECTS ====================
  async getProjects() {
    const response = await this.client.get('/projects/');
    return response.data;
  }

  async getProject(projectId) {
    const response = await this.client.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(projectData) {
    const response = await this.client.post('/projects/', projectData);
    return response.data;
  }

  async updateProject(projectId, projectData) {
    const response = await this.client.patch(`/projects/${projectId}`, projectData);
    return response.data;
  }

  // ==================== STAGES ====================
  async getStages(projectId) {
    const response = await this.client.get(`/stages/project/${projectId}`);
    return response.data;
  }

  async startStage(stageId, userId) {
    const response = await this.client.post(`/stages/${stageId}/start`, { user_id: userId });
    return response.data;
  }

  async submitStage(stageId) {
    const response = await this.client.post(`/stages/${stageId}/submit`, {});
    return response.data;
  }

  async approveStage(stageId, approvedBy) {
    const response = await this.client.post(`/stages/${stageId}/approve`, { approved_by: approvedBy });
    return response.data;
  }

  async updateChecklist(stageId, itemIndex, completed) {
    const response = await this.client.patch(`/stages/${stageId}/checklist`, {
      item_index: itemIndex,
      completed
    });
    return response.data;
  }

  // ==================== CAPTURES / PHOTOS ====================
  async createCaptureSession(data) {
    const response = await this.client.post('/captures/sessions', data);
    return response.data;
  }

  async uploadPhotoDirect(photoUri, metadata = {}) {
    const formData = new FormData();
    
    const fileInfo = await storageService.getFileInfo(photoUri);
    
    formData.append('file', {
      uri: photoUri,
      name: fileInfo.name || 'photo.jpg',
      type: fileInfo.type || 'image/jpeg',
    });

    // Add metadata fields
    if (metadata.projectId) {
      formData.append('project_id', metadata.projectId);
    }
    if (metadata.stageId) {
      formData.append('stage_id', metadata.stageId);
    }
    if (metadata.latitude) {
      formData.append('latitude', metadata.latitude.toString());
    }
    if (metadata.longitude) {
      formData.append('longitude', metadata.longitude.toString());
    }
    if (metadata.altitude) {
      formData.append('altitude', metadata.altitude.toString());
    }
    if (metadata.accuracy) {
      formData.append('accuracy', metadata.accuracy.toString());
    }
    if (metadata.heading) {
      formData.append('heading', metadata.heading.toString());
    }
    if (metadata.capturedBy) {
      formData.append('captured_by', metadata.capturedBy);
    }

    const response = await this.client.post('/captures/photos/upload-direct', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getPhotoUrl(photoId) {
    const response = await this.client.get(`/captures/photos/${photoId}/url`);
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

    const response = await this.client.post(`/projects/${projectId}/upload-model`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for large files
    });

    return response.data;
  }

  // ==================== CONTRACTORS ====================
  async getContractorScorecard(contractorId) {
    const response = await this.client.get(`/contractors/${contractorId}/scorecard`);
    return response.data;
  }

  async getContractorPerformance(contractorId) {
    const response = await this.client.get(`/contractors/${contractorId}/performance`);
    return response.data;
  }

  // ==================== EVIDENCE ====================
  async generateEvidencePackage(projectId) {
    const response = await this.client.post(`/evidence/project/${projectId}/generate`, {});
    return response.data;
  }

  async shareWithTeyaseer(projectId) {
    const response = await this.client.post(`/evidence/project/${projectId}/share-teyaseer`, {});
    return response.data;
  }

  // ==================== PAYMENTS ====================
  async getPayments(projectId) {
    const response = await this.client.get(`/payments/gates/project/${projectId}`);
    return response.data;
  }

  async checkPaymentReadiness(paymentId) {
    const response = await this.client.post(`/payments/gates/${paymentId}/check-readiness`, {});
    return response.data;
  }

  async requestPaymentRelease(paymentId, requestedBy) {
    const response = await this.client.post(`/payments/gates/${paymentId}/request-release`, {
      requested_by: requestedBy
    });
    return response.data;
  }

  async approvePayment(paymentId, approvedBy) {
    const response = await this.client.post(`/payments/gates/${paymentId}/approve`, {
      approved_by: approvedBy
    });
    return response.data;
  }

  async getPaymentSummary(projectId) {
    const response = await this.client.get(`/payments/summary/project/${projectId}`);
    return response.data;
  }

  // ==================== DEVIATIONS ====================
  async getDeviations(projectId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.status) params.append('status', filters.status);
    const response = await this.client.get(`/deviations/project/${projectId}?${params}`);
    return response.data;
  }

  async getDeviationSummary(projectId) {
    const response = await this.client.get(`/deviations/project/${projectId}/summary`);
    return response.data;
  }

  async acceptDeviation(deviationId, reviewedBy, notes) {
    const response = await this.client.post(`/deviations/${deviationId}/accept`, {
      reviewed_by: reviewedBy,
      notes
    });
    return response.data;
  }

  async rejectDeviation(deviationId, reviewedBy, notes) {
    const response = await this.client.post(`/deviations/${deviationId}/reject`, {
      reviewed_by: reviewedBy,
      notes
    });
    return response.data;
  }

  async rectifyDeviation(deviationId, notes, actualCost) {
    const response = await this.client.post(`/deviations/${deviationId}/rectify`, {
      notes,
      actual_cost: actualCost
    });
    return response.data;
  }

  // ==================== ANALYSIS ====================
  async createThermalAnalysis(projectId, location, designTemperature = 24) {
    const response = await this.client.post('/analysis/', {
      project_id: projectId,
      location,
      design_temperature: designTemperature
    });
    return response.data;
  }

  async runThermalAnalysis(analysisId) {
    const response = await this.client.post(`/analysis/${analysisId}/run`, {});
    return response.data;
  }

  async getAnalysis(projectId) {
    const response = await this.client.get(`/analysis/project/${projectId}`);
    return response.data;
  }

  // ==================== HEALTH CHECK ====================
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
