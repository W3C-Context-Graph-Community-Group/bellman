import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { VertexMesh } from './VertexMesh';
import { EdgeMesh } from './EdgeMesh';
import { AxisLabels } from './AxisLabels';
import { GhostVertices } from './GhostVertices';
import { usePolytopeStore } from '../../store/usePolytopeStore';

function SceneContent() {
  const selectVertex = usePolytopeStore((s) => s.selectVertex);

  return (
    <>
      <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={40}
      />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.2} />

      <VertexMesh />
      <EdgeMesh />
      <AxisLabels />
      <GhostVertices />

      {/* Click on empty space deselects */}
      <mesh
        visible={false}
        position={[0, 0, 0]}
        onClick={() => selectVertex(null)}
      >
        <sphereGeometry args={[50]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}

export function PolytopeScene() {
  return (
    <div className="canvas-container">
      <Canvas gl={{ antialias: true }} dpr={[1, 2]}>
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 25, 50]} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
