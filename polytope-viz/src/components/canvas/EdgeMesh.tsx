import { useMemo } from 'react';
import * as THREE from 'three';
import { usePolytopeStore } from '../../store/usePolytopeStore';

export function EdgeMesh() {
  const vertices = usePolytopeStore((s) => s.vertices);
  const edges = usePolytopeStore((s) => s.edges);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const aliveMap = new Map(
      vertices
        .filter((v) => v.status === 'alive')
        .map((v) => [v.id, v]),
    );

    for (const [aId, bId] of edges) {
      const a = aliveMap.get(aId);
      const b = aliveMap.get(bId);
      if (!a || !b) continue;
      positions.push(...a.position3D, ...b.position3D);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    return geo;
  }, [vertices, edges]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#4b5563" transparent opacity={0.25} />
    </lineSegments>
  );
}
