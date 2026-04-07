import type { Vertex } from '../types';
import { ALIVE_COLOR } from '../types';
import { project4Dto3D } from './projection';

/**
 * Generate a 4D lattice of vertices.
 * Each axis represents one ambiguous field; each position on an axis
 * represents one possible interpretation.
 */
export function generate4DLattice(axisSizes: number[]): Vertex[] {
  const vertices: Vertex[] = [];
  let id = 0;

  const recurse = (depth: number, coords: number[]) => {
    if (depth === axisSizes.length) {
      const pos = project4Dto3D(coords, axisSizes);
      vertices.push({
        id,
        coords: [...coords],
        position3D: pos,
        targetPosition3D: [...pos],
        status: 'alive',
        color: ALIVE_COLOR,
        eliminatedBy: null,
        isGhost: false,
        scale: 1,
        opacity: 1,
      });
      id++;
      return;
    }
    for (let i = 0; i < axisSizes[depth]; i++) {
      recurse(depth + 1, [...coords, i]);
    }
  };

  recurse(0, []);
  return vertices;
}

/**
 * Generate edges: connect vertices that differ by exactly 1 on exactly 1 axis.
 */
export function generateEdges(vertices: Vertex[]): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const a = vertices[i].coords;
      const b = vertices[j].coords;
      let diffCount = 0;
      let diffMagnitude = 0;
      for (let d = 0; d < a.length; d++) {
        if (a[d] !== b[d]) {
          diffCount++;
          diffMagnitude = Math.abs(a[d] - b[d]);
        }
      }
      if (diffCount === 1 && diffMagnitude === 1) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}
