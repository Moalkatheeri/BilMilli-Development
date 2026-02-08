/**
 * BuildGuard Pro API Client
 * Connects to homeowner's construction protection backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || error.message || 'Request failed');
  }

  return response.json();
}

// Projects API
export const projectsApi = {
  list: () => fetchApi<any[]>('/projects/'),
  get: (id: string) => fetchApi<any>(`/projects/${id}`),
  create: (data: any) => fetchApi<any>('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchApi<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getHealth: (id: string) => fetchApi<any>(`/projects/${id}/health`),
  getProgress: (id: string) => fetchApi<any>(`/projects/${id}/progress`),
};

// Stages API
export const stagesApi = {
  list: (projectId: string) => fetchApi<any[]>(`/stages/project/${projectId}`),
  get: (id: string) => fetchApi<any>(`/stages/${id}`),
  canStart: (id: string) => fetchApi<any>(`/stages/${id}/can-start`, { method: 'POST' }),
  start: (id: string, userId: string) => fetchApi<any>(`/stages/${id}/start`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  submit: (id: string) => fetchApi<any>(`/stages/${id}/submit`, { method: 'POST' }),
  approve: (id: string, approvedBy: string) => fetchApi<any>(`/stages/${id}/approve`, { method: 'POST', body: JSON.stringify({ approved_by: approvedBy }) }),
  updateChecklist: (id: string, itemIndex: number, completed: boolean) => 
    fetchApi<any>(`/stages/${id}/checklist`, { method: 'PATCH', body: JSON.stringify({ item_index: itemIndex, completed }) }),
};

// Captures API
export const capturesApi = {
  createSession: (data: any) => fetchApi<any>('/captures/sessions', { method: 'POST', body: JSON.stringify(data) }),
  addPhoto: (sessionId: string, fileSize: number = 0) => fetchApi<any>('/captures/photos', { method: 'POST', body: JSON.stringify({ session_id: sessionId, file_size: fileSize }) }),
  addMetadata: (photoId: string, data: any) => fetchApi<any>(`/captures/photos/${photoId}/metadata`, { method: 'POST', body: JSON.stringify(data) }),
  uploadPhoto: (photoId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/captures/photos/${photoId}/upload`, { method: 'POST', body: formData }).then(r => r.json());
  },
  analyzePhoto: (photoId: string) => fetchApi<any>(`/captures/photos/${photoId}/analyze`, { method: 'POST' }),
  getSessionPhotos: (sessionId: string) => fetchApi<any[]>(`/captures/sessions/${sessionId}/photos`),
};

// Deviations API
export const deviationsApi = {
  list: (projectId: string, filters?: any) => {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    return fetchApi<any[]>(`/deviations/project/${projectId}?${params}`);
  },
  get: (id: string) => fetchApi<any>(`/deviations/${id}`),
  checkPosition: (data: any) => fetchApi<any>('/deviations/check-position', { method: 'POST', body: JSON.stringify(data) }),
  getSummary: (projectId: string) => fetchApi<any>(`/deviations/project/${projectId}/summary`),
};

// Payments API
export const paymentsApi = {
  listGates: (projectId: string) => fetchApi<any[]>(`/payments/gates/project/${projectId}`),
  getGate: (id: string) => fetchApi<any>(`/payments/gates/${id}`),
  checkReadiness: (id: string) => fetchApi<any>(`/payments/gates/${id}/check-readiness`, { method: 'POST' }),
  requestRelease: (id: string, requestedBy: string) => fetchApi<any>(`/payments/gates/${id}/request-release`, { method: 'POST', body: JSON.stringify({ requested_by: requestedBy }) }),
  getSummary: (projectId: string) => fetchApi<any>(`/payments/summary/project/${projectId}`),
};

// Contractor API
export const contractorApi = {
  getScorecard: (contractorId: string) => fetchApi<any>(`/contractors/${contractorId}/scorecard`),
  getPerformance: (contractorId: string) => fetchApi<any>(`/contractors/${contractorId}/performance`),
};

// Evidence Package API
export const evidenceApi = {
  generatePackage: (projectId: string) => fetchApi<any>(`/evidence/project/${projectId}/generate`, { method: 'POST' }),
  downloadReport: (packageId: string) => fetchApi<Blob>(`/evidence/${packageId}/download`),
  shareWithTeyaseer: (projectId: string) => fetchApi<any>(`/evidence/project/${projectId}/share-teyaseer`, { method: 'POST' }),
};

export { ApiError };
