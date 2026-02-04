import { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  ClipboardCheck,
  Upload,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const mainNav = [
  { id: 'dashboard', label: 'Dashboard', labelAr: 'لوحة المتابعة', icon: LayoutDashboard },
  { id: 'stages', label: 'Stage Manager', labelAr: 'إدارة المراحل', icon: ClipboardCheck },
  { id: 'viewer', label: '3D Viewer', labelAr: 'العرض ثلاثي الأبعاد', icon: Box },
  { id: 'upload', label: 'File Upload', labelAr: 'رفع الملفات', icon: Upload },
];

const resourceNav = [
  { id: 'knowledge', label: 'Error Database', labelAr: 'قاعدة الأخطاء', icon: BookOpen },
  { id: 'settings', label: 'Settings', labelAr: 'الإعدادات', icon: Settings },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    main: true,
    resources: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>
          <span className="brand-icon">BG</span>
          BuildGuard Pro
        </h1>
        <p>UAE Villa Construction Quality</p>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <button
            className="sidebar-section-title"
            onClick={() => toggleSection('main')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}
          >
            {expandedSections.main ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Main
          </button>
          {expandedSections.main &&
            mainNav.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <item.icon className="nav-icon" size={18} />
                {item.label}
              </button>
            ))}
        </div>

        <div className="sidebar-section">
          <button
            className="sidebar-section-title"
            onClick={() => toggleSection('resources')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}
          >
            {expandedSections.resources ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Resources
          </button>
          {expandedSections.resources &&
            resourceNav.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <item.icon className="nav-icon" size={18} />
                {item.label}
              </button>
            ))}
        </div>
      </nav>
    </aside>
  );
}
