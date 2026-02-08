import { motion } from 'framer-motion';
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  Wallet, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Building2,
  Star,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';

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

export function Dashboard() {
  const { project, stages, deviations, payments, healthScore, setActiveTab } = useProjectStore();

  if (!project || !healthScore) return null;

  const activeDeviations = deviations.filter(d => d.status !== 'rectified' && d.status !== 'closed');
  const criticalDeviations = activeDeviations.filter(d => d.severity === 'critical');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const blockedPayments = payments.filter(p => !p.canRelease && p.status === 'pending');

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-xl"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              Welcome back, {project.homeowner.name.split(' ')[0]}
            </h2>
            <p className="text-blue-100">
              Your villa is <span className="font-semibold">{project.progress}%</span> complete. 
              {activeDeviations.length > 0 && (
                <span className="text-yellow-300"> {activeDeviations.length} issues need attention.</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-blue-200">Next Payment</p>
              <p className="text-2xl font-bold">
                {pendingPayments[0]?.amount.toLocaleString() || '0'} AED
              </p>
            </div>
            <Button 
              variant="secondary" 
              className="bg-white/20 text-white hover:bg-white/30 border-0"
              onClick={() => setActiveTab('payments')}
            >
              View Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Health Score Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <HealthCard 
          title="Overall Health" 
          score={healthScore.overall} 
          icon={Shield}
          color="blue"
          variants={itemVariants}
        />
        <HealthCard 
          title="Schedule" 
          score={healthScore.schedule.score} 
          icon={Clock}
          subtext={`${healthScore.schedule.daysBehind} days behind`}
          status={healthScore.schedule.status}
          variants={itemVariants}
        />
        <HealthCard 
          title="Quality" 
          score={healthScore.quality.score} 
          icon={CheckCircle}
          subtext={`${healthScore.quality.openIssues} open issues`}
          status={healthScore.quality.status}
          variants={itemVariants}
        />
        <HealthCard 
          title="Budget" 
          score={healthScore.budget.score} 
          icon={Wallet}
          subtext={`${healthScore.budget.variancePct}% variance`}
          status={healthScore.budget.status}
          variants={itemVariants}
        />
        <HealthCard 
          title="Documentation" 
          score={healthScore.documentation.score} 
          icon={FileText}
          subtext={`${healthScore.documentation.completionPct}% complete`}
          status={healthScore.documentation.status}
          variants={itemVariants}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Section */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Construction Progress
              </CardTitle>
              <CardDescription>Track your villa construction journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Progress */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                    <span className="text-sm font-bold text-blue-600">{project.progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    />
                  </div>
                </div>

                {/* Stage Pipeline */}
                <div className="space-y-3">
                  {stages.slice(0, 5).map((stage, index) => (
                    <div key={stage.id} className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                        stage.status === 'approved' ? 'bg-green-100 text-green-700' :
                        stage.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        stage.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-500'
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">{stage.name}</span>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            stage.status === 'approved' && 'border-green-300 text-green-700 bg-green-50',
                            stage.status === 'in_progress' && 'border-blue-300 text-blue-700 bg-blue-50',
                            stage.status === 'pending_approval' && 'border-yellow-300 text-yellow-700 bg-yellow-50',
                          )}>
                            {stage.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              stage.status === 'approved' ? 'bg-green-500' :
                              stage.status === 'in_progress' ? 'bg-blue-500' :
                              stage.status === 'pending_approval' ? 'bg-yellow-500' :
                              'bg-slate-300'
                            )}
                            style={{ width: `${stage.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full" onClick={() => setActiveTab('stages')}>
                  View All Stages
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Attention Needed */}
          <motion.div variants={itemVariants} initial="hidden" animate="visible">
            <Card className={cn(criticalDeviations.length > 0 && "border-red-300")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className={cn(
                    "h-5 w-5",
                    criticalDeviations.length > 0 ? "text-red-600" : "text-amber-600"
                  )} />
                  Attention Needed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {healthScore.recommendations.slice(0, 3).map((rec, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg text-sm",
                      rec.includes('CRITICAL') 
                        ? "bg-red-50 text-red-800 border border-red-200" 
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    )}
                  >
                    <AlertTriangle className={cn(
                      "h-4 w-4 flex-shrink-0 mt-0.5",
                      rec.includes('CRITICAL') ? "text-red-600" : "text-amber-600"
                    )} />
                    <p>{rec.replace('CRITICAL: ', '')}</p>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setActiveTab('issues')}
                >
                  View All Issues
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contractor Card */}
          <motion.div variants={itemVariants} initial="hidden" animate="visible">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  Your Contractor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{project.contractor.name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{project.contractor.rating}</span>
                      <span className="text-sm text-slate-400">({project.contractor.projectsCompleted} projects)</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-900">
                      {Math.round(project.contractor.onTimeRate * 100)}%
                    </p>
                    <p className="text-xs text-slate-500">On-time</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-900">{project.contractor.qualityScore}</p>
                    <p className="text-xs text-slate-500">Quality</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Health Card Component
interface HealthCardProps {
  title: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
  subtext?: string;
  color?: string;
  status?: string;
  variants?: any;
}

function HealthCard({ title, score, icon: Icon, subtext, status, variants }: HealthCardProps) {
  const getStatusColor = (s?: string): { bg: string; text: string; bar: string } => {
    switch (s) {
      case 'excellent': return { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' };
      case 'good': return { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' };
      case 'attention_needed': return { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' };
      case 'at_risk': return { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' };
      default: return { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' };
    }
  };

  const colors = getStatusColor(status);

  return (
    <motion.div variants={variants}>
      <Card className={colors.bg + " border-0"}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={"h-4 w-4 " + colors.text} />
            <span className={cn("text-xs font-medium", colors.text)}>{title}</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className={cn("text-3xl font-bold", colors.text)}>{score}</span>
            <span className="text-sm text-slate-400">/100</span>
          </div>
          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className={cn("h-full rounded-full", colors.bar)}
            />
          </div>
          {subtext && <p className={cn("text-xs mt-2 opacity-80", colors.text)}>{subtext}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
