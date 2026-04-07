/**
 * 4D→3D parallel orthographic projection.
 *
 * Axes 0-2 (date, amount, location) map directly to x, y, z.
 * Axis 3 (instrument) maps to a skew diagonal (0.4, 0.4, 0.4),
 * creating overlapping grid layers.
 *
 * Coordinates are centered and scaled for comfortable viewing.
 */

const SKEW = [0.4, 0.4, 0.4] as const;
const SPACING = 2.0;

export function project4Dto3D(
  coords: number[],
  axisSizes: number[],
): [number, number, number] {
  const centered = coords.map((c, i) => c - (axisSizes[i] - 1) / 2);

  const x = centered[0] * SPACING + (centered.length > 3 ? centered[3] * SKEW[0] * SPACING : 0);
  const y = centered[1] * SPACING + (centered.length > 3 ? centered[3] * SKEW[1] * SPACING : 0);
  const z = centered[2] * SPACING + (centered.length > 3 ? centered[3] * SKEW[2] * SPACING : 0);

  return [x, y, z];
}

/**
 * Reproject surviving vertices after a collapse, spreading them out
 * to fill the reduced space.
 */
export function reprojectAfterCollapse(
  coords: number[],
  axisSizes: number[],
  collapsedAxes: Set<number>,
): [number, number, number] {
  const activeAxes = axisSizes.map((_, i) => i).filter((i) => !collapsedAxes.has(i));
  const expandFactor = 1 + collapsedAxes.size * 0.3;

  let x = 0,
    y = 0,
    z = 0;

  activeAxes.forEach((axisIdx, mapIdx) => {
    const centered = coords[axisIdx] - (axisSizes[axisIdx] - 1) / 2;
    const scaled = centered * SPACING * expandFactor;

    if (mapIdx === 0) x = scaled;
    else if (mapIdx === 1) y = scaled;
    else if (mapIdx === 2) z = scaled;
    else {
      x += scaled * SKEW[0];
      y += scaled * SKEW[1];
      z += scaled * SKEW[2];
    }
  });

  return [x, y, z];
}
