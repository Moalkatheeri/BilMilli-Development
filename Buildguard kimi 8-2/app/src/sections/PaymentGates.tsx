import { motion } from 'framer-motion';
import { 
  Wallet, 
  Lock, 
  Unlock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Info
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
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export function PaymentGates() {
  const { project, payments, requestPaymentRelease, approvePayment } = useProjectStore();

  if (!project) return null;

  const releasedTotal = payments
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pendingTotal = payments
    .filter(p => p.status === 'pending' || p.status === 'ready')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const blockedPayments = payments.filter(p => !p.canRelease && p.status === 'pending');

  const getStatusIcon = (payment: typeof payments[0]) => {
    if (payment.status === 'released') return <Unlock className="h-6 w-6 text-green-600" />;
    if (payment.canRelease) return <Lock className="h-6 w-6 text-yellow-600" />;
    return <Lock className="h-6 w-6 text-red-600" />;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'released': return 'bg-green-100 text-green-800 border-green-300';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ready': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending': return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'held': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payment Gates</h2>
          <p className="text-slate-500">Milestone-based payment protection</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-green-100 text-green-800 text-base px-3 py-1">
            {payments.filter(p => p.status === 'released').length} Released
          </Badge>
          <Badge className="bg-yellow-100 text-yellow-800 text-base px-3 py-1">
            {payments.filter(p => p.status === 'pending').length} Pending
          </Badge>
        </div>
      </div>

      {/* Payment Protection Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Payment Protection Active</p>
              <p className="text-sm text-blue-700">
                Payments are automatically blocked until work is verified and approved. 
                BuildGuard ensures you only pay for completed, quality-checked work.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{releasedTotal.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Released (AED)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{pendingTotal.toLocaleString()}</p>
            <p className="text-xs text-yellow-600">Pending (AED)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{project.contractValue.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Total Contract (AED)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {Math.round((releasedTotal / project.contractValue) * 100)}%
            </p>
            <p className="text-xs text-green-600">Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Payment Progress</span>
          <span className="text-sm font-medium text-slate-900">
            {Math.round((releasedTotal / project.contractValue) * 100)}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(releasedTotal / project.contractValue) * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
          />
        </div>
      </div>

      {/* Payment Gates List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {payments.map((payment, index) => (
          <motion.div key={payment.id} variants={itemVariants}>
            <Card className={cn(
              payment.blockReasons.length > 0 && "border-red-200"
            )}>
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                    payment.status === 'released' ? 'bg-green-100' :
                    payment.canRelease ? 'bg-yellow-100' : 'bg-red-100'
                  )}>
                    {getStatusIcon(payment)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{payment.name}</h3>
                      <Badge className={cn("capitalize", getStatusBadgeClass(payment.status))}>
                        {payment.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{payment.milestone}</p>
                    
                    {/* Block Reasons */}
                    {payment.blockReasons.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {payment.blockReasons.map((reason, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                            <XCircle className="h-4 w-4 flex-shrink-0" />
                            {reason}
                          </div>
                        ))}
                      </div>
                    )}

                    {payment.status === 'released' && payment.releaseDate && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Released on {new Date(payment.releaseDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">AED</p>
                    </div>

                    {payment.canRelease && payment.status === 'ready' && (
                      <Button 
                        size="sm"
                        onClick={() => approvePayment(payment.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Release Payment
                      </Button>
                    )}

                    {payment.status === 'pending' && !payment.canRelease && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        View Blockers
                      </Button>
                    )}
                  </div>
                </div>

                {/* Retention Info */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Retention: <span className="font-medium">{payment.retentionPercentage}%</span>
                    {' '}({Math.round(payment.amount * (payment.retentionPercentage / 100)).toLocaleString()} AED held)
                  </span>
                  <span className="text-slate-400">
                    Released at DLP completion
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Blocked Payments Alert */}
      {blockedPayments.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">
                  {blockedPayments.length} payment{blockedPayments.length > 1 ? 's' : ''} blocked
                </p>
                <p className="text-sm text-red-700">
                  Resolve outstanding issues to release payments. Total blocked: {' '}
                  {blockedPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} AED
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
