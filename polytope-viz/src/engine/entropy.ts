import type { FieldState } from '../types';

/**
 * Compute total entropy H_total = sum of log2(|omega_i|) for unresolved fields.
 */
export function computeTotalEntropy(fields: FieldState[]): number {
  return fields.reduce((sum, f) => {
    if (f.resolvedTo !== null) return sum;
    return sum + Math.log2(f.omegaSize);
  }, 0);
}

/**
 * Compute |Omega_total| = product of |omega_i| for unresolved fields.
 */
export function computeOmegaTotal(fields: FieldState[]): number {
  return fields.reduce((product, f) => {
    if (f.resolvedTo !== null) return product;
    return product * f.omegaSize;
  }, 1);
}

/**
 * Count active rotations: number of fields with |omega| > 1 that are not resolved.
 */
export function countRotations(fields: FieldState[]): number {
  return fields.filter((f) => f.resolvedTo === null && f.omegaSize > 1).length;
}
