import { usePolytopeStore } from '../../store/usePolytopeStore';
import { SERIALIZATION_EVENTS } from '../../data/events';
import { ADUH_COLORS, GRADE_LABELS } from '../../types';

export function EventDetailModal() {
  const showEventModal = usePolytopeStore((s) => s.showEventModal);
  const setShowEventModal = usePolytopeStore((s) => s.setShowEventModal);
  const currentStep = usePolytopeStore((s) => s.currentStep);

  if (!showEventModal) return null;

  const evt = SERIALIZATION_EVENTS[currentStep];
  if (!evt) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={() => setShowEventModal(false)}
        >
          &times;
        </button>
        <h3 className="modal-title">
          Step {evt.step}: {evt.description}
        </h3>

        <div className="modal-grid">
          <div className="modal-field">
            <span className="modal-label">Layer</span>
            <span className="modal-value">{evt.layer}</span>
          </div>
          <div className="modal-field">
            <span className="modal-label">Field</span>
            <span className="modal-value">{evt.fieldId ?? '—'}</span>
          </div>
          <div className="modal-field">
            <span className="modal-label">|&Omega;| before</span>
            <span className="modal-value">{evt.beforeOmega}</span>
          </div>
          <div className="modal-field">
            <span className="modal-label">|&Omega;| after</span>
            <span className="modal-value">{evt.afterOmega}</span>
          </div>
          <div className="modal-field">
            <span className="modal-label">&Delta;H</span>
            <span className="modal-value">
              {evt.entropyReduction > 0 ? '-' : ''}
              {Math.abs(evt.entropyReduction).toFixed(2)}
            </span>
          </div>
          <div className="modal-field">
            <span className="modal-label">Resolved to</span>
            <span className="modal-value">
              {evt.resolvedValue ?? '—'}
            </span>
          </div>
          {evt.aduhScore && (
            <div className="modal-field">
              <span className="modal-label">ADUH Score</span>
              <span
                className="modal-value score-badge"
                style={{ backgroundColor: ADUH_COLORS[evt.aduhScore] }}
              >
                {evt.aduhScore} — {GRADE_LABELS[evt.aduhScore]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
