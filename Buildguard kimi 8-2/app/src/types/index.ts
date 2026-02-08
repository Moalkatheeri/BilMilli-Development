// BuildGuard Pro - Type Definitions

// User & Authentication
export interface User {
  id: string;
  uaePassId: string;
  name: string;
  email: string;
  phone: string;
  role: 'homeowner' | 'contractor' | 'consultant' | 'government';
  avatar?: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  address: string;
  location: string;
  plotNumber: string;
  permitNumber: string;
  teyaseerId?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  progress: number;
  contractValue: number;
  startDate: string;
  expectedCompletion: string;
  actualCompletion?: string;
  homeowner: User;
  contractor: Contractor;
  consultant?: Consultant;
  model?: BIMModel;
}

export interface Contractor {
  id: string;
  name: string;
  license: string;
  rating: number;
  projectsCompleted: number;
  onTimeRate: number;
  qualityScore: number;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface Consultant {
  id: string;
  name: string;
  license: string;
  email: string;
}

// BIM Model
export interface BIMModel {
  id: string;
  projectId: string;
  name: string;
  format: 'ifc' | 'glb' | 'rvt' | 'obj';
  lod: LODLevel;
  url: string;
  thumbnail?: string;
  size: number;
  uploadedAt: string;
  version: number;
  status: 'pending' | 'processing' | 'validated' | 'approved' | 'rejected';
  elements: ModelElement[];
  metadata: ModelMetadata;
}

export type LODLevel = 100 | 200 | 300 | 350 | 400 | 500;

export interface ModelElement {
  id: string;
  globalId: string;
  type: string;
  name: string;
  category: 'architecture' | 'structural' | 'mep' | 'site';
  level: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  material?: string;
  properties: Record<string, any>;
  changeable: boolean;
  frozen: boolean;
}

export interface ModelMetadata {
  sourceSoftware: string;
  exportDate: string;
  unitSystem: 'metric' | 'imperial';
  coordinateSystem?: string;
  northDirection?: number;
}

// Construction Stage
export interface ConstructionStage {
  id: string;
  projectId: string;
  name: string;
  sequence: number;
  status: StageStatus;
  progressPercentage: number;
  paymentPercentage: number;
  paymentAmount: number;
  startDate?: string;
  completionDate?: string;
  expectedDuration: number; // days
  checklist: ChecklistItem[];
  dependencies: string[];
  modelElements: string[]; // Element IDs that must be complete
}

export type StageStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected';

export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  verifiedBy?: string;
  photos?: string[];
  required: boolean;
}

// Payment Gate
export interface PaymentGate {
  id: string;
  projectId: string;
  stageId: string;
  name: string;
  amount: number;
  status: PaymentStatus;
  canRelease: boolean;
  releaseDate?: string;
  blockReasons: string[];
  milestone: string;
  retentionPercentage: number;
  escrowId?: string;
}

export type PaymentStatus = 'pending' | 'ready' | 'approved' | 'released' | 'held';

// Deviation
export interface Deviation {
  id: string;
  projectId: string;
  elementId?: string;
  elementType: string;
  severity: DeviationSeverity;
  status: DeviationStatus;
  detectedAt: string;
  detectedBy: string;
  location: string;
  description: string;
  expectedPosition?: { x: number; y: number; z: number };
  actualPosition?: { x: number; y: number; z: number };
  deviationMm: number;
  toleranceMm: number;
  photos: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
}

export type DeviationSeverity = 'cosmetic' | 'minor' | 'major' | 'critical';
export type DeviationStatus = 'detected' | 'under_review' | 'accepted' | 'rejected' | 'rectified' | 'closed';

// Variation Order
export interface VariationOrder {
  id: string;
  projectId: string;
  voNumber: string;
  title: string;
  description: string;
  type: 'addition' | 'omission' | 'substitution' | 'design_change';
  status: VOStatus;
  requestedBy: string;
  requestedAt: string;
  costImpact: number;
  scheduleImpact: number; // days
  approvedBy?: string;
  approvedAt?: string;
  modelVersion?: number;
  attachments: string[];
  relatedElements: string[];
}

export type VOStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'implemented';

// Snag
export interface Snag {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: SnagType;
  severity: 'low' | 'medium' | 'high';
  status: SnagStatus;
  area: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  assignedAt?: string;
  dueDate?: string;
  photos: string[];
  rectifiedPhotos?: string[];
  verifiedBy?: string;
  verifiedAt?: string;
  closedAt?: string;
}

export type SnagType = 'cosmetic' | 'functional' | 'structural' | 'mep' | 'finishing';
export type SnagStatus = 'open' | 'assigned' | 'in_progress' | 'rectified' | 'verified' | 'closed';

// Photo Capture
export interface PhotoCapture {
  id: string;
  projectId: string;
  sessionId: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  capturedAt: string;
  capturedBy: string;
  stageId?: string;
  location?: GeoLocation;
  cameraPose?: CameraPose;
  aiAnalysis?: AIAnalysis;
  tags: string[];
  relatedDeviationId?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number;
}

export interface CameraPose {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  fov: number;
}

export interface AIAnalysis {
  qualityScore: number;
  issuesDetected: string[];
  elementsDetected: string[];
  progressEstimate?: number;
  complianceStatus: 'compliant' | 'attention_needed' | 'non_compliant';
  recommendations: string[];
}

// Health Score
export interface HealthScore {
  overall: number;
  schedule: { score: number; status: HealthStatus; daysBehind: number };
  quality: { score: number; status: HealthStatus; openIssues: number };
  budget: { score: number; status: HealthStatus; variancePct: number };
  documentation: { score: number; status: HealthStatus; completionPct: number };
  communication: { score: number; status: HealthStatus; responseHours: number };
  recommendations: string[];
}

export type HealthStatus = 'excellent' | 'good' | 'attention_needed' | 'at_risk' | 'critical';

// Notifications
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export type NotificationType = 
  | 'stage_started' 
  | 'stage_approved' 
  | 'deviation_detected' 
  | 'payment_ready' 
  | 'payment_released'
  | 'vo_submitted'
  | 'vo_approved'
  | 'snag_assigned'
  | 'snag_rectified'
  | 'photo_analyzed'
  | 'milestone_reached';

// Export/Report
export interface EvidencePackage {
  id: string;
  projectId: string;
  generatedAt: string;
  generatedBy: string;
  format: 'pdf' | 'zip';
  url: string;
  size: number;
  sections: {
    projectInfo: boolean;
    stages: boolean;
    deviations: boolean;
    photos: boolean;
    payments: boolean;
    vos: boolean;
    snags: boolean;
  };
}
