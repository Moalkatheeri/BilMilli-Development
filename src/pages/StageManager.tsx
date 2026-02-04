import { useState } from 'react';
import { Check, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { stages } from '../data/stages';
import type { ConstructionStage, ChecklistItem } from '../types';

type TabId = 'checklist' | 'errors' | 'requirements';

export default function StageManager() {
  const [selectedStageId, setSelectedStageId] = useState(stages[0].id);
  const [activeTab, setActiveTab] = useState<TabId>('checklist');
  const [stageData, setStageData] = useState(stages);

  const selectedStage = stageData.find((s) => s.id === selectedStageId)!;

  const toggleChecklist = (stageId: string, itemId: string) => {
    setStageData((prev) =>
      prev.map((stage) => {
        if (stage.id !== stageId) return stage;
        const checklist = stage.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item,
        );
        const completed = checklist.filter((i) => i.completed).length;
        const progress = Math.round((completed / checklist.length) * 100);
        return { ...stage, checklist, progress };
      }),
    );
  };

  return (
    <div className="grid-2">
      {/* Stage List */}
      <div>
        <div className="card">
          <div className="card-header">
            <h2>Construction Stages</h2>
          </div>
          <div className="card-body" style={{ padding: 10 }}>
            <div className="stage-list">
              {stageData.map((stage) => (
                <button
                  key={stage.id}
                  className={`stage-item ${selectedStageId === stage.id ? 'active' : ''}`}
                  onClick={() => setSelectedStageId(stage.id)}
                >
                  <div className="stage-number">{stage.order}</div>
                  <div className="stage-info">
                    <div className="stage-name">{stage.nameEn}</div>
                    <div className="stage-name-ar">{stage.nameAr}</div>
                    <div className="stage-meta">
                      <span>{stage.checklist.length} tasks</span>
                      <span>{stage.errors.length} errors</span>
                      <span>{stage.progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: 6 }}>
                      <div
                        className={`progress-bar-fill ${stage.progress === 100 ? 'success' : ''}`}
                        style={{ width: `${stage.progress}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Detail */}
      <div>
        <div className="card">
          <div className="card-header">
            <div>
              <h2>{selectedStage.nameEn}</h2>
              <p className="text-ar" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {selectedStage.nameAr}
              </p>
            </div>
            <span className="badge badge-success">{selectedStage.progress}% Complete</span>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveTab('checklist')}
            >
              <Check size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Checklist
              <span className="tab-count">{selectedStage.checklist.length}</span>
            </button>
            <button
              className={`tab ${activeTab === 'errors' ? 'active' : ''}`}
              onClick={() => setActiveTab('errors')}
            >
              <AlertTriangle size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Common Errors
              <span className="tab-count">{selectedStage.errors.length}</span>
            </button>
            <button
              className={`tab ${activeTab === 'requirements' ? 'active' : ''}`}
              onClick={() => setActiveTab('requirements')}
            >
              <FileText size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Requirements
              <span className="tab-count">{selectedStage.requirements.length}</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="card-body">
            {activeTab === 'checklist' && (
              <ChecklistTab
                stage={selectedStage}
                onToggle={(itemId) => toggleChecklist(selectedStage.id, itemId)}
              />
            )}
            {activeTab === 'errors' && <ErrorsTab stage={selectedStage} />}
            {activeTab === 'requirements' && <RequirementsTab stage={selectedStage} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Checklist Tab ──
function ChecklistTab({
  stage,
  onToggle,
}: {
  stage: ConstructionStage;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="checklist">
      {stage.checklist.map((item: ChecklistItem) => (
        <div key={item.id} className={`checklist-item ${item.completed ? 'completed' : ''}`}>
          <div
            className={`checklist-checkbox ${item.completed ? 'checked' : ''}`}
            onClick={() => onToggle(item.id)}
          >
            {item.completed && <Check size={14} color="white" />}
          </div>
          <div className="checklist-content">
            <div className="checklist-task">
              {item.taskEn}
              {item.isCritical && <span className="critical-badge">CRITICAL</span>}
            </div>
            <div className="checklist-task-ar">{item.taskAr}</div>
            <div className="checklist-detail">
              <strong>Common mistake: </strong>
              {item.commonMistake}
            </div>
            <div className="checklist-detail">
              <strong>Verification: </strong>
              {item.verificationMethod}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Errors Tab ──
function ErrorsTab({ stage }: { stage: ConstructionStage }) {
  if (stage.errors.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
        <AlertTriangle size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p>No specific errors documented for this stage.</p>
        <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
          Check the Error Database for the full list.
        </p>
      </div>
    );
  }

  return (
    <div className="error-list">
      {stage.errors.map((error) => (
        <div key={error.id} className={`error-card ${error.severity}`}>
          <div className="error-card-header">
            <div>
              <div className="error-title">
                {error.id}: {error.titleEn}
              </div>
              <div className="error-title-ar">{error.titleAr}</div>
            </div>
            <span className={`badge badge-${error.severity}`}>{error.severity}</span>
          </div>
          <div className="error-details">
            <div className="error-detail-row">
              <strong>Description</strong>
              {error.description}
            </div>
            <div className="error-detail-row">
              <strong>Consequences</strong>
              {error.consequences}
            </div>
            <div className="error-detail-row">
              <strong>Prevention</strong>
              {error.prevention}
            </div>
            <div className="error-detail-row">
              <strong>Detection Method</strong>
              {error.detectionMethod}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Requirements Tab ──
function RequirementsTab({ stage }: { stage: ConstructionStage }) {
  return (
    <div className="requirement-list">
      {stage.requirements.map((req) => (
        <div key={req.id} className="requirement-item">
          <div className="requirement-icon">
            <FileText size={20} />
          </div>
          <div className="requirement-content">
            <div className="requirement-name">{req.nameEn}</div>
            <div className="requirement-name-ar">{req.nameAr}</div>
            <div className="requirement-authority">Authority: {req.authority}</div>
            <div className="requirement-desc">{req.description}</div>
          </div>
          <span className={`badge ${req.required ? 'badge-critical' : 'badge-minor'}`}>
            {req.required ? 'Required' : 'Optional'}
          </span>
        </div>
      ))}
    </div>
  );
}
