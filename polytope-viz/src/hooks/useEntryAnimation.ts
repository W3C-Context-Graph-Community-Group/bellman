import { useEffect } from 'react';
import { usePolytopeStore } from '../store/usePolytopeStore';

/**
 * On mount (step 0): sets isEntryComplete=false, waits for staggered
 * card fade-in (1s total via CSS animation-delay), then sets isEntryComplete=true.
 */
export function useEntryAnimation() {
  const currentStep = usePolytopeStore((s) => s.currentStep);
  const setEntryComplete = usePolytopeStore((s) => s.setEntryComplete);
  const vertices = usePolytopeStore((s) => s.vertices);

  useEffect(() => {
    if (currentStep === 0 && vertices.length > 0) {
      setEntryComplete(false);
      const timer = setTimeout(() => {
        setEntryComplete(true);
      }, 1100); // slightly longer than the CSS animation total
      return () => clearTimeout(timer);
    } else {
      setEntryComplete(true);
    }
  }, [currentStep, vertices.length, setEntryComplete]);
}
