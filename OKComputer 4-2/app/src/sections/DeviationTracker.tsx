import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Eye,
  Share2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function DeviationTracker() {
  const { deviations, photos, rectifyDeviation, acceptDeviation, rejectDeviation } = useProjectStore();
  const [selectedDeviation, setSelectedDeviation] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'rectify' | null>(null);
  const [notes, setNotes] = useState('');

  const activeDeviations = deviations.filter(d => d.status !== 'rectified' && d.status !== 'closed');
  const resolvedDeviations = deviations.filter(d => d.status === 'rectified' || d.status === 'closed');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: 'text-red-600' };
      case 'major': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: 'text-orange-600' };
      case 'minor': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', icon: 'text-yellow-600' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: 'text-slate-500' };
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'detected': return 'bg-red-100 text-red-800 border-red-300';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rejected': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rectified': return 'bg-green-100 text-green-800 border-green-300';
      case 'closed': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleAction = () => {
    if (!selectedDeviation || !actionType) return;
    
    switch (actionType) {
      case 'accept':
        acceptDeviation(selectedDeviation, notes);
        break;
      case 'reject':
        rejectDeviation(selectedDeviation, notes);
        break;
      case 'rectify':
        rectifyDeviation(selectedDeviation, notes);
        break;
    }
    
    setSelectedDeviation(null);
    setActionType(null);
    setNotes('');
  };

  const getDeviationPhotos = (deviationId: string) => {
    return photos.filter(p => p.relatedDeviationId === deviationId);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Deviation Events</h2>
          <p className="text-slate-500">Track and manage construction deviations</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="text-base px-3 py-1">
            {activeDeviations.filter(d => d.severity === 'critical').length} Critical
          </Badge>
          <Badge className="bg-orange-100 text-orange-800 text-base px-3 py-1">
            {activeDeviations.filter(d => d.severity === 'major').length} Major
          </Badge>
        </div>
      </div>

      {/* Active Deviations */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Active Issues ({activeDeviations.length})
        </h3>
        
        {activeDeviations.map((deviation) => {
          const colors = getSeverityColor(deviation.severity);
          const deviationPhotos = getDeviationPhotos(deviation.id);

          return (
            <motion.div key={deviation.id} variants={itemVariants}>
              <Card className={cn("border-l-4", colors.border)}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Icon & Severity */}
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", colors.bg)}>
                      <AlertTriangle className={cn("h-6 w-6", colors.icon)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 capitalize">
                          {deviation.elementType} Deviation
                        </h3>
                        <Badge className={cn("capitalize", getStatusBadgeClass(deviation.status))}>
                          {deviation.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={cn("capitalize", colors.bg, colors.text, colors.border)}>
                          {deviation.severity}
                        </Badge>
                      </div>

                      <p className="text-slate-600 mb-3">{deviation.description}</p>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-slate-400">Deviation</p>
                          <p className="font-semibold text-red-600">{deviation.deviationMm}mm</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Tolerance</p>
                          <p className="font-medium">±{deviation.toleranceMm}mm</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Detected</p>
                          <p className="font-medium">{new Date(deviation.detectedAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Photos</p>
                          <p className="font-medium">{deviationPhotos.length}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                        <MapPin className="h-4 w-4" />
                        {deviation.location}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Photos
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4 mr-1" />
                          Share with Consultant
                        </Button>
                        {deviation.status === 'detected' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => { setSelectedDeviation(deviation.id); setActionType('accept'); }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => { setSelectedDeviation(deviation.id); setActionType('reject'); }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {(deviation.status === 'detected' || deviation.status === 'under_review') && (
                          <Button 
                            size="sm"
                            onClick={() => { setSelectedDeviation(deviation.id); setActionType('rectify'); }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Mark Rectified
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Resolved Deviations */}
      {resolvedDeviations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolved Issues ({resolvedDeviations.length})
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resolvedDeviations.map((deviation) => (
              <Card key={deviation.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900 capitalize">{deviation.elementType}</h4>
                        <Badge className="bg-green-100 text-green-800">{deviation.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">{deviation.location}</p>
                      {deviation.resolutionNotes && (
                        <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                          {deviation.resolutionNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!selectedDeviation} onOpenChange={() => setSelectedDeviation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' && 'Accept Deviation'}
              {actionType === 'reject' && 'Reject Deviation'}
              {actionType === 'rectify' && 'Mark as Rectified'}
            </DialogTitle>
            <DialogDescription>
              Add notes to document your decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDeviation(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAction}
              className={cn(
                actionType === 'accept' && "bg-green-600 hover:bg-green-700",
                actionType === 'reject' && "bg-red-600 hover:bg-red-700",
              )}
            >
              {actionType === 'accept' && 'Accept'}
              {actionType === 'reject' && 'Reject'}
              {actionType === 'rectify' && 'Mark Rectified'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
