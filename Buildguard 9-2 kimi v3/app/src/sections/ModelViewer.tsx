import { useState, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Box as BoxIcon, 
  Layers, 
  Ruler, 
  Eye, 
  EyeOff,
  Maximize2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';

// 3D Scene Components
function BuildingElement({ position, dimensions, color, name, isDeviated }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[dimensions.width / 1000, dimensions.height / 1000, dimensions.depth / 1000]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={isDeviated ? '#ef4444' : hovered ? '#3b82f6' : color} 
          transparent
          opacity={0.8}
          wireframe={hovered}
        />
      </Box>
      {hovered && (
        <Text
          position={[0, dimensions.height / 1000 / 2 + 0.5, 0]}
          fontSize={0.3}
          color="black"
          anchorX="center"
          anchorY="bottom"
        >
          {name}
        </Text>
      )}
    </group>
  );
}

function Scene({ elements, showDeviations }: { elements: any[], showDeviations: boolean }) {
  const { deviations } = useProjectStore();
  const deviatedElementIds = deviations.map(d => d.elementId);

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 10, 10]} />
      <OrbitControls enableDamping dampingFactor={0.05} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Grid 
        args={[20, 20]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#94a3b8"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#64748b"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      {elements.map((element) => (
        <BuildingElement
          key={element.id}
          position={[
            element.position.x / 1000,
            element.position.y / 1000 + element.dimensions.height / 1000 / 2,
            element.position.z / 1000
          ]}
          dimensions={element.dimensions}
          color={element.category === 'structural' ? '#f97316' : element.category === 'architecture' ? '#3b82f6' : '#22c55e'}
          name={element.name}
          isDeviated={showDeviations && deviatedElementIds.includes(element.id)}
        />
      ))}
    </>
  );
}

export function ModelViewer() {
  const { project, deviations } = useProjectStore();
  const [activeLayer, setActiveLayer] = useState<'all' | 'architecture' | 'structural' | 'mep'>('all');
  const [showDeviations, setShowDeviations] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | 'floorplan' | 'section'>('3d');

  if (!project?.model) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <BoxIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Model Uploaded</h3>
            <p className="text-slate-500 mb-4">Upload your BIM model to view it in 3D</p>
            <Button>Upload Model</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const model = project.model;
  const filteredElements = activeLayer === 'all' 
    ? model.elements 
    : model.elements.filter(e => e.category === activeLayer);

  const deviatedElements = model.elements.filter(e => 
    deviations.some(d => d.elementId === e.id)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">3D Model Viewer</h2>
          <p className="text-slate-500">{model.name} • LOD {model.lod}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {model.format.toUpperCase()}
          </Badge>
          <Badge className={cn(
            "text-xs",
            model.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          )}>
            {model.status}
          </Badge>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Layer Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'architecture', 'structural', 'mep'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                activeLayer === layer 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {layer}
            </button>
          ))}
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['3d', 'floorplan', 'section'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium uppercase transition-colors",
                viewMode === mode 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Toggle Deviations */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeviations(!showDeviations)}
          className={cn(
            showDeviations && "border-red-300 text-red-700 bg-red-50"
          )}
        >
          {showDeviations ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
          Deviations
        </Button>

        <Button variant="outline" size="sm">
          <Maximize2 className="h-4 w-4 mr-1" />
          Fullscreen
        </Button>
      </div>

      {/* Main Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 3D Canvas */}
        <Card className="lg:col-span-3 h-[500px] lg:h-[600px]">
          <CardContent className="p-0 h-full">
            {viewMode === '3d' ? (
              <Canvas className="rounded-lg">
                <Suspense fallback={null}>
                  <Scene elements={filteredElements} showDeviations={showDeviations} />
                </Suspense>
              </Canvas>
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">{viewMode} view coming soon</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Model Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Model Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Source</p>
                <p className="text-sm font-medium">{model.metadata.sourceSoftware}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Elements</p>
                <p className="text-sm font-medium">{model.elements.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Version</p>
                <p className="text-sm font-medium">v{model.version}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Last Updated</p>
                <p className="text-sm font-medium">{new Date(model.uploadedAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Deviations */}
          {deviatedElements.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Deviations ({deviatedElements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deviatedElements.map((element) => {
                  const deviation = deviations.find(d => d.elementId === element.id);
                  return (
                    <div key={element.id} className="p-2 bg-red-50 rounded-lg">
                      <p className="font-medium text-sm text-red-900">{element.name}</p>
                      <p className="text-xs text-red-700">
                        {deviation?.deviationMm}mm deviation
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span className="text-sm">Structural</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-sm">Architecture</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-sm">MEP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm">Deviated</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Element List */}
      <Card>
        <CardHeader>
          <CardTitle>Model Elements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">Type</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">Category</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">Level</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredElements.map((element) => {
                  const isDeviated = deviations.some(d => d.elementId === element.id);
                  return (
                    <tr key={element.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-sm font-medium">{element.name}</td>
                      <td className="py-2 px-3 text-sm text-slate-600">{element.type}</td>
                      <td className="py-2 px-3 text-sm text-slate-600 capitalize">{element.category}</td>
                      <td className="py-2 px-3 text-sm text-slate-600">{element.level}</td>
                      <td className="py-2 px-3">
                        {isDeviated ? (
                          <Badge className="bg-red-100 text-red-800">Deviated</Badge>
                        ) : element.frozen ? (
                          <Badge className="bg-blue-100 text-blue-800">Frozen</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
