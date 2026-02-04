import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onMenuToggle && (
          <button className="btn-ghost btn-icon" onClick={onMenuToggle}>
            <Menu size={20} />
          </button>
        )}
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-actions">
        <button className="btn-ghost btn-icon">
          <Search size={18} />
        </button>
        <button className="btn-ghost btn-icon" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-danger)',
            }}
          />
        </button>
      </div>
    </header>
  );
}
