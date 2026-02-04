// ── Construction Knowledge Types ──

export type Severity = 'critical' | 'major' | 'minor';
export type ErrorCategory =
  | 'design'
  | 'foundation'
  | 'structure'
  | 'mep'
  | 'finishing'
  | 'external'
  | 'contractual';

export interface ConstructionError {
  id: string;
  titleAr: string;
  titleEn: string;
  category: ErrorCategory;
  description: string;
  consequences: string;
  prevention: string;
  detectionMethod: string;
  severity: Severity;
  stage: string;
}

export interface ChecklistItem {
  id: string;
  taskEn: string;
  taskAr: string;
  commonMistake: string;
  verificationMethod: string;
  isCritical: boolean;
  completed: boolean;
}

export interface RequirementDoc {
  id: string;
  nameEn: string;
  nameAr: string;
  authority: string;
  description: string;
  required: boolean;
}

export interface ConstructionStage {
  id: string;
  nameEn: string;
  nameAr: string;
  order: number;
  icon: string;
  description: string;
  checklist: ChecklistItem[];
  errors: ConstructionError[];
  requirements: RequirementDoc[];
  progress: number;
}

// ── Project Types ──

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed';

export interface Project {
  id: string;
  name: string;
  nameAr: string;
  status: ProjectStatus;
  location: string;
  plotNumber: string;
  stages: ConstructionStage[];
  createdAt: string;
  updatedAt: string;
}

// ── 3D Viewer Types ──

export type FileType = 'dwg' | 'dxf' | 'ifc' | 'pdf' | 'image' | 'glb' | 'gltf';

export interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  url: string;
  uploadedAt: string;
}
