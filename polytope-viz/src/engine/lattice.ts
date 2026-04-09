import type { Vertex } from '../types';
import { ALIVE_COLOR } from '../types';

/**
 * Generate a 4D lattice of vertices with grid positions.
 * Each axis represents one ambiguous field; each position on an axis
 * represents one possible interpretation.
 *
 * For Layer 1 (date×amount×location×instrument):
 *   gridCol = dateIdx * 5 + amountIdx
 *   gridRow = locationIdx * 3 + instrumentIdx
 *
 * For Layer 2 (volatility×correlation×hedging×risk_threshold):
 *   gridCol = volatilityIdx * 3 + hedgingIdx
 *   gridRow = correlationIdx * 3 + riskIdx
 */
export function generate4DLattice(
  axisSizes: number[],
  fieldOmegas?: string[][],
): Vertex[] {
  const vertices: Vertex[] = [];
  let id = 0;

  const recurse = (depth: number, coords: number[]) => {
    if (depth === axisSizes.length) {
      // Grid mapping depends on number of axes
      // Axes: [0]=col-major, [1]=col-minor, [2]=row-major, [3]=row-minor
      const gridCol = coords[0] * axisSizes[1] + coords[1];
      const gridRow = coords[2] * axisSizes[3] + coords[3];

      const label = fieldOmegas
        ? coords.map((c, i) => fieldOmegas[i][c]).join(' / ')
        : coords.join(',');

      vertices.push({
        id,
        coords: [...coords],
        position3D: [0, 0, 0],
        targetPosition3D: [0, 0, 0],
        status: 'alive',
        color: ALIVE_COLOR,
        eliminatedBy: null,
        isGhost: false,
        scale: 1,
        opacity: 1,
        gridRow,
        gridCol,
        label,
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
