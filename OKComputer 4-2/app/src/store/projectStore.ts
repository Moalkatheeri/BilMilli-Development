import { create } from 'zustand';
import type {
  Project, ConstructionStage, Deviation, PaymentGate,
  VariationOrder, Snag, PhotoCapture, HealthScore, Notification,
} from '@/types';
import {
  authApi, projectsApi, stagesApi, deviationsApi, paymentsApi,
  getToken, setToken, clearToken, ApiError,
  type LoginResponse, type UserProfile,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface ProjectState {
  // Auth
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;

  // Data
  project: Project | null;
  projects: Array<{ id: string; name: string; location: string; status: string; progress: number; contract_value: number; created_at: string }>;
  stages: ConstructionStage[];
  deviations: Deviation[];
  payments: PaymentGate[];
  vos: VariationOrder[];
  snags: Snag[];
  photos: PhotoCapture[];
  healthScore: HealthScore | null;
  notifications: Notification[];

  // UI State
  loading: boolean;
  error: string | null;
  selectedStage: string | null;
  selectedDeviation: string | null;
  activeTab: string;
  sidebarOpen: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; role?: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;

  // Data loaders
  loadProjects: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;

  // Setters
  setProject: (project: Project) => void;
  setStages: (stages: ConstructionStage[]) => void;
  setDeviations: (deviations: Deviation[]) => void;
  setPayments: (payments: PaymentGate[]) => void;
  setVOs: (vos: VariationOrder[]) => void;
  setSnags: (snags: Snag[]) => void;
  setPhotos: (photos: PhotoCapture[]) => void;
  setHealthScore: (score: HealthScore) => void;

  // Stage actions
  startStage: (stageId: string) => Promise<void>;
  submitStage: (stageId: string) => Promise<void>;
  approveStage: (stageId: string) => Promise<void>;
  updateChecklist: (stageId: string, itemIndex: number, completed: boolean) => Promise<void>;

  // Deviation actions
  acceptDeviation: (deviationId: string, notes: string) => Promise<void>;
  rejectDeviation: (deviationId: string, notes: string) => Promise<void>;
  rectifyDeviation: (deviationId: string, notes: string) => Promise<void>;

  // Payment actions
  requestPaymentRelease: (paymentId: string) => Promise<void>;
  approvePayment: (paymentId: string) => Promise<void>;

  // UI actions
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  selectStage: (stageId: string | null) => void;
  selectDeviation: (deviationId: string | null) => void;
  markNotificationRead: (notificationId: string) => void;
}

// ---------------------------------------------------------------------------
// Helper: map backend stage to frontend ConstructionStage
// ---------------------------------------------------------------------------

function mapStage(s: any): ConstructionStage {
  return {
    id: s.id,
    projectId: s.project_id,
    name: s.name,
    sequence: s.sequence,
    status: s.status,
    progressPercentage: s.completion_percentage ?? 0,
    paymentPercentage: s.payment_percentage ?? 0,
    paymentAmount: s.payment_amount ?? 0,
    startDate: s.actual_start ?? s.planned_start ?? undefined,
    completionDate: s.actual_end ?? undefined,
    expectedDuration: 0,
    checklist: (s.checklist_items || []).map((item: any, idx: number) => ({
      id: `chk-${s.id}-${idx}`,
      description: typeof item === 'string' ? item : (item.item || item.description || ''),
      completed: typeof item === 'object' ? !!item.completed : false,
      required: true,
    })),
    dependencies: s.depends_on || [],
    modelElements: [],
  };
}

function mapDeviation(d: any): Deviation {
  return {
    id: d.id,
    projectId: d.project_id,
    elementId: d.element_id,
    elementType: d.element_type,
    severity: d.severity,
    status: d.status,
    detectedAt: d.detected_at,
    detectedBy: d.detected_by || 'system',
    location: `${d.element_type} - ${d.element_name || d.element_id}`,
    description: d.review_notes || `${d.element_type} deviation: ${d.position_deviation_mm}mm (tolerance: ${d.tolerance_mm}mm)`,
    expectedPosition: d.expected_position || undefined,
    actualPosition: d.actual_position || undefined,
    deviationMm: d.position_deviation_mm || d.dimension_deviation_mm || 0,
    toleranceMm: d.tolerance_mm || 0,
    photos: [],
    reviewedBy: d.assigned_to || undefined,
    reviewedAt: d.reviewed_at || undefined,
    resolutionNotes: d.rectification_notes || d.review_notes || undefined,
    resolvedAt: d.rectified_at || undefined,
  };
}

function mapPayment(p: any): PaymentGate {
  return {
    id: p.id,
    projectId: p.project_id,
    stageId: p.stage_id,
    name: p.description || `Payment Gate`,
    amount: p.amount,
    status: p.status,
    canRelease: p.status === 'ready' || p.status === 'approved',
    releaseDate: p.released_at || undefined,
    blockReasons: p.block_reasons || [],
    milestone: p.description || '',
    retentionPercentage: 5,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Auth
  token: getToken(),
  user: null,
  isAuthenticated: !!getToken(),

  // Initial state
  project: null,
  projects: [],
  stages: [],
  deviations: [],
  payments: [],
  vos: [],
  snags: [],
  photos: [],
  healthScore: null,
  notifications: [],
  loading: false,
  error: null,
  selectedStage: null,
  selectedDeviation: null,
  activeTab: 'overview',
  sidebarOpen: false,

  // ---- Auth actions ----

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res: LoginResponse = await authApi.login(email, password);
      setToken(res.token);
      set({
        token: res.token,
        user: res.user as any,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof ApiError ? err.message : 'Login failed',
        loading: false,
      });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res: LoginResponse = await authApi.register(data);
      setToken(res.token);
      set({
        token: res.token,
        user: res.user as any,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof ApiError ? err.message : 'Registration failed',
        loading: false,
      });
      throw err;
    }
  },

  logout: () => {
    clearToken();
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      project: null,
      projects: [],
      stages: [],
      deviations: [],
      payments: [],
      activeTab: 'overview',
    });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, token });
    } catch {
      clearToken();
      set({ token: null, user: null, isAuthenticated: false });
    }
  },

  // ---- Data loaders ----

  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await projectsApi.list();
      set({ projects, loading: false });
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to load projects', loading: false });
    }
  },

  loadProject: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const project = await projectsApi.get(projectId);

      // Map backend project to frontend Project shape
      const frontendProject: Project = {
        id: project.id,
        name: project.name,
        address: project.address || '',
        location: project.location || '',
        plotNumber: '',
        permitNumber: '',
        teyaseerId: '',
        status: project.status as any || 'active',
        progress: project.progress || 0,
        contractValue: project.contract_value || 0,
        startDate: project.start_date || '',
        expectedCompletion: project.expected_completion || '',
      };

      // Load related data in parallel
      const [stagesData, deviationsData, paymentsData] = await Promise.allSettled([
        stagesApi.list(projectId),
        deviationsApi.list(projectId),
        paymentsApi.listGates(projectId),
      ]);

      const stages = stagesData.status === 'fulfilled'
        ? (Array.isArray(stagesData.value) ? stagesData.value : []).map(mapStage)
        : [];
      const deviations = deviationsData.status === 'fulfilled'
        ? (deviationsData.value?.deviations || []).map(mapDeviation)
        : [];
      const payments = paymentsData.status === 'fulfilled'
        ? (Array.isArray(paymentsData.value) ? paymentsData.value : []).map(mapPayment)
        : [];

      set({
        project: frontendProject,
        stages,
        deviations,
        payments,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof ApiError ? err.message : 'Failed to load project',
        loading: false,
      });
    }
  },

  // Setters
  setProject: (project) => set({ project }),
  setStages: (stages) => set({ stages }),
  setDeviations: (deviations) => set({ deviations }),
  setPayments: (payments) => set({ payments }),
  setVOs: (vos) => set({ vos }),
  setSnags: (snags) => set({ snags }),
  setPhotos: (photos) => set({ photos }),
  setHealthScore: (healthScore) => set({ healthScore }),

  // ---- Stage actions ----

  startStage: async (stageId) => {
    set({ loading: true, error: null });
    try {
      const { user } = get();
      await stagesApi.start(stageId, user?.id || '');
      // Reload stages
      const { project } = get();
      if (project) {
        const stagesData = await stagesApi.list(project.id);
        set({ stages: (Array.isArray(stagesData) ? stagesData : []).map(mapStage), loading: false });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to start stage', loading: false });
    }
  },

  submitStage: async (stageId) => {
    set({ loading: true, error: null });
    try {
      await stagesApi.submit(stageId);
      const { project } = get();
      if (project) {
        const stagesData = await stagesApi.list(project.id);
        set({ stages: (Array.isArray(stagesData) ? stagesData : []).map(mapStage), loading: false });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to submit stage', loading: false });
    }
  },

  approveStage: async (stageId) => {
    set({ loading: true, error: null });
    try {
      const { user } = get();
      await stagesApi.approve(stageId, user?.full_name || user?.id || '');
      const { project } = get();
      if (project) {
        const stagesData = await stagesApi.list(project.id);
        set({ stages: (Array.isArray(stagesData) ? stagesData : []).map(mapStage), loading: false });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to approve stage', loading: false });
    }
  },

  updateChecklist: async (stageId, itemIndex, completed) => {
    try {
      await stagesApi.updateChecklist(stageId, itemIndex, completed);
      const { project } = get();
      if (project) {
        const stagesData = await stagesApi.list(project.id);
        set({ stages: (Array.isArray(stagesData) ? stagesData : []).map(mapStage) });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to update checklist' });
    }
  },

  // ---- Deviation actions ----

  acceptDeviation: async (deviationId, notes) => {
    try {
      const { user } = get();
      await deviationsApi.accept(deviationId, user?.full_name || '', notes);
      const { project } = get();
      if (project) {
        const data = await deviationsApi.list(project.id);
        set({ deviations: (data?.deviations || []).map(mapDeviation) });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to accept deviation' });
    }
  },

  rejectDeviation: async (deviationId, notes) => {
    try {
      const { user } = get();
      await deviationsApi.reject(deviationId, user?.full_name || '', notes);
      const { project } = get();
      if (project) {
        const data = await deviationsApi.list(project.id);
        set({ deviations: (data?.deviations || []).map(mapDeviation) });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to reject deviation' });
    }
  },

  rectifyDeviation: async (deviationId, notes) => {
    try {
      await deviationsApi.rectify(deviationId, notes);
      const { project } = get();
      if (project) {
        const data = await deviationsApi.list(project.id);
        set({ deviations: (data?.deviations || []).map(mapDeviation) });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to mark deviation rectified' });
    }
  },

  // ---- Payment actions ----

  requestPaymentRelease: async (paymentId) => {
    try {
      const { user } = get();
      await paymentsApi.requestRelease(paymentId, user?.full_name || '');
      const { project } = get();
      if (project) {
        const data = await paymentsApi.listGates(project.id);
        set({ payments: (Array.isArray(data) ? data : []).map(mapPayment) });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to request payment release' });
    }
  },

  approvePayment: async (paymentId) => {
    try {
      const { user } = get();
      await paymentsApi.approve(paymentId, user?.full_name || '');
      const { project } = get();
      if (project) {
        const data = await paymentsApi.listGates(project.id);
        set({ payments: (Array.isArray(data) ? data : []).map(mapPayment) });
      }
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Failed to approve payment' });
    }
  },

  // ---- UI actions ----
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  selectStage: (stageId) => set({ selectedStage: stageId }),
  selectDeviation: (deviationId) => set({ selectedDeviation: deviationId }),
  markNotificationRead: (notificationId) => {
    const { notifications } = get();
    set({
      notifications: notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      ),
    });
  },
}));
