import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePolytopeStore } from '../../store/usePolytopeStore';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export function VertexMesh() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const vertices = usePolytopeStore((s) => s.vertices);
  const selectVertex = usePolytopeStore((s) => s.selectVertex);
  const selectedVertexId = usePolytopeStore((s) => s.selectedVertexId);

  const visibleVertices = useMemo(
    () => vertices.filter((v) => v.status !== 'eliminated'),
    [vertices],
  );

  const colorArray = useMemo(() => {
    const arr = new Float32Array(visibleVertices.length * 3);
    visibleVertices.forEach((v, i) => {
      tempColor.set(v.color);
      arr[i * 3] = tempColor.r;
      arr[i * 3 + 1] = tempColor.g;
      arr[i * 3 + 2] = tempColor.b;
    });
    return arr;
  }, [visibleVertices]);

  useEffect(() => {
    if (!meshRef.current) return;
    visibleVertices.forEach((v, i) => {
      tempObject.position.set(...v.position3D);
      const s = v.id === selectedVertexId ? v.scale * 1.5 : v.scale;
      tempObject.scale.setScalar(s);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [visibleVertices, selectedVertexId]);

  useEffect(() => {
    if (!meshRef.current) return;
    const colorAttr = meshRef.current.geometry.getAttribute('color');
    if (colorAttr) {
      (colorAttr as THREE.BufferAttribute).set(colorArray);
      colorAttr.needsUpdate = true;
    }
  }, [colorArray]);

  const handleClick = (e: any) => {
    e.stopPropagation?.();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && instanceId < visibleVertices.length) {
      selectVertex(visibleVertices[instanceId].id);
    }
  };

  if (visibleVertices.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, visibleVertices.length]}
      onClick={handleClick}
    >
      <sphereGeometry args={[0.15, 16, 16]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </sphereGeometry>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.9}
        roughness={0.3}
        metalness={0.1}
      />
    </instancedMesh>
  );
}
