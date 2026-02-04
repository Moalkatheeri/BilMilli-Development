import {
  ClipboardCheck,
  AlertTriangle,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react';
import { stages } from '../data/stages';
import { constructionErrors } from '../data/constructionErrors';

export default function Dashboard() {
  const totalTasks = stages.reduce((sum, s) => sum + s.checklist.length, 0);
  const totalErrors = constructionErrors.length;
  const totalRequirements = stages.reduce((sum, s) => sum + s.requirements.length, 0);
  const criticalErrors = constructionErrors.filter((e) => e.severity === 'critical').length;

  const errorsByCategory = constructionErrors.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    design: 'Design',
    foundation: 'Foundation',
    structure: 'Structure',
    mep: 'MEP',
    finishing: 'Finishing',
    external: 'External',
    contractual: 'Contractual',
  };

  const categoryColors: Record<string, string> = {
    design: 'var(--color-primary)',
    foundation: 'var(--color-warning)',
    structure: 'var(--color-danger)',
    mep: '#a855f7',
    finishing: 'var(--color-gold)',
    external: 'var(--color-success)',
    contractual: '#f97316',
  };

  return (
    <div>
      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
            <ClipboardCheck size={20} />
          </div>
          <div className="stat-value">{stages.length}</div>
          <div className="stat-label">Construction Stages</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-value">{totalTasks}</div>
          <div className="stat-label">Checklist Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-value">{totalErrors}</div>
          <div className="stat-label">Documented Errors</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
            <FileText size={20} />
          </div>
          <div className="stat-value">{totalRequirements}</div>
          <div className="stat-label">Required Documents</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Stage Progress */}
        <div className="card">
          <div className="card-header">
            <h2>
              <TrendingUp size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Stage Progress
            </h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stages.map((stage) => (
                <div key={stage.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      {stage.order}. {stage.nameEn}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {stage.checklist.filter((c) => c.completed).length}/{stage.checklist.length} tasks
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-bar-fill ${stage.progress === 100 ? 'success' : ''}`}
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Breakdown */}
        <div className="card">
          <div className="card-header">
            <h2>
              <Shield size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Errors by Category
            </h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(errorsByCategory).map(([cat, count]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: categoryColors[cat],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{categoryLabels[cat]}</span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                background: 'var(--color-danger-bg)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} color="var(--color-danger)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                {criticalErrors} critical errors require immediate attention
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h2>
            <Clock size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            About This Platform
          </h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div
              style={{
                padding: 16,
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-gold)' }}>
                Knowledge Source
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Based on "أخطاء شائعة في البناء" (Common Construction Mistakes) and UAE
                building codes. Covers design through handover with bilingual guidance.
              </p>
            </div>
            <div
              style={{
                padding: 16,
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-primary)' }}>
                For Homeowners
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Track every stage of your villa construction, understand common mistakes,
                and ensure quality with professional checklists and document requirements.
              </p>
            </div>
            <div
              style={{
                padding: 16,
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-success)' }}>
                UAE-Specific
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Tailored for UAE climate, regulations, and building practices. References
                DEWA, Civil Defense, and municipality requirements throughout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
