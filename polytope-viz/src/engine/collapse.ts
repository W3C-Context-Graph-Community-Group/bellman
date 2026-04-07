import type { Vertex, Grade } from '../types';
import { ADUH_COLORS, ALIVE_COLOR } from '../types';
import { reprojectAfterCollapse } from './projection';

/**
 * Collapse an axis: eliminate all vertices whose coordinate on the given axis
 * does not match the resolved value index. Survivors get new target positions.
 */
export function collapseAxis(
  vertices: Vertex[],
  axisIndex: number,
  resolvedIndex: number,
  axisSizes: number[],
  collapsedAxes: Set<number>,
  aduhScore: Grade,
): Vertex[] {
  const eliminationColor = aduhScore ? ADUH_COLORS[aduhScore] : '#ef4444';

  return vertices.map((v) => {
    if (v.status === 'eliminated') return v;

    if (v.coords[axisIndex] !== resolvedIndex) {
      return {
        ...v,
        status: 'eliminating' as const,
        color: eliminationColor,
        eliminatedBy: `axis-${axisIndex}`,
      };
    }

    const newPos = reprojectAfterCollapse(v.coords, axisSizes, collapsedAxes);
    return {
      ...v,
      targetPosition3D: newPos,
      color: ALIVE_COLOR,
    };
  });
}

/**
 * Finalize elimination: vertices in 'eliminating' status become 'eliminated'.
 */
export function finalizeElimination(vertices: Vertex[]): Vertex[] {
  return vertices.map((v) =>
    v.status === 'eliminating'
      ? { ...v, status: 'eliminated' as const, scale: 0, opacity: 0 }
      : v,
  );
}

/**
 * Add ghost vertices for H-scored (hallucinated) fields.
 * Ghosts expand the polytope with phantom dimensions.
 */
export function addGhostVertices(
  existingVertices: Vertex[],
  ghostCount: number,
  baseId: number,
): Vertex[] {
  const ghosts: Vertex[] = [];
  const alive = existingVertices.filter((v) => v.status === 'alive');

  for (let i = 0; i < ghostCount; i++) {
    const base = alive[i % alive.length];
    const angle = (i / ghostCount) * Math.PI * 2;
    const radius = 3 + Math.random() * 2;
    ghosts.push({
      id: baseId + i,
      coords: [...base.coords, i],
      position3D: [
        base.position3D[0] + Math.cos(angle) * radius,
        base.position3D[1] + Math.sin(angle) * radius * 0.5,
        base.position3D[2] + Math.sin(angle) * radius,
      ],
      targetPosition3D: [
        base.position3D[0] + Math.cos(angle) * radius,
        base.position3D[1] + Math.sin(angle) * radius * 0.5,
        base.position3D[2] + Math.sin(angle) * radius,
      ],
      status: 'ghost',
      color: '#7c3aed',
      eliminatedBy: null,
      isGhost: true,
      scale: 0.6,
      opacity: 0.5,
    });
  }

  return ghosts;
}
