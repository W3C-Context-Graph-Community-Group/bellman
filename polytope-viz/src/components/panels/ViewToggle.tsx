import { usePolytopeStore } from '../../store/usePolytopeStore';
import type { ViewMode } from '../../types';

export function ViewToggle() {
  const viewMode = usePolytopeStore((s) => s.viewMode);
  const setViewMode = usePolytopeStore((s) => s.setViewMode);

  return (
    <div className="view-toggle">
      <button
        className={`toggle-btn ${viewMode === 'god' ? 'active' : ''}`}
        onClick={() => setViewMode('god')}
      >
        God View
      </button>
      <button
        className={`toggle-btn ${viewMode === 'layer2' ? 'active' : ''}`}
        onClick={() => setViewMode('layer2')}
      >
        Layer 2 View
      </button>
    </div>
  );
}
