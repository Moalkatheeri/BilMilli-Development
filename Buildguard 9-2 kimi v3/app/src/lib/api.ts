/**
 * BuildGuard Pro API Client
 * Connects to homeowner's construction protection backend
 */

import type {
  Project, ConstructionStage, Deviation, PaymentGate,
  VariationOrder, Snag, PhotoCapture, HealthScore, User
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Token management
export function getToken(): string | null {
  return localStorage.getItem('buildguard_token');
}

export function setToken(token: string): void {
  localStorage.setItem('buildguard_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('buildguard_token');
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || error.message || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; full_name: string; role: string }) =>
    fetchApi<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => fetchApi<User>('/auth/me'),
};

// Projects API
export const projectsApi = {
  list: () => fetchApi<{ items: Project[]; total: number; skip: number; limit: number }>('/projects/'),
  get: (id: string) => fetchApi<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => fetchApi<Project>('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>) => fetchApi<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getHealth: (id: string) => fetchApi<HealthScore>(`/projects/${id}/health`),
  getProgress: (id: string) => fetchApi<{ progress: number; completedStages: number; totalStages: number }>(`/projects/${id}/progress`),
};

// Stages API
export const stagesApi = {
  list: (projectId: string) => fetchApi<{ items: ConstructionStage[]; total: number }>(`/stages/project/${projectId}`),
  get: (id: string) => fetchApi<ConstructionStage>(`/stages/${id}`),
  canStart: (id: string) => fetchApi<{ can_start: boolean; reasons: string[] }>(`/stages/${id}/can-start`, { method: 'POST' }),
  start: (id: string, userId: string) => fetchApi<{ success: boolean; message: string; stage_id: string }>(`/stages/${id}/start`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  submit: (id: string) => fetchApi<{ success: boolean; message: string }>(`/stages/${id}/submit`, { method: 'POST' }),
  approve: (id: string, approvedBy: string) => fetchApi<{ success: boolean; message: string; stage_id: string }>(`/stages/${id}/approve`, { method: 'POST', body: JSON.stringify({ approved_by: approvedBy }) }),
  reject: (id: string, reason: string) => fetchApi<{ success: boolean; message: string }>(`/stages/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  updateChecklist: (id: string, itemIndex: number, completed: boolean) =>
    fetchApi<{ success: boolean; message: string; completion_percentage: number }>(`/stages/${id}/checklist`, { method: 'PATCH', body: JSON.stringify({ item_index: itemIndex, completed }) }),
};

// Captures API
export const capturesApi = {
  createSession: (data: { project_id: string; stage_id?: string; name: string; description?: string; captured_by: string; is_offline?: boolean }) =>
    fetchApi<{ id: string; project_id: string; status: string }>('/captures/sessions', { method: 'POST', body: JSON.stringify(data) }),
  addPhoto: (sessionId: string, fileSize: number = 0) =>
    fetchApi<{ id: string; session_id: string; status: string }>('/captures/photos', { method: 'POST', body: JSON.stringify({ session_id: sessionId, file_size: fileSize }) }),
  addMetadata: (photoId: string, data: { latitude?: number; longitude?: number; heading?: number; accuracy?: number }) =>
    fetchApi<any>(`/captures/photos/${photoId}/metadata`, { method: 'POST', body: JSON.stringify(data) }),
  uploadPhoto: (photoId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/captures/photos/${photoId}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken() || ''}` },
      body: formData
    }).then(r => r.json());
  },
  analyzePhoto: (photoId: string) => fetchApi<any>(`/captures/photos/${photoId}/analyze`, { method: 'POST' }),
  getSessionPhotos: (sessionId: string) => fetchApi<PhotoCapture[]>(`/captures/sessions/${sessionId}/photos`),
};

// Deviations API
export const deviationsApi = {
  list: (projectId: string, filters?: { severity?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    return fetchApi<{ items: Deviation[]; total: number }>(`/deviations/project/${projectId}?${params}`);
  },
  get: (id: string) => fetchApi<Deviation>(`/deviations/${id}`),
  checkPosition: (data: { project_id: string; element_id: string; element_type: string; element_name?: string; expected_position: { x: number; y: number; z: number }; actual_position: { x: number; y: number; z: number }; photo_id?: string }) =>
    fetchApi<{ has_deviation: boolean; deviation?: Deviation; message: string }>('/deviations/check-position', { method: 'POST', body: JSON.stringify(data) }),
  getSummary: (projectId: string) => fetchApi<{ total: number; by_severity: Record<string, number>; by_status: Record<string, number> }>(`/deviations/project/${projectId}/summary`),
  accept: (id: string, reviewedBy: string, notes?: string) =>
    fetchApi<{ success: boolean; message: string; deviation_id: string }>(`/deviations/${id}/accept`, { method: 'POST', body: JSON.stringify({ reviewed_by: reviewedBy, notes }) }),
  reject: (id: string, reviewedBy: string, notes?: string) =>
    fetchApi<{ success: boolean; message: string; deviation_id: string }>(`/deviations/${id}/reject`, { method: 'POST', body: JSON.stringify({ reviewed_by: reviewedBy, notes }) }),
  rectify: (id: string, notes?: string, actualCost?: number) =>
    fetchApi<{ success: boolean; message: string; deviation_id: string }>(`/deviations/${id}/rectify`, { method: 'POST', body: JSON.stringify({ notes, actual_cost: actualCost }) }),
};

// Payments API
export const paymentsApi = {
  listGates: (projectId: string) => fetchApi<{ items: PaymentGate[]; total: number }>(`/payments/gates/project/${projectId}`),
  getGate: (id: string) => fetchApi<PaymentGate>(`/payments/gates/${id}`),
  checkReadiness: (id: string) => fetchApi<{ can_release: boolean; reasons: string[] }>(`/payments/gates/${id}/check-readiness`, { method: 'POST' }),
  requestRelease: (id: string, requestedBy: string) => fetchApi<{ success: boolean; message: string; payment_id: string }>(`/payments/gates/${id}/request-release`, { method: 'POST', body: JSON.stringify({ requested_by: requestedBy }) }),
  approve: (id: string, approvedBy: string) => fetchApi<{ success: boolean; message: string; amount: number }>(`/payments/gates/${id}/approve`, { method: 'POST', body: JSON.stringify({ approved_by: approvedBy }) }),
  getSummary: (projectId: string) => fetchApi<{ total_gates: number; total_amount: number; released_amount: number; pending_amount: number; held_amount: number }>(`/payments/summary/project/${projectId}`),
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
