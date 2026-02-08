import { motion } from 'framer-motion';
import { 
  Building2, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

export function ContractorScorecard() {
  const { project } = useProjectStore();

  if (!project?.contractor) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Contractor Assigned</h3>
            <p className="text-slate-500">Contractor information will appear here once assigned</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contractor = project.contractor;

  // Mock metrics (would come from backend in production)
  const metrics = [
    { 
      label: 'On-time Delivery', 
      score: Math.round(contractor.onTimeRate * 100), 
      industryAvg: 72,
      icon: Clock,
      color: contractor.onTimeRate >= 0.75 ? 'green' : contractor.onTimeRate >= 0.6 ? 'yellow' : 'red'
    },
    { 
      label: 'Quality Score', 
      score: Math.round(contractor.qualityScore * 20), 
      industryAvg: 75,
      icon: CheckCircle,
      color: contractor.qualityScore >= 4 ? 'green' : contractor.qualityScore >= 3 ? 'yellow' : 'red'
    },
    { 
      label: 'Defect-free Rate', 
      score: 92, 
      industryAvg: 80,
      icon: Award,
      color: 'green'
    },
    { 
      label: 'Communication', 
      score: 88, 
      industryAvg: 70,
      icon: Mail,
      color: 'green'
    },
    { 
      label: 'Budget Adherence', 
      score: 85, 
      industryAvg: 68,
      icon: TrendingUp,
      color: 'green'
    },
  ];

  const recentProjects = [
    { name: 'Villa Khalifa City', completion: '2025-11', rating: 4.5, onTime: true, value: 2100000 },
    { name: 'Villa Al Raha', completion: '2025-08', rating: 4.0, onTime: false, value: 1850000 },
    { name: 'Villa Saadiyat', completion: '2025-04', rating: 4.3, onTime: true, value: 3200000 },
    { name: 'Townhouse JVC', completion: '2025-01', rating: 4.1, onTime: true, value: 1200000 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Logo/Avatar */}
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Building2 className="h-10 w-10 text-purple-600" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-900">{contractor.name}</h2>
                  <Badge variant="outline">License: {contractor.license}</Badge>
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xl font-bold">{contractor.rating}</span>
                    <span className="text-slate-400">/5</span>
                  </div>
                  <span className="text-slate-500">
                    {contractor.projectsCompleted} projects completed
                  </span>
                </div>

                <p className="text-slate-600">
                  Contact: {contractor.contact.name} • {contractor.contact.phone}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isAboveAvg = metric.score >= metric.industryAvg;
          
          return (
            <motion.div key={metric.label} variants={itemVariants}>
              <Card className="h-full">
                <CardContent className="p-4 text-center">
                  <Icon className={cn(
                    "h-6 w-6 mx-auto mb-2",
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                  )} />
                  <p className="text-2xl font-bold text-slate-900">{metric.score}%</p>
                  <p className="text-xs text-slate-500 mb-2">{metric.label}</p>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    {isAboveAvg ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">+{metric.score - metric.industryAvg}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">{metric.score - metric.industryAvg}%</span>
                      </>
                    )}
                    <span className="text-slate-400">vs avg</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Recent Projects */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Last 4 completed projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects.map((proj, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      proj.onTime ? "bg-green-100" : "bg-yellow-100"
                    )}>
                      {proj.onTime ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{proj.name}</p>
                      <p className="text-sm text-slate-500">
                        Completed: {new Date(proj.completion).toLocaleDateString()} • {proj.value.toLocaleString()} AED
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{proj.rating}</span>
                    </div>
                    <Badge className={proj.onTime ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {proj.onTime ? 'On Time' : 'Delayed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Trend */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Rating history over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-4 px-4">
              {[4.0, 4.1, 3.9, 4.2, 4.3, 4.1, 4.2].map((rating, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className={cn(
                      "w-full rounded-t-lg transition-all",
                      rating >= 4.2 ? "bg-green-500" :
                      rating >= 4.0 ? "bg-blue-500" : "bg-yellow-500"
                    )}
                    style={{ height: `${(rating / 5) * 100}%` }}
                  />
                  <span className="text-xs text-slate-500">{rating}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>2024 Q3</span>
              <span>2024 Q4</span>
              <span>2025 Q1</span>
              <span>2025 Q2</span>
              <span>2025 Q3</span>
              <span>2025 Q4</span>
              <span>2026 Q1</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
