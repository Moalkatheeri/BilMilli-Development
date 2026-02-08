import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { useProjectStore } from '@/store/projectStore';
import { Header } from '@/sections/Header';
import { Sidebar } from '@/sections/Sidebar';
import { Dashboard } from '@/sections/Dashboard';
import { StageManager } from '@/sections/StageManager';
import { DeviationTracker } from '@/sections/DeviationTracker';
import { PaymentGates } from '@/sections/PaymentGates';
import { ModelViewer } from '@/sections/ModelViewer';
import { PhotoGallery } from '@/sections/PhotoGallery';
import { ContractorScorecard } from '@/sections/ContractorScorecard';
import { ProjectWizard } from '@/sections/ProjectWizard';
import { ModelUploader } from '@/sections/ModelUploader';
import { FloorPlanAnalyzer } from '@/sections/FloorPlanAnalyzer';
import { LoginPage } from '@/sections/LoginPage';
import { ProjectSelector } from '@/sections/ProjectSelector';
import { Loader2 } from 'lucide-react';

function App() {
  const { isAuthenticated, project, loading, activeTab, checkAuth } = useProjectStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading spinner while checking auth
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading BuildGuard Pro...</p>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - show login page
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" theme="dark" />
      </>
    );
  }

  // Authenticated but no project selected - show project selector
  if (!project && activeTab !== 'new-project') {
    return (
      <>
        <ProjectSelector />
        <Toaster position="top-right" theme="dark" />
      </>
    );
  }

  // Special views that don't need sidebar layout
  const fullPageViews = ['new-project', 'upload', 'analyze'];
  const isFullPage = fullPageViews.includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      {isFullPage ? (
        // Full page view (no sidebar)
        <main className="pt-16 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 lg:p-8"
            >
              {activeTab === 'new-project' && <ProjectWizard />}
              {activeTab === 'upload' && <ModelUploader />}
              {activeTab === 'analyze' && <FloorPlanAnalyzer />}
            </motion.div>
          </AnimatePresence>
        </main>
      ) : (
        // Sidebar layout
        <div className="flex">
          <Sidebar />
          <main className="flex-1 lg:ml-64 pt-16 min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-4 lg:p-8"
              >
                {activeTab === 'overview' && <Dashboard />}
                {activeTab === 'stages' && <StageManager />}
                {activeTab === 'issues' && <DeviationTracker />}
                {activeTab === 'payments' && <PaymentGates />}
                {activeTab === 'model' && <ModelViewer />}
                {activeTab === 'photos' && <PhotoGallery />}
                {activeTab === 'contractor' && <ContractorScorecard />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
      
      <Toaster position="top-right" theme="light" />
    </div>
  );
}

export default App;
