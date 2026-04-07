import { usePolytopeStore } from '../../store/usePolytopeStore';
import { SERIALIZATION_EVENTS } from '../../data/events';

export function Scoreboard() {
  const hTotal = usePolytopeStore((s) => s.hTotal);
  const omegaTotal = usePolytopeStore((s) => s.omegaTotal);
  const rotations = usePolytopeStore((s) => s.rotations);
  const ghostCount = usePolytopeStore((s) => s.ghostCount);
  const vertices = usePolytopeStore((s) => s.vertices);
  const currentStep = usePolytopeStore((s) => s.currentStep);

  const alive = vertices.filter((v) => v.status === 'alive').length;
  const eliminated = vertices.filter((v) => v.status === 'eliminated').length;
  const evt = SERIALIZATION_EVENTS[currentStep];

  return (
    <div className="scoreboard">
      <h3 className="scoreboard-title">Metrics</h3>
      <div className="scoreboard-grid">
        <div className="metric">
          <span className="metric-label">H_total</span>
          <span className="metric-value">{hTotal.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">|&Omega;|</span>
          <span className="metric-value">{omegaTotal}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Rotations</span>
          <span className="metric-value">{rotations}</span>
        </div>
        <div className="metric">
          <span className="metric-label">|H| ghosts</span>
          <span className="metric-value">{ghostCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Alive</span>
          <span className="metric-value alive">{alive}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Eliminated</span>
          <span className="metric-value eliminated">{eliminated}</span>
        </div>
      </div>
      {evt && (
        <div className="current-event">
          <span className="event-step">Step {currentStep}</span>
          <span className="event-desc">{evt.description}</span>
        </div>
      )}
    </div>
  );
}
