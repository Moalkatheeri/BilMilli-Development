import { Globe, Sun, Bell, Database, Shield } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2>
            <Globe size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Language & Region
          </h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Display Language
              </label>
              <select defaultValue="en" style={{ width: '100%' }}>
                <option value="en">English</option>
                <option value="ar">العربية (Arabic)</option>
                <option value="both">Bilingual (English + Arabic)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Region
              </label>
              <select defaultValue="uae" style={{ width: '100%' }}>
                <option value="uae">United Arab Emirates</option>
                <option value="sa">Saudi Arabia</option>
                <option value="bh">Bahrain</option>
                <option value="om">Oman</option>
                <option value="kw">Kuwait</option>
                <option value="qa">Qatar</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2>
            <Sun size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Appearance
          </h2>
        </div>
        <div className="card-body">
          <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Theme
          </label>
          <select defaultValue="dark" style={{ width: '100%' }}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System Default</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2>
            <Bell size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Notifications
          </h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Stage completion milestones',
              'Critical error warnings',
              'Document expiry reminders',
              'Inspection due dates',
            ].map((item) => (
              <label
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                {item}
                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2>
            <Database size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Data
          </h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline">Export Project Data</button>
            <button className="btn btn-outline">Import Checklist</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>
            <Shield size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            About
          </h2>
        </div>
        <div className="card-body">
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <p><strong>BuildGuard Pro</strong> v1.0.0</p>
            <p style={{ marginTop: 6 }}>
              UAE Villa Construction Quality Management Platform.
              Built with React, TypeScript, and Three.js.
            </p>
            <p style={{ marginTop: 6 }}>
              Knowledge base sourced from "أخطاء شائعة في البناء" and UAE building standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
