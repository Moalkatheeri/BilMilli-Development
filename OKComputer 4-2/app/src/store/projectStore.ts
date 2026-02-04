import { create } from 'zustand';
import type { 
  Project, ConstructionStage, Deviation, PaymentGate, 
  VariationOrder, Snag, PhotoCapture, HealthScore, Notification 
} from '@/types';
import { demoData } from '@/lib/demo-data';

interface ProjectState {
  // Data
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
  
  // Actions
  setProject: (project: Project) => void;
  setStages: (stages: ConstructionStage[]) => void;
  setDeviations: (deviations: Deviation[]) => void;
  setPayments: (payments: PaymentGate[]) => void;
  setVOs: (vos: VariationOrder[]) => void;
  setSnags: (snags: Snag[]) => void;
  setPhotos: (photos: PhotoCapture[]) => void;
  setHealthScore: (score: HealthScore) => void;
  
  // Actions - Stage
  startStage: (stageId: string) => void;
  submitStage: (stageId: string) => void;
  approveStage: (stageId: string) => void;
  updateChecklist: (stageId: string, itemId: string, completed: boolean) => void;
  
  // Actions - Deviation
  acceptDeviation: (deviationId: string, notes: string) => void;
  rejectDeviation: (deviationId: string, notes: string) => void;
  rectifyDeviation: (deviationId: string, notes: string) => void;
  
  // Actions - Payment
  requestPaymentRelease: (paymentId: string) => void;
  approvePayment: (paymentId: string) => void;
  
  // Actions - UI
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  selectStage: (stageId: string | null) => void;
  selectDeviation: (deviationId: string | null) => void;
  markNotificationRead: (notificationId: string) => void;
  
  // Init
  loadDemoData: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
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

  // Setters
  setProject: (project) => set({ project }),
  setStages: (stages) => set({ stages }),
  setDeviations: (deviations) => set({ deviations }),
  setPayments: (payments) => set({ payments }),
  setVOs: (vos) => set({ vos }),
  setSnags: (snags) => set({ snags }),
  setPhotos: (photos) => set({ photos }),
  setHealthScore: (healthScore) => set({ healthScore }),

  // Stage Actions
  startStage: (stageId) => {
    const { stages } = get();
    const updatedStages = stages.map(s => 
      s.id === stageId 
        ? { ...s, status: 'in_progress' as const, startDate: new Date().toISOString() }
        : s
    );
    set({ stages: updatedStages });
  },

  submitStage: (stageId) => {
    const { stages } = get();
    const updatedStages = stages.map(s => 
      s.id === stageId 
        ? { ...s, status: 'pending_approval' as const }
        : s
    );
    set({ stages: updatedStages });
  },

  approveStage: (stageId) => {
    const { stages, payments } = get();
    const updatedStages = stages.map(s => 
      s.id === stageId 
        ? { ...s, status: 'approved' as const, completionDate: new Date().toISOString(), progressPercentage: 100 }
        : s
    );
    // Update related payment
    const updatedPayments = payments.map(p => 
      p.stageId === stageId 
        ? { ...p, canRelease: true, status: 'ready' as const }
        : p
    );
    set({ stages: updatedStages, payments: updatedPayments });
  },

  updateChecklist: (stageId, itemId, completed) => {
    const { stages } = get();
    const updatedStages = stages.map(s => {
      if (s.id !== stageId) return s;
      const updatedChecklist = s.checklist.map(item =>
        item.id === itemId 
          ? { ...item, completed, completedAt: completed ? new Date().toISOString() : undefined }
          : item
      );
      const progressPercentage = Math.round(
        (updatedChecklist.filter(i => i.completed).length / updatedChecklist.length) * 100
      );
      return { ...s, checklist: updatedChecklist, progressPercentage };
    });
    set({ stages: updatedStages });
  },

  // Deviation Actions
  acceptDeviation: (deviationId, notes) => {
    const { deviations } = get();
    const updatedDeviations = deviations.map(d =>
      d.id === deviationId
        ? { ...d, status: 'accepted' as const, reviewedAt: new Date().toISOString(), resolutionNotes: notes }
        : d
    );
    set({ deviations: updatedDeviations });
  },

  rejectDeviation: (deviationId, notes) => {
    const { deviations } = get();
    const updatedDeviations = deviations.map(d =>
      d.id === deviationId
        ? { ...d, status: 'rejected' as const, reviewedAt: new Date().toISOString(), resolutionNotes: notes }
        : d
    );
    set({ deviations: updatedDeviations });
  },

  rectifyDeviation: (deviationId, notes) => {
    const { deviations } = get();
    const updatedDeviations = deviations.map(d =>
      d.id === deviationId
        ? { ...d, status: 'rectified' as const, resolvedAt: new Date().toISOString(), resolutionNotes: notes }
        : d
    );
    set({ deviations: updatedDeviations });
  },

  // Payment Actions
  requestPaymentRelease: (paymentId) => {
    const { payments } = get();
    const updatedPayments = payments.map(p =>
      p.id === paymentId
        ? { ...p, status: 'approved' as const }
        : p
    );
    set({ payments: updatedPayments });
  },

  approvePayment: (paymentId) => {
    const { payments } = get();
    const updatedPayments = payments.map(p =>
      p.id === paymentId
        ? { ...p, status: 'released' as const, releaseDate: new Date().toISOString() }
        : p
    );
    set({ payments: updatedPayments });
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

  // Load Demo Data
  loadDemoData: () => {
    set({
      project: demoData.project,
      stages: demoData.stages,
      deviations: demoData.deviations,
      payments: demoData.payments,
      vos: demoData.vos,
      snags: demoData.snags,
      photos: demoData.photos,
      healthScore: demoData.healthScore,
      notifications: demoData.notifications as Notification[],
    });
  },
}));
