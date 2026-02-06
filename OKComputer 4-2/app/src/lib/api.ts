/**
 * BuildGuard Pro API Client
 * Connects to the construction protection backend with JWT auth
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'buildguard_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.location.reload();
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || error.message || 'Request failed');
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export interface LoginResponse {
  token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    project_ids: string[];
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  project_ids: string[];
  is_active: boolean;
}

export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { email: string; password: string; full_name: string; role?: string }) =>
    fetchApi<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => fetchApi<UserProfile>('/auth/me'),
};

// ---------------------------------------------------------------------------
// Projects API
// ---------------------------------------------------------------------------

export interface ProjectResponse {
  id: string;
  name: string;
  address: string;
  location: string;
  contract_value: number;
  start_date: string | null;
  expected_completion: string | null;
  actual_completion: string | null;
  model_url: string | null;
  model_metadata: Record<string, any>;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  location: string;
  status: string;
  progress: number;
  contract_value: number;
  created_at: string;
}

export const projectsApi = {
  list: () => fetchApi<{ items: ProjectListItem[]; total: number }>('/projects/'),
  get: (id: string) => fetchApi<ProjectResponse>(`/projects/${id}`),
  create: (data: {
    name: string;
    address: string;
    location: string;
    contract_value?: number;
    start_date?: string;
    expected_completion?: string;
  }) => fetchApi<ProjectResponse>('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, any>) =>
    fetchApi<ProjectResponse>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  getProgress: (id: string) => fetchApi<any>(`/projects/${id}/progress`),
};

// ---------------------------------------------------------------------------
// Stages API
// ---------------------------------------------------------------------------

export interface StageResponse {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sequence: number;
  phase: string;
  status: string;
  completion_percentage: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  depends_on: string[];
  checklist_items: Array<{ item: string; completed: boolean }>;
  payment_percentage: number;
  payment_amount: number;
  payment_released: number;
  payment_held: number;
  created_at: string;
  updated_at: string;
}

export const stagesApi = {
  list: (projectId: string) => fetchApi<StageResponse[]>(`/stages/project/${projectId}`),
  get: (id: string) => fetchApi<StageResponse>(`/stages/${id}`),
  canStart: (id: string) =>
    fetchApi<{ can_start: boolean; reasons: string[] }>(`/stages/${id}/can-start`, { method: 'POST' }),
  start: (id: string, userId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/stages/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  submit: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/stages/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  approve: (id: string, approvedBy: string) =>
    fetchApi<{ success: boolean; message: string }>(`/stages/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
    }),
  reject: (id: string, reason: string) =>
    fetchApi<{ success: boolean; message: string }>(`/stages/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  updateChecklist: (id: string, itemIndex: number, completed: boolean) =>
    fetchApi<{ success: boolean; message: string; completion_percentage: number }>(
      `/stages/${id}/checklist`,
      { method: 'PATCH', body: JSON.stringify({ item_index: itemIndex, completed }) },
    ),
};

// ---------------------------------------------------------------------------
// Captures API
// ---------------------------------------------------------------------------

export const capturesApi = {
  createSession: (data: {
    project_id: string;
    stage_id: string;
    name: string;
    description?: string;
    captured_by: string;
    is_offline?: boolean;
  }) => fetchApi<any>('/captures/sessions', { method: 'POST', body: JSON.stringify(data) }),
  getSession: (id: string) => fetchApi<any>(`/captures/sessions/${id}`),
  listSessions: (projectId: string) => fetchApi<any[]>(`/captures/sessions/project/${projectId}`),
  addPhoto: (sessionId: string, fileSize: number = 0) =>
    fetchApi<any>('/captures/photos', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, file_size: fileSize }),
    }),
  addMetadata: (photoId: string, data: any) =>
    fetchApi<any>(`/captures/photos/${photoId}/metadata`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadPhoto: async (photoId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/captures/photos/${photoId}/upload`, {
      method: 'POST',
      body: formData,
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new ApiError(res.status, err.detail || 'Upload failed');
    }
    return res.json();
  },
  getSessionPhotos: (sessionId: string) => fetchApi<any[]>(`/captures/sessions/${sessionId}/photos`),
};

// ---------------------------------------------------------------------------
// Deviations API
// ---------------------------------------------------------------------------

export interface DeviationResponse {
  id: string;
  project_id: string;
  element_type: string;
  element_id: string;
  element_name: string | null;
  deviation_type: string;
  severity: string;
  expected_position: Record<string, number> | null;
  actual_position: Record<string, number> | null;
  position_deviation_mm: number;
  tolerance_mm: number;
  is_within_tolerance: boolean;
  status: string;
  review_notes: string | null;
  rectification_notes: string | null;
  detected_at: string;
  reviewed_at: string | null;
  rectified_at: string | null;
  created_at: string;
}

export interface DeviationListResponse {
  deviations: DeviationResponse[];
  total: number;
  by_severity: Record<string, number>;
}

export const deviationsApi = {
  list: (projectId: string, filters?: { severity?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return fetchApi<DeviationListResponse>(`/deviations/project/${projectId}${qs ? '?' + qs : ''}`);
  },
  get: (id: string) => fetchApi<DeviationResponse>(`/deviations/${id}`),
  accept: (id: string, reviewedBy: string, notes: string) =>
    fetchApi<{ success: boolean }>(`/deviations/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ reviewed_by: reviewedBy, notes }),
    }),
  reject: (id: string, reviewedBy: string, notes: string) =>
    fetchApi<{ success: boolean }>(`/deviations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewed_by: reviewedBy, notes }),
    }),
  rectify: (id: string, notes: string, actualCost: number = 0) =>
    fetchApi<{ success: boolean }>(`/deviations/${id}/rectify`, {
      method: 'POST',
      body: JSON.stringify({ notes, actual_cost: actualCost }),
    }),
  update: (id: string, data: { reviewed_by: string; notes: string; status_update?: string }) =>
    fetchApi<{ success: boolean }>(`/deviations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  checkPosition: (data: any) =>
    fetchApi<any>('/deviations/check-position', { method: 'POST', body: JSON.stringify(data) }),
  getSummary: (projectId: string) => fetchApi<any>(`/deviations/project/${projectId}/summary`),
};

// ---------------------------------------------------------------------------
// Payments API
// ---------------------------------------------------------------------------

export interface PaymentGateResponse {
  id: string;
  project_id: string;
  stage_id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  block_reasons: string[];
  blocking_deviation_ids: string[];
  blocking_ticket_ids: string[];
  requested_by: string | null;
  requested_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export const paymentsApi = {
  listGates: (projectId: string) => fetchApi<PaymentGateResponse[]>(`/payments/gates/project/${projectId}`),
  getGate: (id: string) => fetchApi<PaymentGateResponse>(`/payments/gates/${id}`),
  checkReadiness: (id: string) =>
    fetchApi<{ can_release: boolean; reasons: string[] }>(`/payments/gates/${id}/check-readiness`, {
      method: 'POST',
    }),
  requestRelease: (id: string, requestedBy: string) =>
    fetchApi<{ success: boolean; message: string }>(`/payments/gates/${id}/request-release`, {
      method: 'POST',
      body: JSON.stringify({ requested_by: requestedBy }),
    }),
  approve: (id: string, approvedBy: string) =>
    fetchApi<{ success: boolean; message: string }>(`/payments/gates/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
    }),
  getSummary: (projectId: string) => fetchApi<any>(`/payments/summary/project/${projectId}`),
};

// ---------------------------------------------------------------------------
// Contractor API
// ---------------------------------------------------------------------------

export const contractorApi = {
  getScorecard: (contractorId: string) => fetchApi<any>(`/contractors/${contractorId}/scorecard`),
  getPerformance: (contractorId: string) => fetchApi<any>(`/contractors/${contractorId}/performance`),
};

// ---------------------------------------------------------------------------
// Evidence Package API
// ---------------------------------------------------------------------------

export const evidenceApi = {
  generatePackage: (projectId: string) =>
    fetchApi<any>(`/evidence/project/${projectId}/generate`, { method: 'POST' }),
  downloadReport: (packageId: string) => fetchApi<any>(`/evidence/${packageId}/download`),
};
