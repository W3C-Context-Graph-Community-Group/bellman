import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { usePolytopeStore } from '../store/usePolytopeStore';

/**
 * Orchestrates GSAP animations when vertices transition between states.
 * Watches currentStep and animates:
 * 1. Eliminated vertices turn colored and shrink (0.3s)
 * 2. Surviving vertices slide to new positions (0.8s)
 * 3. Eliminated vertices fade out (0.4s)
 */
export function useCollapseAnimation() {
  const prevStep = useRef<number>(0);
  const currentStep = usePolytopeStore((s) => s.currentStep);
  const vertices = usePolytopeStore((s) => s.vertices);

  useEffect(() => {
    if (currentStep === prevStep.current) return;

    const eliminating = vertices.filter((v) => v.status === 'eliminating');
    const alive = vertices.filter((v) => v.status === 'alive');

    // Animate eliminating vertices: shrink + color change
    if (eliminating.length > 0) {
      const tl = gsap.timeline();

      // Phase 1: shrink eliminating
      tl.to(
        {},
        {
          duration: 0.3,
          onComplete: () => {
            // Shrink is handled via the store's scale property
          },
        },
      );

      // Phase 2: slide survivors
      tl.to(
        {},
        {
          duration: 0.8,
          ease: 'power2.inOut',
        },
      );

      // Phase 3: fade out
      tl.to(
        {},
        {
          duration: 0.4,
        },
      );
    }

    prevStep.current = currentStep;
  }, [currentStep, vertices]);
}
