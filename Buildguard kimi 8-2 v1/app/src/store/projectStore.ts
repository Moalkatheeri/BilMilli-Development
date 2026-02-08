import { create } from 'zustand';
import type { 
  Project, ConstructionStage, Deviation, PaymentGate, 
  VariationOrder, Snag, PhotoCapture, HealthScore, Notification, User 
} from '@/types';
import { 
  projectsApi, stagesApi, deviationsApi, paymentsApi, 
  authApi, getToken, setToken, clearToken 
} from '@/lib/api';

interface ProjectState {
  // Auth State
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  
  // Data
  projects: Project[];
  project: Project | null;
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
  
  // Auth Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; role: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  
  // Project Actions
  loadProjects: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project | null>;
  
  // Actions - Stage
  startStage: (stageId: string) => Promise<void>;
  submitStage: (stageId: string) => Promise<void>;
  approveStage: (stageId: string) => Promise<void>;
  updateChecklist: (stageId: string, itemId: string, completed: boolean) => Promise<void>;
  
  // Actions - Deviation
  acceptDeviation: (deviationId: string, notes: string) => Promise<void>;
  rejectDeviation: (deviationId: string, notes: string) => Promise<void>;
  rectifyDeviation: (deviationId: string, notes: string) => Promise<void>;
  
  // Actions - Payment
  requestPaymentRelease: (paymentId: string) => Promise<void>;
  approvePayment: (paymentId: string) => Promise<void>;
  
  // Actions - UI
  setProject: (project: Project | null) => void;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  selectStage: (stageId: string | null) => void;
  selectDeviation: (deviationId: string | null) => void;
  markNotificationRead: (notificationId: string) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  token: null,
  user: null,
  projects: [],
  project: null,
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

  // Auth Actions
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { token, user } = await authApi.login(email, password);
      setToken(token);
      set({ isAuthenticated: true, token, user, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', loading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const { token, user } = await authApi.register(data);
      setToken(token);
      set({ isAuthenticated: true, token, user, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', loading: false });
      throw err;
    }
  },

  logout: () => {
    clearToken();
    set({ 
      isAuthenticated: false, 
      token: null, 
      user: null, 
      project: null,
      projects: [],
      stages: [],
      deviations: [],
      payments: []
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
      set({ isAuthenticated: true, token, user });
    } catch {
      clearToken();
      set({ isAuthenticated: false, token: null, user: null });
    }
  },

  // Project Actions
  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const response = await projectsApi.list();
      set({ projects: response.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load projects', loading: false });
    }
  },

  loadProject: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const [project, stagesRes, deviationsRes, paymentsRes] = await Promise.all([
        projectsApi.get(projectId),
        stagesApi.list(projectId),
        deviationsApi.list(projectId),
        paymentsApi.listGates(projectId)
      ]);
      set({ 
        project, 
        stages: stagesRes.items, 
        deviations: deviationsRes.items, 
        payments: paymentsRes.items,
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load project', loading: false });
    }
  },

  createProject: async (data) => {
    set({ loading: true, error: null });
    try {
      const project = await projectsApi.create(data);
      set(state => ({ 
        projects: [...state.projects, project], 
        loading: false 
      }));
      return project;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create project', loading: false });
      return null;
    }
  },

  setProject: (project) => set({ project }),

  // Stage Actions
  startStage: async (stageId) => {
    const { user, project } = get();
    if (!user || !project) return;
    
    set({ loading: true, error: null });
    try {
      await stagesApi.start(stageId, user.id);
      // Reload stages to get updated state
      const stagesRes = await stagesApi.list(project.id);
      set({ stages: stagesRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to start stage', loading: false });
    }
  },

  submitStage: async (stageId) => {
    const { project } = get();
    if (!project) return;
    
    set({ loading: true, error: null });
    try {
      await stagesApi.submit(stageId);
      const stagesRes = await stagesApi.list(project.id);
      set({ stages: stagesRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit stage', loading: false });
    }
  },

  approveStage: async (stageId) => {
    const { user, project } = get();
    if (!user || !project) return;
    
    set({ loading: true, error: null });
    try {
      await stagesApi.approve(stageId, user.id);
      const [stagesRes, paymentsRes] = await Promise.all([
        stagesApi.list(project.id),
        paymentsApi.listGates(project.id)
      ]);
      set({ stages: stagesRes.items, payments: paymentsRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to approve stage', loading: false });
    }
  },

  updateChecklist: async (stageId, itemId, completed) => {
    const { project, stages } = get();
    if (!project) return;
    
    // Find the item index
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    
    const itemIndex = stage.checklist.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    set({ loading: true, error: null });
    try {
      await stagesApi.updateChecklist(stageId, itemIndex, completed);
      const stagesRes = await stagesApi.list(project.id);
      set({ stages: stagesRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update checklist', loading: false });
    }
  },

  // Deviation Actions
  acceptDeviation: async (deviationId, notes) => {
    const { user, project } = get();
    if (!user || !project) return;
    
    set({ loading: true, error: null });
    try {
      await deviationsApi.accept(deviationId, user.id, notes);
      const deviationsRes = await deviationsApi.list(project.id);
      set({ deviations: deviationsRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to accept deviation', loading: false });
    }
  },

  rejectDeviation: async (deviationId, notes) => {
    const { user, project } = get();
    if (!user || !project) return;
    
    set({ loading: true, error: null });
    try {
      await deviationsApi.reject(deviationId, user.id, notes);
      const deviationsRes = await deviationsApi.list(project.id);
      set({ deviations: deviationsRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to reject deviation', loading: false });
    }
  },

  rectifyDeviation: async (deviationId, notes) => {
    const { project } = get();
    if (!project) return;
    
    set({ loading: true, error: null });
    try {
      await deviationsApi.rectify(deviationId, notes);
      const deviationsRes = await deviationsApi.list(project.id);
      set({ deviations: deviationsRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to rectify deviation', loading: false });
    }
  },

  // Payment Actions
  requestPaymentRelease: async (paymentId) => {
    const { user, project } = get();
    if (!user || !project) return;
    
    set({ loading: true, error: null });
    try {
      await paymentsApi.requestRelease(paymentId, user.id);
      const paymentsRes = await paymentsApi.listGates(project.id);
      set({ payments: paymentsRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to request payment release', loading: false });
    }
  },

  approvePayment: async (paymentId) => {
    const { user, project } = get();
    if (!user || !project) return;
    
    set({ loading: true, error: null });
    try {
      await paymentsApi.approve(paymentId, user.id);
      const paymentsRes = await paymentsApi.listGates(project.id);
      set({ payments: paymentsRes.items, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to approve payment', loading: false });
    }
  },

  // UI Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  selectStage: (stageId) => set({ selectedStage: stageId }),
  selectDeviation: (deviationId) => set({ selectedDeviation: deviationId }),
  markNotificationRead: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    set({ notifications: updatedNotifications });
  },
  clearError: () => set({ error: null }),
}));
