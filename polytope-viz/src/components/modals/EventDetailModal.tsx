import { useState } from 'react';
import { usePolytopeStore } from '../../store/usePolytopeStore';
import { SERIALIZATION_EVENTS } from '../../data/events';
import { ADUH_COLORS, GRADE_LABELS } from '../../types';

/** Syntax-highlight a JSON string into spans with token classes */
function highlightJson(obj: unknown): JSX.Element[] {
  const raw = JSON.stringify(obj, null, 2);
  const parts: JSX.Element[] = [];
  // Regex tokenises keys, strings, numbers, booleans, null, and punctuation
  const re =
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    // whitespace / newlines between tokens
    if (m.index > lastIndex) {
      parts.push(<span key={`ws-${lastIndex}`}>{raw.slice(lastIndex, m.index)}</span>);
    }
    const [match, key, str, bool, nul, num, punct] = m;
    let cls = '';
    let display = match;
    if (key) { cls = 'json-key'; display = key; }
    else if (str) cls = 'json-string';
    else if (bool) cls = 'json-bool';
    else if (nul) cls = 'json-null';
    else if (num) cls = 'json-number';
    else if (punct) cls = 'json-punct';

    parts.push(<span key={`t-${m.index}`} className={cls}>{display}</span>);
    lastIndex = m.index + match.length;
  }
  if (lastIndex < raw.length) {
    parts.push(<span key={`ws-end`}>{raw.slice(lastIndex)}</span>);
  }
  return parts;
}

export function EventDetailModal() {
  const showEventModal = usePolytopeStore((s) => s.showEventModal);
  const setShowEventModal = usePolytopeStore((s) => s.setShowEventModal);
  const currentStep = usePolytopeStore((s) => s.currentStep);
  const [jsonOpen, setJsonOpen] = useState(false);

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

        {/* JSON viewer */}
        <div className="json-section">
          <button
            className="json-toggle"
            onClick={() => setJsonOpen(!jsonOpen)}
          >
            <span className={`json-chevron ${jsonOpen ? 'open' : ''}`}>&#9654;</span>
            <span className="json-toggle-label">SerializationEvent</span>
            <span className="json-badge">JSON</span>
          </button>
          {jsonOpen && (
            <div className="json-container">
              <button
                className="json-copy"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(evt, null, 2))}
                title="Copy to clipboard"
              >
                Copy
              </button>
              <pre className="json-pre"><code>{highlightJson(evt)}</code></pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
