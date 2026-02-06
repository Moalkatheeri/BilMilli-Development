import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '@/store/projectStore';
import { Loader2, Plus, Building2, MapPin, TrendingUp } from 'lucide-react';

export function ProjectSelector() {
  const { projects, loadProjects, loadProject, setActiveTab, loading, error } = useProjectStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  const handleSelectProject = async (projectId: string) => {
    await loadProject(projectId);
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Projects</h1>
            <p className="text-slate-500 mt-1">Select a project to manage or create a new one</p>
          </div>
          <button
            onClick={() => setActiveTab('new-project')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => loadProjects()}
              className="text-red-800 underline hover:no-underline font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {projects.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white rounded-2xl border border-slate-200"
          >
            <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No projects yet</h2>
            <p className="text-slate-500 mb-6">Create your first project to get started</p>
            <button
              onClick={() => setActiveTab('new-project')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Project
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, index) => (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelectProject(project.id)}
                className="text-left p-6 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {project.name}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : project.status === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {project.status}
                  </span>
                </div>

                {project.location && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.location}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                    {Math.round(project.progress || 0)}% complete
                  </div>
                  {project.contract_value > 0 && (
                    <div className="text-sm text-slate-500">
                      AED {(project.contract_value / 1000000).toFixed(1)}M
                    </div>
                  )}
                </div>

                <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                  />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
