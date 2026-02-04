import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  PauseCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  AlertTriangle,
  BookOpen,
  Shield,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectStore } from '@/store/projectStore';
import { 
  stageChecklists, 
  getErrorsForStage, 
  getCriticalErrors,
  type ConstructionError 
} from '@/lib/construction-knowledge';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export function StageManager() {
  const { stages, updateChecklist, startStage, submitStage, approveStage } = useProjectStore();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<'checklist' | 'errors' | 'requirements'>('checklist');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <Play className="h-5 w-5 text-blue-600" />;
      case 'pending_approval': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'not_started': return <PauseCircle className="h-5 w-5 text-slate-400" />;
      default: return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'not_started': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending_approval': return 'bg-yellow-500';
      default: return 'bg-slate-300';
    }
  };

  const canStartStage = (stage: typeof stages[0], index: number) => {
    if (stage.status !== 'not_started') return false;
    if (index === 0) return true;
    const prevStage = stages[index - 1];
    return prevStage?.status === 'approved';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Construction Stages</h2>
          <p className="text-slate-500">UAE villa construction with quality checkpoints</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-4 py-2">
            {stages.filter(s => s.status === 'approved').length}/{stages.length} Complete
          </Badge>
          <Badge variant="destructive" className="text-base px-4 py-2">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {getCriticalErrors().length} Critical Risks
          </Badge>
        </div>
      </div>

      {/* Critical Errors Alert */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Common Construction Mistakes in UAE</p>
              <p className="text-sm text-red-700">
                Based on "أخطاء شائعة في البناء" research. Each stage includes prevention guidelines 
                for the most common errors in villa construction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stages List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {stages.map((stage, index) => {
          const isExpanded = expandedStage === stage.id;
          const completedTasks = stage.checklist.filter(c => c.completed).length;
          const totalTasks = stage.checklist.length;
          const stageInfo = stageChecklists.find(s => s.stageId === stage.id);
          const stageErrors = getErrorsForStage(stage.id);

          return (
            <motion.div key={stage.id} variants={itemVariants}>
              <Card className={cn(
                "transition-all",
                stage.status === 'in_progress' && "ring-2 ring-blue-200 border-blue-300",
                isExpanded && "shadow-lg"
              )}>
                <CardContent className="p-0">
                  {/* Main Row */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Stage Number */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0",
                        stage.status === 'approved' ? 'bg-green-500 text-white' :
                        stage.status === 'in_progress' ? 'bg-blue-500 text-white' :
                        stage.status === 'pending_approval' ? 'bg-yellow-500 text-white' :
                        'bg-slate-200 text-slate-500'
                      )}>
                        {index + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h3 className="font-semibold text-slate-900">{stage.name}</h3>
                            {stageInfo && (
                              <p className="text-xs text-slate-400">{stageInfo.stageNameAr}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {stageErrors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {stageErrors.length} risks
                              </Badge>
                            )}
                            <span className="text-sm text-slate-500">
                              {completedTasks}/{totalTasks} tasks
                            </span>
                            <Badge className={cn("capitalize", getStatusBadgeClass(stage.status))}>
                              {stage.status.replace('_', ' ')}
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all", getStatusColor(stage.status))}
                              style={{ width: `${stage.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700 w-12 text-right">
                            {stage.progressPercentage}%
                          </span>
                        </div>

                        {/* Payment Info */}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-slate-500">
                            Payment: <span className="font-medium text-slate-700">{stage.paymentPercentage}%</span>
                            {' '}({stage.paymentAmount.toLocaleString()} AED)
                          </span>
                          {stageInfo && (
                            <span className="text-slate-400">
                              Duration: {stageInfo.duration}
                            </span>
                          )}
                          {stage.startDate && (
                            <span className="text-slate-400">
                              Started: {new Date(stage.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {canStartStage(stage, index) && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); startStage(stage.id); }}>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {stage.status === 'in_progress' && stage.progressPercentage === 100 && (
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); submitStage(stage.id); }}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Submit
                          </Button>
                        )}
                        {stage.status === 'pending_approval' && (
                          <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); approveStage(stage.id); }}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && stageInfo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100"
                      >
                        {/* Info Tabs */}
                        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100">
                          {(['checklist', 'errors', 'requirements'] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={(e) => { e.stopPropagation(); setActiveInfoTab(tab); }}
                              className={cn(
                                "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2",
                                activeInfoTab === tab 
                                  ? "border-blue-500 text-blue-700" 
                                  : "border-transparent text-slate-500 hover:text-slate-700"
                              )}
                            >
                              {tab === 'errors' && stageErrors.length > 0 && (
                                <span className="mr-1">({stageErrors.length})</span>
                              )}
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="p-4 bg-slate-50/50">
                          {/* Checklist Tab */}
                          {activeInfoTab === 'checklist' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-slate-900">Quality Checklist</h4>
                                <span className="text-sm text-slate-500">
                                  {stage.checklist.filter(c => c.completed).length}/{stage.checklist.length} completed
                                </span>
                              </div>
                              <div className="space-y-2">
                                {stage.checklist.map((item) => {
                                  const checklistInfo = stageInfo?.checklist.find(c => c.id === item.id);
                                  return (
                                    <div 
                                      key={item.id} 
                                      className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg bg-white border",
                                        item.completed ? "border-green-200" : "border-slate-200"
                                      )}
                                    >
                                      <Checkbox 
                                        checked={item.completed}
                                        onCheckedChange={(checked) => updateChecklist(stage.id, item.id, checked as boolean)}
                                        disabled={stage.status === 'approved'}
                                      />
                                      <div className="flex-1">
                                        <p className={cn(
                                          "text-sm",
                                          item.completed ? "text-slate-500 line-through" : "text-slate-700"
                                        )}>
                                          {item.description}
                                          {checklistInfo?.critical && (
                                            <span className="text-red-500 ml-1">*</span>
                                          )}
                                        </p>
                                        {checklistInfo && (
                                          <p className="text-xs text-slate-400 mt-1">
                                            {checklistInfo.descriptionAr}
                                          </p>
                                        )}
                                        {item.completed && item.verifiedBy && (
                                          <p className="text-xs text-slate-400 mt-1">
                                            Verified by {item.verifiedBy} on {new Date(item.completedAt!).toLocaleDateString()}
                                          </p>
                                        )}
                                        {checklistInfo?.commonMistakes && checklistInfo.commonMistakes.length > 0 && (
                                          <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
                                            <span className="font-medium">Common mistakes:</span>{' '}
                                            {checklistInfo.commonMistakes.join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Errors Tab */}
                          {activeInfoTab === 'errors' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  Common Mistakes & Prevention
                                </h4>
                              </div>
                              {stageErrors.length === 0 ? (
                                <div className="p-4 bg-green-50 rounded-lg text-center">
                                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                  <p className="text-green-800">No common errors documented for this stage</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {stageErrors.map((error) => (
                                    <ErrorCard key={error.id} error={error} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Requirements Tab */}
                          {activeInfoTab === 'requirements' && (
                            <div className="space-y-4">
                              <h4 className="font-medium text-slate-900">Approval Requirements</h4>
                              <div className="space-y-2">
                                {stageInfo.approvalRequirements.map((req, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                    <CheckCircle className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">{req}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {stage.dependencies.length > 0 && (
                                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                  <div className="flex items-center gap-2 text-amber-800">
                                    <Lock className="h-4 w-4" />
                                    <span className="text-sm font-medium">Dependencies</span>
                                  </div>
                                  <p className="text-sm text-amber-700 mt-1">
                                    Cannot start until previous stages are approved
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// Error Card Component
function ErrorCard({ error }: { error: ConstructionError }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      error.severity === 'critical' ? "bg-red-50 border-red-200" :
      error.severity === 'major' ? "bg-orange-50 border-orange-200" :
      "bg-yellow-50 border-yellow-200"
    )}>
      <div 
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className={cn(
            "h-5 w-5 flex-shrink-0 mt-0.5",
            error.severity === 'critical' ? "text-red-600" :
            error.severity === 'major' ? "text-orange-600" :
            "text-yellow-600"
          )} />
          <div>
            <p className="font-medium text-slate-900">{error.titleEn}</p>
            <p className="text-sm text-slate-500">{error.titleAr}</p>
          </div>
        </div>
        <Badge className={cn(
          error.severity === 'critical' ? "bg-red-100 text-red-800" :
          error.severity === 'major' ? "bg-orange-100 text-orange-800" :
          "bg-yellow-100 text-yellow-800"
        )}>
          {error.severity}
        </Badge>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-slate-200/50"
          >
            <p className="text-sm text-slate-600 mb-3">{error.description}</p>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Consequences
                </p>
                <ul className="mt-1 space-y-1">
                  {error.consequences.map((c, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-green-700 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Prevention
                </p>
                <ul className="mt-1 space-y-1">
                  {error.prevention.map((p, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Info className="h-4 w-4" />
                Detection: {error.detectionMethod}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
