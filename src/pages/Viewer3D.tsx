import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import { RotateCcw, ZoomIn, ZoomOut, Maximize2, Eye } from 'lucide-react';
import * as THREE from 'three';

// Villa model — procedurally generated
function VillaModel() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  const wallColor = '#e8dcc8';
  const roofColor = '#8b5e3c';
  const windowColor = '#87ceeb';
  const doorColor = '#654321';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Foundation / Base slab */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[8, 0.1, 6]} />
        <meshStandardMaterial color="#9e9e9e" />
      </mesh>

      {/* Ground floor walls */}
      {/* Front wall */}
      <mesh position={[0, 1.6, 3]}>
        <boxGeometry args={[8, 3, 0.2]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 1.6, -3]}>
        <boxGeometry args={[8, 3, 0.2]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-4, 1.6, 0]}>
        <boxGeometry args={[0.2, 3, 6]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Right wall */}
      <mesh position={[4, 1.6, 0]}>
        <boxGeometry args={[0.2, 3, 6]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Internal wall */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.15, 3, 6]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* First floor slab */}
      <mesh position={[0, 3.15, 0]}>
        <boxGeometry args={[8.2, 0.15, 6.2]} />
        <meshStandardMaterial color="#b0b0b0" />
      </mesh>

      {/* First floor walls */}
      <mesh position={[0, 4.7, 3]}>
        <boxGeometry args={[8, 3, 0.2]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[0, 4.7, -3]}>
        <boxGeometry args={[8, 3, 0.2]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[-4, 4.7, 0]}>
        <boxGeometry args={[0.2, 3, 6]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[4, 4.7, 0]}>
        <boxGeometry args={[0.2, 3, 6]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 6.35, 0]}>
        <boxGeometry args={[8.4, 0.15, 6.4]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
      {/* Parapet */}
      <mesh position={[0, 6.8, 3.1]}>
        <boxGeometry args={[8.4, 0.8, 0.15]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[0, 6.8, -3.1]}>
        <boxGeometry args={[8.4, 0.8, 0.15]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[-4.1, 6.8, 0]}>
        <boxGeometry args={[0.15, 0.8, 6.4]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[4.1, 6.8, 0]}>
        <boxGeometry args={[0.15, 0.8, 6.4]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* Windows - Ground Floor Front */}
      {[-2.5, -0.8, 0.8, 2.5].map((x, i) => (
        <mesh key={`gfw${i}`} position={[x, 1.8, 3.11]}>
          <boxGeometry args={[0.9, 1.2, 0.05]} />
          <meshStandardMaterial color={windowColor} transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Windows - First Floor Front */}
      {[-2.5, -0.8, 0.8, 2.5].map((x, i) => (
        <mesh key={`ffw${i}`} position={[x, 4.9, 3.11]}>
          <boxGeometry args={[0.9, 1.2, 0.05]} />
          <meshStandardMaterial color={windowColor} transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Front door */}
      <mesh position={[0, 1.2, 3.11]}>
        <boxGeometry args={[1.2, 2.2, 0.05]} />
        <meshStandardMaterial color={doorColor} />
      </mesh>

      {/* Boundary wall */}
      <mesh position={[0, 0.5, 5]}>
        <boxGeometry args={[12, 1, 0.15]} />
        <meshStandardMaterial color="#d4c4a8" />
      </mesh>
      <mesh position={[0, 0.5, -5]}>
        <boxGeometry args={[12, 1, 0.15]} />
        <meshStandardMaterial color="#d4c4a8" />
      </mesh>
      <mesh position={[-6, 0.5, 0]}>
        <boxGeometry args={[0.15, 1, 10]} />
        <meshStandardMaterial color="#d4c4a8" />
      </mesh>
      <mesh position={[6, 0.5, 0]}>
        <boxGeometry args={[0.15, 1, 10]} />
        <meshStandardMaterial color="#d4c4a8" />
      </mesh>

      {/* Driveway */}
      <mesh position={[0, 0.02, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#a0a0a0" />
      </mesh>
    </group>
  );
}

export default function Viewer3D() {
  const [wireframe, setWireframe] = useState(false);

  return (
    <div>
      <div className="viewer-container">
        <div className="viewer-info">
          <div className="viewer-info-chip">
            <Eye size={12} /> Interactive 3D Model
          </div>
          <div className="viewer-info-chip">Drag to rotate | Scroll to zoom</div>
        </div>

        <Canvas
          camera={{ position: [12, 8, 12], fov: 45 }}
          style={{ background: '#0a0d14' }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
          <directionalLight position={[-5, 10, -5]} intensity={0.3} />

          <VillaModel />

          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.4}
            scale={20}
            blur={2}
          />

          <Grid
            args={[30, 30]}
            position={[0, -0.01, 0]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#1a2030"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#2a3040"
            fadeDistance={30}
            infiniteGrid
          />

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2.1}
          />

          <Environment preset="city" />
        </Canvas>

        <div className="viewer-toolbar">
          <button className="btn btn-ghost btn-icon" title="Reset view">
            <RotateCcw size={16} />
          </button>
          <button className="btn btn-ghost btn-icon" title="Zoom in">
            <ZoomIn size={16} />
          </button>
          <button className="btn btn-ghost btn-icon" title="Zoom out">
            <ZoomOut size={16} />
          </button>
          <button className="btn btn-ghost btn-icon" title="Fullscreen">
            <Maximize2 size={16} />
          </button>
          <button
            className={`btn btn-sm ${wireframe ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setWireframe(!wireframe)}
          >
            Wireframe
          </button>
        </div>
      </div>
    </div>
  );
}
