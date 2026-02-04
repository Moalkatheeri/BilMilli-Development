import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { constructionErrors } from '../data/constructionErrors';
import type { Severity, ErrorCategory } from '../types';

const categoryLabels: Record<ErrorCategory, string> = {
  design: 'Design',
  foundation: 'Foundation',
  structure: 'Structure',
  mep: 'MEP',
  finishing: 'Finishing',
  external: 'External',
  contractual: 'Contractual',
};

const severityOrder: Severity[] = ['critical', 'major', 'minor'];

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<ErrorCategory | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');

  const filtered = constructionErrors.filter((e) => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.titleEn.toLowerCase().includes(q) ||
        e.titleAr.includes(search) ||
        e.description.toLowerCase().includes(q) ||
        e.prevention.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = severityOrder.reduce<Record<string, typeof filtered>>((acc, sev) => {
    const items = filtered.filter((e) => e.severity === sev);
    if (items.length > 0) acc[sev] = items;
    return acc;
  }, {});

  return (
    <div>
      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search errors in English or Arabic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 34 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="var(--color-text-muted)" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ErrorCategory | 'all')}
            >
              <option value="all">All Categories</option>
              {(Object.keys(categoryLabels) as ErrorCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as Severity | 'all')}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        Showing {filtered.length} of {constructionErrors.length} documented errors
      </div>

      {/* Grouped error cards */}
      {Object.entries(grouped).map(([severity, errors]) => (
        <div key={severity} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className={`badge badge-${severity}`}>{severity}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="error-list">
            {errors.map((error) => (
              <div key={error.id} className={`error-card ${error.severity}`}>
                <div className="error-card-header">
                  <div>
                    <div className="error-title">
                      [{error.id}] {error.titleEn}
                    </div>
                    <div className="error-title-ar">{error.titleAr}</div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: 'var(--color-bg-hover)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {categoryLabels[error.category]}
                  </span>
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
        </div>
      ))}

      {filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--color-text-muted)',
          }}
        >
          <p style={{ fontSize: '1rem', marginBottom: 8 }}>No errors match your filters.</p>
          <p style={{ fontSize: '0.85rem' }}>Try adjusting the search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}
