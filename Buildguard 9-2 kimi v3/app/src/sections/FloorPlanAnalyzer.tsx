import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Scan, 
  Maximize2, 
  DoorOpen, 
  LayoutGrid,
  Ruler,
  CheckCircle,
  AlertCircle,
  Eye,
  Layers,
  ArrowRight,
  Upload,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface DetectedElement {
  type: string;
  count: number;
  confidence: number;
  color: string;
}

interface Room {
  name: string;
  area: number;
  type: string;
  confidence: number;
}

interface FloorPlanAnalysis {
  detectedElements: DetectedElement[];
  dimensions: {
    width: number;
    depth: number;
    totalArea: number;
    floorHeight: number;
  };
  rooms: Room[];
  issues: { type: string; message: string }[];
  scale: string;
  unit: string;
}

interface FloorPlanAnalyzerProps {
  fileName?: string;
  projectId?: string;
  onConvertTo3D?: () => void;
}

export function FloorPlanAnalyzer({ fileName = 'floor-plan-villa.dwg', projectId, onConvertTo3D }: FloorPlanAnalyzerProps) {
  const [activeView, setActiveView] = useState<'detection' | 'rooms' | 'preview'>('detection');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FloorPlanAnalysis | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      analyzeFloorplan(file);
    }
  };

  const analyzeFloorplan = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) {
        formData.append('project_id', projectId);
      }

      const response = await apiClient.post('/ai/floorplan/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });

      if (response.data) {
        setAnalysis(response.data);
        toast.success('Floor plan analysis complete');
      }
    } catch (error) {
      console.error('Floorplan analysis failed:', error);
      toast.error('Failed to analyze floor plan. Please try again.');
      // Fallback to mock data for demo
      setAnalysis({
        detectedElements: [
          { type: 'wall', count: 24, confidence: 0.94, color: '#3b82f6' },
          { type: 'door', count: 8, confidence: 0.89, color: '#22c55e' },
          { type: 'window', count: 12, confidence: 0.91, color: '#f59e0b' },
          { type: 'room', count: 6, confidence: 0.87, color: '#8b5cf6' },
          { type: 'column', count: 4, confidence: 0.82, color: '#ef4444' },
        ],
        dimensions: {
          width: 15.5,
          depth: 12.3,
          totalArea: 190.65,
          floorHeight: 3.2,
        },
        rooms: [
          { name: 'Living Room', area: 45.2, type: 'living', confidence: 0.92 },
          { name: 'Master Bedroom', area: 28.5, type: 'bedroom', confidence: 0.88 },
          { name: 'Kitchen', area: 18.3, type: 'kitchen', confidence: 0.85 },
          { name: 'Dining Area', area: 22.1, type: 'dining', confidence: 0.79 },
          { name: 'Guest Bedroom', area: 16.8, type: 'bedroom', confidence: 0.81 },
          { name: 'Bathroom', area: 8.2, type: 'bathroom', confidence: 0.90 },
        ],
        issues: [
          { type: 'warning', message: 'Door width in Guest Bedroom appears smaller than standard (70cm)' },
          { type: 'info', message: 'Kitchen window placement may affect cabinet installation' },
        ],
        scale: '1:100',
        unit: 'meters',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConvertTo3D = async () => {
    if (!selectedFile) {
      toast.error('Please select a floor plan file first');
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (projectId) {
        formData.append('project_id', projectId);
      }

      const response = await apiClient.post('/ai/floorplan/convert-to-3d', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setConversionProgress(Math.min(progress, 90));
        },
      });

      setConversionProgress(100);
      toast.success('3D model conversion started');
      
      setTimeout(() => {
        setIsConverting(false);
        onConvertTo3D?.();
      }, 500);
    } catch (error) {
      console.error('3D conversion failed:', error);
      toast.error('Failed to convert to 3D. Please try again.');
      setIsConverting(false);
    }
  };

  // Use analysis data or fallback to empty state
  const displayAnalysis = analysis || {
    detectedElements: [],
    dimensions: { width: 0, depth: 0, totalArea: 0, floorHeight: 0 },
    rooms: [],
    issues: [],
    scale: '1:100',
    unit: 'meters',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Floor Plan Analysis</h2>
          <p className="text-slate-500">AI-powered detection and measurement extraction</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".dwg,.dxf,.pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
            id="floorplan-upload"
          />
          <label htmlFor="floorplan-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Upload Floor Plan
              </span>
            </Button>
          </label>
          <Badge variant="outline" className="text-sm">
            <Scan className="h-3 w-3 mr-1" />
            {displayAnalysis.scale}
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Ruler className="h-3 w-3 mr-1" />
            {displayAnalysis.unit}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Floor Plan Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Plan Preview
              </CardTitle>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(['detection', 'rooms', 'preview'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={cn(
                      "px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors",
                      activeView === view 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] bg-slate-100 rounded-lg relative overflow-hidden">
              {/* Placeholder for floor plan visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
                      <p className="text-slate-600">Analyzing floor plan...</p>
                    </div>
                  ) : (
                    <>
                      <LayoutGrid className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">{selectedFile?.name || fileName}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {displayAnalysis.dimensions.width > 0 
                          ? `${displayAnalysis.dimensions.width}m × ${displayAnalysis.dimensions.depth}m`
                          : 'Upload a floor plan to analyze'
                        }
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Overlay based on active view */}
              {activeView === 'detection' && displayAnalysis.detectedElements.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Simulated detection overlay */}
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    {/* Walls */}
                    <rect x="50" y="50" width="300" height="200" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
                    <rect x="150" y="50" width="2" height="200" stroke="#3b82f6" strokeWidth="2" />
                    <rect x="50" y="150" width="300" height="2" stroke="#3b82f6" strokeWidth="2" />
                    
                    {/* Doors */}
                    <circle cx="150" cy="150" r="15" fill="none" stroke="#22c55e" strokeWidth="2" />
                    <circle cx="250" cy="50" r="15" fill="none" stroke="#22c55e" strokeWidth="2" />
                    
                    {/* Windows */}
                    <rect x="100" y="48" width="40" height="4" fill="#f59e0b" />
                    <rect x="200" y="248" width="40" height="4" fill="#f59e0b" />
                    
                    {/* Columns */}
                    <rect x="145" y="145" width="10" height="10" fill="#ef4444" />
                    <rect x="245" y="145" width="10" height="10" fill="#ef4444" />
                  </svg>
                </div>
              )}

              {activeView === 'rooms' && displayAnalysis.rooms.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    {/* Room labels */}
                    <rect x="55" y="55" width="90" height="90" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" />
                    <text x="100" y="105" textAnchor="middle" className="text-xs fill-purple-700">Living Room</text>
                    
                    <rect x="155" y="55" width="90" height="90" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" />
                    <text x="200" y="105" textAnchor="middle" className="text-xs fill-purple-700">Kitchen</text>
                    
                    <rect x="255" y="55" width="90" height="90" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" />
                    <text x="300" y="105" textAnchor="middle" className="text-xs fill-purple-700">Master BR</text>
                    
                    <rect x="55" y="155" width="140" height="90" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" />
                    <text x="125" y="205" textAnchor="middle" className="text-xs fill-purple-700">Dining Area</text>
                    
                    <rect x="205" y="155" width="140" height="90" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" />
                    <text x="275" y="205" textAnchor="middle" className="text-xs fill-purple-700">Guest BR</text>
                  </svg>
                </div>
              )}
            </div>

            {/* Legend */}
            {displayAnalysis.detectedElements.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-4">
                {displayAnalysis.detectedElements.map((elem) => (
                  <div key={elem.type} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: elem.color }}
                    />
                    <span className="text-sm text-slate-600 capitalize">{elem.type}</span>
                    <Badge variant="secondary" className="text-xs">
                      {elem.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <div className="space-y-4">
          {/* Detected Elements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scan className="h-4 w-4 text-blue-600" />
                Detected Elements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayAnalysis.detectedElements.length > 0 ? (
                displayAnalysis.detectedElements.map((elem) => (
                  <div key={elem.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: elem.color }}
                      />
                      <span className="text-sm capitalize">{elem.type}s</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{elem.count}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          elem.confidence >= 0.9 ? "border-green-300 text-green-700" :
                          elem.confidence >= 0.8 ? "border-yellow-300 text-yellow-700" :
                          "border-red-300 text-red-700"
                        )}
                      >
                        {Math.round(elem.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  Upload a floor plan to detect elements
                </p>
              )}
            </CardContent>
          </Card>

          {/* Dimensions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="h-4 w-4 text-green-600" />
                Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Width</span>
                <span className="font-medium">{displayAnalysis.dimensions.width} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Depth</span>
                <span className="font-medium">{displayAnalysis.dimensions.depth} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Floor Height</span>
                <span className="font-medium">{displayAnalysis.dimensions.floorHeight} m</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Total Area</span>
                  <span className="font-bold text-lg">{displayAnalysis.dimensions.totalArea} m²</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {displayAnalysis.issues.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Potential Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {displayAnalysis.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {issue.type === 'warning' ? (
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={issue.type === 'warning' ? 'text-amber-800' : 'text-slate-600'}>
                      {issue.message}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Room Breakdown */}
      {displayAnalysis.rooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-purple-600" />
              Room Breakdown
            </CardTitle>
            <CardDescription>
              AI-identified rooms with estimated areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {displayAnalysis.rooms.map((room, index) => (
                <motion.div
                  key={room.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{room.name}</h4>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        room.confidence >= 0.9 ? "border-green-300 text-green-700" :
                        room.confidence >= 0.8 ? "border-yellow-300 text-yellow-700" :
                        "border-red-300 text-red-700"
                      )}
                    >
                      {Math.round(room.confidence * 100)}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{room.area} m²</p>
                  <p className="text-xs text-slate-500 capitalize">{room.type}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Convert to 3D */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Ready to convert to 3D?
              </h3>
              <p className="text-slate-600">
                Our AI will generate a detailed 3D model with proper dimensions, materials, and element hierarchy.
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={handleConvertTo3D}
              disabled={isConverting || !selectedFile}
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting... {conversionProgress}%
                </>
              ) : (
                <>
                  <Layers className="h-5 w-5 mr-2" />
                  Convert to 3D Model
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
          
          {isConverting && (
            <div className="mt-4">
              <Progress value={conversionProgress} className="h-2" />
              <p className="text-sm text-slate-500 mt-2 text-center">
                {conversionProgress < 30 && "Analyzing floor plan structure..."}
                {conversionProgress >= 30 && conversionProgress < 60 && "Generating 3D geometry..."}
                {conversionProgress >= 60 && conversionProgress < 90 && "Applying materials and textures..."}
                {conversionProgress >= 90 && "Finalizing 3D model..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
