import { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2, ArrowRight, Loader2 } from 'lucide-react';

export function ProjectSelector() {
  const { projects, loading, error, loadProjects, setActiveTab, loadProject } = useProjectStore();
  
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  const handleSelectProject = (projectId: string) => {
    loadProject(projectId);
  };
  
  const handleCreateProject = () => {
    setActiveTab('new-project');
  };
  
  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading projects...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Projects</h1>
          <p className="text-slate-400">Select a project to manage or create a new one</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-900/50 border border-rose-700 rounded-lg text-rose-200">
            {error}
          </div>
        )}
        
        {projects.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-slate-400 mb-6">Create your first project to start tracking construction</p>
              <Button onClick={handleCreateProject} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="bg-slate-800 border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer"
                onClick={() => handleSelectProject(project.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">{project.name}</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        {project.address || project.location}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        project.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        project.status === 'on_hold' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      <ArrowRight className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-slate-500">Progress</span>
                      <p className="text-white font-medium">{project.progress}%</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Value</span>
                      <p className="text-white font-medium">
                        AED {(project.contractValue / 1000000).toFixed(2)}M
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Started</span>
                      <p className="text-white font-medium">
                        {new Date(project.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button 
              onClick={handleCreateProject} 
              variant="outline" 
              className="border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-emerald-500 mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
