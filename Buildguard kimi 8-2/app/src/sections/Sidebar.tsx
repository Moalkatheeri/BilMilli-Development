import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Layers, 
  AlertTriangle, 
  Wallet, 
  Box, 
  Camera, 
  Users, 
  FileText, 
  Settings,
  Phone,
  ChevronRight,
  Plus,
  Upload
} from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';

const menuItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'stages', label: 'Stages', icon: Layers },
  { id: 'issues', label: 'Issues', icon: AlertTriangle, badge: 'deviations' },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'model', label: '3D Model', icon: Box },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'contractor', label: 'Contractor', icon: Users },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, deviations } = useProjectStore();

  const getBadgeCount = (badgeType: string) => {
    if (badgeType === 'deviations') {
      return deviations.filter(d => d.status !== 'rectified' && d.status !== 'closed').length;
    }
    return 0;
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => useProjectStore.getState().toggleSidebar()}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          x: sidebarOpen ? 0 : -100 + '%',
          opacity: sidebarOpen ? 1 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-slate-200 z-40 overflow-y-auto",
          "lg:translate-x-0 lg:opacity-100"
        )}
      >
        {/* New Project Button */}
        <div className="p-4">
          <button 
            onClick={() => setActiveTab('new-project')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Project
          </button>
        </div>

        <nav className="px-4 pb-4 space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) {
                    useProjectStore.getState().toggleSidebar();
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5", isActive ? 'text-blue-600' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {badgeCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {badgeCount}
                    </span>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 text-blue-600" />}
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Quick Upload */}
        <div className="px-4 py-3 border-t border-slate-200">
          <button 
            onClick={() => setActiveTab('upload')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Upload className="h-5 w-5 text-slate-400" />
            <span>Upload Plans</span>
          </button>
        </div>

        {/* Help Card */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <p className="font-medium text-blue-900 text-sm mb-1">Need Help?</p>
            <p className="text-xs text-blue-700 mb-3">Contact your Teyaseer advisor</p>
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 text-sm font-medium rounded-lg transition-colors border border-blue-200">
              <Phone className="h-4 w-4" />
              800-555
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
