import { motion } from 'framer-motion';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

export function PhotoGallery() {
  const { photos, stages } = useProjectStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'issues' | 'compliant'>('all');

  const filteredPhotos = photos.filter(photo => {
    if (filter === 'all') return true;
    if (filter === 'issues') return photo.aiAnalysis?.complianceStatus === 'attention_needed' || photo.aiAnalysis?.complianceStatus === 'non_compliant';
    if (filter === 'compliant') return photo.aiAnalysis?.complianceStatus === 'compliant';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'attention_needed':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertTriangle };
      case 'non_compliant':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800', icon: Eye };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Site Photos</h2>
          <p className="text-slate-500">AI-analyzed construction photos</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'issues', 'compliant'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                  filter === f 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === 'grid' 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === 'list' 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button>
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{photos.length}</p>
            <p className="text-xs text-slate-500">Total Photos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {photos.filter(p => p.aiAnalysis?.complianceStatus === 'compliant').length}
            </p>
            <p className="text-xs text-green-600">Compliant</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {photos.filter(p => p.aiAnalysis?.complianceStatus === 'attention_needed').length}
            </p>
            <p className="text-xs text-yellow-600">Attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {photos.filter(p => p.aiAnalysis?.complianceStatus === 'non_compliant').length}
            </p>
            <p className="text-xs text-red-600">Non-Compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Photo Grid */}
      {viewMode === 'grid' ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filteredPhotos.map((photo, index) => {
            const status = getStatusBadge(photo.aiAnalysis?.complianceStatus || 'unknown');
            const StatusIcon = status.icon;
            const stage = stages.find(s => s.id === photo.stageId);

            return (
              <motion.div key={photo.id} variants={itemVariants}>
                <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                  {/* Image Placeholder */}
                  <div className="aspect-video bg-slate-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-300">
                      <Camera className="h-8 w-8 text-slate-400" />
                    </div>
                    
                    {/* AI Score Badge */}
                    {photo.aiAnalysis && (
                      <div className={cn(
                        "absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1",
                        status.bg, status.text
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        AI: {photo.aiAnalysis.qualityScore}/10
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>

                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{photo.caption}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(photo.capturedAt).toLocaleDateString()}
                      </span>
                      {stage && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          {stage.name.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Issues */}
                    {photo.aiAnalysis?.issuesDetected && photo.aiAnalysis.issuesDetected.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {photo.aiAnalysis.issuesDetected.map((issue, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            {issue.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        // List View
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filteredPhotos.map((photo) => {
                const status = getStatusBadge(photo.aiAnalysis?.complianceStatus || 'unknown');
                const StatusIcon = status.icon;
                const stage = stages.find(s => s.id === photo.stageId);

                return (
                  <div key={photo.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                    <div className="w-20 h-14 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Camera className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{photo.caption}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(photo.capturedAt).toLocaleDateString()}
                        </span>
                        {photo.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {photo.location.accuracy.toFixed(1)}m accuracy
                          </span>
                        )}
                        {stage && (
                          <span>{stage.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn(status.bg, status.text)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {photo.aiAnalysis?.qualityScore}/10
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
