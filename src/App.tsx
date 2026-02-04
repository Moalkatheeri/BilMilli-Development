import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import StageManager from './pages/StageManager';
import Viewer3D from './pages/Viewer3D';
import FileUpload from './pages/FileUpload';
import KnowledgeBase from './pages/KnowledgeBase';
import SettingsPage from './pages/SettingsPage';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  stages: 'Stage Manager',
  viewer: '3D Viewer',
  upload: 'File Upload',
  knowledge: 'Error Database',
  settings: 'Settings',
};

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'stages':
        return <StageManager />;
      case 'viewer':
        return <Viewer3D />;
      case 'upload':
        return <FileUpload />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="main-content">
        <Header title={pageTitles[currentPage] || 'BuildGuard Pro'} />
        <div className="page-content">{renderPage()}</div>
      </main>
    </div>
  );
}

export default App;
