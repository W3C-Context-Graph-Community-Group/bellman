import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { usePolytopeStore } from '../../store/usePolytopeStore';

const tempObject = new THREE.Object3D();

export function GhostVertices() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const vertices = usePolytopeStore((s) => s.vertices);

  const ghosts = useMemo(
    () => vertices.filter((v) => v.isGhost),
    [vertices],
  );

  useEffect(() => {
    if (!meshRef.current || ghosts.length === 0) return;
    ghosts.forEach((v, i) => {
      tempObject.position.set(...v.position3D);
      tempObject.scale.setScalar(v.scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [ghosts]);

  if (ghosts.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ghosts.length]}>
      <sphereGeometry args={[0.15, 12, 12]} />
      <meshStandardMaterial
        color="#7c3aed"
        transparent
        opacity={0.4}
        roughness={0.5}
        wireframe
      />
    </instancedMesh>
  );
}
