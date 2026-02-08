import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileImage, 
  FileText, 
  Box, 
  MessageSquare,
  CheckCircle,
  Loader2,
  AlertTriangle,
  X,
  Eye,
  Layers,
  Maximize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  preview?: string;
}

const supportedFormats = {
  '2d': ['.dwg', '.dxf', '.pdf', '.png', '.jpg', '.jpeg'],
  '3d': ['.ifc', '.ifczip', '.glb', '.gltf', '.obj', '.fbx', '.rvt'],
  'text': ['description']
};

export function ModelUploader() {
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'text'>('2d');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [textDescription, setTextDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: file.name.split('.').pop()?.toLowerCase() || '',
      size: file.size,
      status: 'uploading',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach(file => {
      simulateUpload(file.id);
    });
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: 100, status: 'processing' }
            : f
        ));
        
        // Simulate processing
        setTimeout(() => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'completed' }
              : f
          ));
        }, 2000);
      } else {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress }
            : f
        ));
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const generateFromText = async () => {
    if (!textDescription.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substring(7),
        name: 'AI-Generated-Villa.glb',
        type: 'glb',
        size: 15678023,
        status: 'completed',
        progress: 100,
      };
      setUploadedFiles(prev => [...prev, newFile]);
      setTextDescription('');
    }, 3000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Upload Your Building Plans</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          BuildGuard Pro automatically converts your 2D floor plans, CAD drawings, or text descriptions 
          into an interactive 3D model. We support DWG, PDF, images, and even text descriptions.
        </p>
      </div>

      {/* Upload Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as '2d' | '3d' | 'text')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="2d" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            2D Plans
          </TabsTrigger>
          <TabsTrigger value="3d" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            3D Model
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Describe
          </TabsTrigger>
        </TabsList>

        {/* 2D Upload */}
        <TabsContent value="2d" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                  dragActive 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                )}
                onClick={() => document.getElementById('file-2d')?.click()}
              >
                <input
                  id="file-2d"
                  type="file"
                  multiple
                  accept=".dwg,.dxf,.pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Drop your floor plans here
                </h3>
                <p className="text-slate-500 mb-4">
                  or click to browse from your computer
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {supportedFormats['2d'].map(format => (
                    <Badge key={format} variant="secondary" className="text-xs">
                      {format.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* AI Processing Info */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">AI-Powered Conversion</p>
                    <p className="text-sm text-purple-700">
                      Our AI will automatically detect walls, doors, windows, and rooms from your 2D plans 
                      and convert them into a detailed 3D model with proper dimensions and materials.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3D Upload */}
        <TabsContent value="3d" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                  dragActive 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                )}
                onClick={() => document.getElementById('file-3d')?.click()}
              >
                <input
                  id="file-3d"
                  type="file"
                  multiple
                  accept=".ifc,.ifczip,.glb,.gltf,.obj,.fbx,.rvt"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Box className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Upload your 3D model
                </h3>
                <p className="text-slate-500 mb-4">
                  BIM models in IFC, Revit, or other 3D formats
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {supportedFormats['3d'].map(format => (
                    <Badge key={format} variant="secondary" className="text-xs">
                      {format.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* BIM Info */}
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div className="flex items-start gap-3">
                  <Maximize2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">BIM Model Support</p>
                    <p className="text-sm text-green-700">
                      Upload your existing BIM model and we'll extract all building elements, 
                      materials, and properties for tracking during construction.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text Description */}
        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Describe your villa
                  </label>
                  <Textarea
                    placeholder="Example: A modern 2-story villa with 4 bedrooms, open-plan living room, swimming pool in the backyard, double-height entrance foyer, and a rooftop terrace. Total area approximately 450 sqm."
                    value={textDescription}
                    onChange={(e) => setTextDescription(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>

                <Button 
                  onClick={generateFromText}
                  disabled={!textDescription.trim() || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating 3D Model...
                    </>
                  ) : (
                    <>
                      <Box className="h-4 w-4 mr-2" />
                      Generate 3D Model from Description
                    </>
                  )}
                </Button>

                {/* AI Generation Info */}
                <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">Text-to-3D Generation</p>
                      <p className="text-sm text-amber-700">
                        Our AI understands architectural descriptions and generates detailed 3D models. 
                        Include room counts, styles, special features, and approximate dimensions for best results.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Uploaded Files ({uploadedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    file.status === 'completed' ? 'bg-green-100' :
                    file.status === 'processing' ? 'bg-yellow-100' :
                    file.status === 'error' ? 'bg-red-100' : 'bg-blue-100'
                  )}>
                    {file.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : file.status === 'processing' ? (
                      <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                    ) : file.status === 'error' ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{file.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className={cn(
                        "capitalize",
                        file.status === 'completed' && 'text-green-600',
                        file.status === 'processing' && 'text-yellow-600',
                        file.status === 'error' && 'text-red-600'
                      )}>
                        {file.status.replace('_', ' ')}
                      </span>
                    </div>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="h-1 mt-2" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {file.status === 'completed' && (
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {uploadedFiles.some(f => f.status === 'completed') && (
              <div className="mt-4 flex justify-end gap-3">
                <Button variant="outline">
                  Add More Files
                </Button>
                <Button>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Continue to Project Setup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="p-4">
            <FileImage className="h-8 w-8 text-blue-600 mb-3" />
            <h4 className="font-semibold text-slate-900 mb-1">2D Floor Plans</h4>
            <p className="text-sm text-slate-600">
              Upload DWG, PDF, or image files. AI automatically detects walls, doors, and rooms.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardContent className="p-4">
            <Box className="h-8 w-8 text-green-600 mb-3" />
            <h4 className="font-semibold text-slate-900 mb-1">3D BIM Models</h4>
            <p className="text-sm text-slate-600">
              Import IFC, Revit, or GLB files with full element hierarchy and properties.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
          <CardContent className="p-4">
            <MessageSquare className="h-8 w-8 text-amber-600 mb-3" />
            <h4 className="font-semibold text-slate-900 mb-1">Text Description</h4>
            <p className="text-sm text-slate-600">
              Describe your dream home in words and our AI generates a 3D model.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
