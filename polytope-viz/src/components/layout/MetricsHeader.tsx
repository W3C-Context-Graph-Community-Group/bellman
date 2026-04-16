import { usePolytopeStore } from '../../store/usePolytopeStore';
import { ViewToggle } from '../panels/ViewToggle';

export function MetricsHeader() {
  const vertices = usePolytopeStore((s) => s.vertices);
  const hTotal = usePolytopeStore((s) => s.hTotal);
  const currentStep = usePolytopeStore((s) => s.currentStep);
  const totalSteps = usePolytopeStore((s) => s.totalSteps);
  const ghostCount = usePolytopeStore((s) => s.ghostCount);
  const rotations = usePolytopeStore((s) => s.rotations);
  const setShowGuide = usePolytopeStore((s) => s.setShowGuide);

  const aliveCount = vertices.filter((v) => v.status === 'alive').length;
  const eliminatedCount = vertices.filter((v) => v.status === 'eliminated').length;

  return (
    <div className="metrics-header">
      <div className="metrics-pills">
        <div className="metric-pill alive">
          <span className="pill-label">ALIVE</span>
          <span className="pill-value">{aliveCount}</span>
        </div>
        <div className="metric-pill">
          <span className="pill-label">ENTROPY</span>
          <span className="pill-value">{hTotal.toFixed(2)}</span>
        </div>
        <div className="metric-pill">
          <span className="pill-label">STEP</span>
          <span className="pill-value">{currentStep}/{totalSteps}</span>
        </div>
        <div className="metric-pill eliminated">
          <span className="pill-label">ELIMINATED</span>
          <span className="pill-value">{eliminatedCount}</span>
        </div>
        <div className="metric-pill">
          <span className="pill-label">GHOSTS</span>
          <span className="pill-value">{ghostCount}</span>
        </div>
        <div className="metric-pill">
          <span className="pill-label">ROTATIONS</span>
          <span className="pill-value">{rotations}</span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="guide-btn"
          onClick={() => setShowGuide(true)}
          title="How to use this visualisation"
        >
          ?
        </button>
        <ViewToggle />
      </div>
    </div>
  );
}
