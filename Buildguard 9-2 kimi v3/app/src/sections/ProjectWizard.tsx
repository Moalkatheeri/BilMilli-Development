import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Building2, 
  MapPin, 
  User, 
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Camera,
  Shield,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ModelUploader } from './ModelUploader';
import { FloorPlanAnalyzer } from './FloorPlanAnalyzer';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectStore';
import { toast } from 'sonner';

type WizardStep = 'welcome' | 'upload' | 'analyze' | 'details' | 'contractor' | 'confirm';

interface ProjectData {
  name: string;
  address: string;
  plotNumber: string;
  permitNumber: string;
  contractValue: string;
  expectedDuration: string;
}

export function ProjectWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    address: '',
    plotNumber: '',
    permitNumber: '',
    contractValue: '',
    expectedDuration: '',
  });
  const createProject = useProjectStore(state => state.createProject);

  const steps: { id: WizardStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'welcome', label: 'Welcome', icon: Home },
    { id: 'upload', label: 'Upload Plans', icon: FileText },
    { id: 'analyze', label: 'Analysis', icon: Camera },
    { id: 'details', label: 'Project Details', icon: Building2 },
    { id: 'contractor', label: 'Contractor', icon: User },
    { id: 'confirm', label: 'Confirm', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const handleCreateProject = async () => {
    if (!projectData.name || !projectData.address) {
      toast.error('Missing information', { description: 'Please fill in project name and address' });
      return;
    }

    setIsCreating(true);
    
    // Calculate dates based on expected duration
    const startDate = new Date();
    const expectedCompletion = new Date();
    expectedCompletion.setMonth(startDate.getMonth() + parseInt(projectData.expectedDuration || '12'));

    const project = await createProject({
      name: projectData.name,
      address: projectData.address,
      location: projectData.address.split(',').pop()?.trim() || 'Dubai',
      contract_value: parseFloat(projectData.contractValue) || 1750000,
      start_date: startDate.toISOString(),
      expected_completion: expectedCompletion.toISOString(),
    });

    setIsCreating(false);
    
    if (project) {
      toast.success('Project created!', { description: 'Redirecting to dashboard...' });
      // Reset form
      setProjectData({
        name: '',
        address: '',
        plotNumber: '',
        permitNumber: '',
        contractValue: '',
        expectedDuration: '',
      });
      setCurrentStep('welcome');
    }
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />;
      case 'upload':
        return <ModelUploader />;
      case 'analyze':
        return (
          <FloorPlanAnalyzer 
            onConvertTo3D={() => setHasAnalyzed(true)} 
          />
        );
      case 'details':
        return (
          <ProjectDetailsStep 
            data={projectData} 
            onChange={setProjectData} 
          />
        );
      case 'contractor':
        return <ContractorStep />;
      case 'confirm':
        return <ConfirmStep data={projectData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
          <span className="text-sm text-slate-500">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>
        
        <Progress value={progress} className="h-2 mb-6" />
        
        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;
            
            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={cn(
                  "flex flex-col items-center gap-2 transition-colors",
                  isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isActive ? "bg-blue-100" : isCompleted ? "bg-green-100" : "bg-slate-100"
                )}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium hidden lg:block">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {currentStep !== 'welcome' && (
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {currentStep !== 'confirm' && (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 'confirm' && (
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateProject}
              disabled={isCreating || !projectData.name || !projectData.address}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Welcome Step
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8 py-12">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200">
        <Shield className="h-12 w-12 text-white" />
      </div>
      
      <div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Welcome to BuildGuard Pro
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Your AI-powered construction guardian. We'll help you monitor your villa construction, 
          detect issues early, and ensure quality at every stage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Upload Plans</h3>
            <p className="text-sm text-slate-600">
              2D floor plans, CAD drawings, or describe your villa in words
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6">
            <Camera className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">AI Analysis</h3>
            <p className="text-sm text-slate-600">
              Automatic detection of elements, rooms, and potential issues
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-6">
            <Shield className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Track Progress</h3>
            <p className="text-sm text-slate-600">
              Monitor construction with payment gates and deviation detection
            </p>
          </CardContent>
        </Card>
      </div>

      <Button size="lg" onClick={onNext} className="px-8">
        Get Started
        <ChevronRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
}

// Project Details Step
function ProjectDetailsStep({ 
  data, 
  onChange 
}: { 
  data: ProjectData; 
  onChange: (data: ProjectData) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Project Details
        </CardTitle>
        <CardDescription>
          Enter basic information about your construction project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g., Villa Al Barari"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="e.g., Al Barari, Dubai"
              value={data.address}
              onChange={(e) => onChange({ ...data, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plot">Plot Number</Label>
            <Input
              id="plot"
              placeholder="e.g., B12-Sector4"
              value={data.plotNumber}
              onChange={(e) => onChange({ ...data, plotNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="permit">Building Permit Number</Label>
            <Input
              id="permit"
              placeholder="e.g., BP-2026-15432"
              value={data.permitNumber}
              onChange={(e) => onChange({ ...data, permitNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Contract Value (AED)</Label>
            <Input
              id="value"
              type="number"
              placeholder="e.g., 1750000"
              value={data.contractValue}
              onChange={(e) => onChange({ ...data, contractValue: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Expected Duration (months)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="e.g., 12"
              value={data.expectedDuration}
              onChange={(e) => onChange({ ...data, expectedDuration: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Contractor Step
function ContractorStep() {
  const contractors = [
    {
      id: 1,
      name: 'Al Futtaim Construction LLC',
      license: 'C-12345-Dubai',
      rating: 4.2,
      projects: 47,
      specialty: 'Residential Villas',
      onTime: 78,
    },
    {
      id: 2,
      name: 'Arabtec Construction',
      license: 'C-8821-Dubai',
      rating: 4.5,
      projects: 120,
      specialty: 'Luxury Homes',
      onTime: 85,
    },
    {
      id: 3,
      name: 'Belhasa Projects',
      license: 'C-5543-Dubai',
      rating: 4.0,
      projects: 32,
      specialty: 'Custom Villas',
      onTime: 72,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Select Contractor
        </CardTitle>
        <CardDescription>
          Choose from our verified contractor network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contractors.map((contractor) => (
            <div
              key={contractor.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{contractor.name}</h4>
                  <p className="text-sm text-slate-500">
                    License: {contractor.license} • {contractor.specialty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{contractor.rating}</span>
                    <span className="text-yellow-500">★</span>
                  </div>
                  <p className="text-xs text-slate-500">{contractor.projects} projects</p>
                </div>
                <Badge className={contractor.onTime >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {contractor.onTime}% on-time
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Confirm Step
function ConfirmStep({ data }: { data: ProjectData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Confirm Project
        </CardTitle>
        <CardDescription>
          Review your project details before creating
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Project Name</p>
            <p className="font-medium">{data.name || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Address</p>
            <p className="font-medium">{data.address || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Plot Number</p>
            <p className="font-medium">{data.plotNumber || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Permit Number</p>
            <p className="font-medium">{data.permitNumber || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Contract Value</p>
            <p className="font-medium">
              {data.contractValue ? `${parseInt(data.contractValue).toLocaleString()} AED` : 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Expected Duration</p>
            <p className="font-medium">{data.expectedDuration ? `${data.expectedDuration} months` : 'Not specified'}</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>What's next?</strong> After creating your project, you'll be able to:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-blue-700">
            <li>• Track construction progress through each stage</li>
            <li>• Upload photos from site visits for AI analysis</li>
            <li>• Monitor deviations from approved plans</li>
            <li>• Control payments through milestone gates</li>
            <li>• Generate reports and evidence packages</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
