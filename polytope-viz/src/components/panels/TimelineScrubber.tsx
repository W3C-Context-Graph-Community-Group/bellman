import { useEffect, useRef, useState } from 'react';
import { usePolytopeStore } from '../../store/usePolytopeStore';
import { SERIALIZATION_EVENTS } from '../../data/events';

/** Syntax-highlight a JSON string into spans with token classes */
function highlightJson(obj: unknown): JSX.Element[] {
  const raw = JSON.stringify(obj, null, 2);
  const parts: JSX.Element[] = [];
  const re =
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
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

export function TimelineScrubber() {
  const currentStep = usePolytopeStore((s) => s.currentStep);
  const totalSteps = usePolytopeStore((s) => s.totalSteps);
  const isPlaying = usePolytopeStore((s) => s.isPlaying);
  const playSpeed = usePolytopeStore((s) => s.playSpeed);
  const stepForward = usePolytopeStore((s) => s.stepForward);
  const stepBackward = usePolytopeStore((s) => s.stepBackward);
  const goToStep = usePolytopeStore((s) => s.goToStep);
  const togglePlay = usePolytopeStore((s) => s.togglePlay);
  const setPlaying = usePolytopeStore((s) => s.setPlaying);
  const [jsonOpen, setJsonOpen] = useState(false);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        const state = usePolytopeStore.getState();
        if (state.currentStep >= state.totalSteps) {
          state.setPlaying(false);
          return;
        }
        state.stepForward();
      }, playSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playSpeed]);

  const evt = SERIALIZATION_EVENTS[currentStep];

  return (
    <div className="timeline">
      <div className="timeline-controls">
        <button
          className="timeline-btn"
          onClick={() => goToStep(0)}
          title="Reset"
        >
          &#x23EE;
        </button>
        <button
          className="timeline-btn"
          onClick={stepBackward}
          disabled={currentStep === 0}
          title="Step back"
        >
          &#x23F4;
        </button>
        <button
          className="timeline-btn play-btn"
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '\u23F8' : '\u25B6'}
        </button>
        <button
          className="timeline-btn"
          onClick={stepForward}
          disabled={currentStep >= totalSteps}
          title="Step forward"
        >
          &#x23F5;
        </button>
        <button
          className="timeline-btn"
          onClick={() => goToStep(totalSteps)}
          title="End"
        >
          &#x23ED;
        </button>
      </div>

      <div className="timeline-scrubber">
        <input
          type="range"
          min={0}
          max={totalSteps}
          value={currentStep}
          onChange={(e) => goToStep(parseInt(e.target.value))}
          className="scrubber-input"
        />
        <div className="timeline-markers">
          {SERIALIZATION_EVENTS.map((e, i) => (
            <div
              key={e.id}
              className="marker-wrapper"
              onClick={() => goToStep(i)}
              title={e.description}
            >
              <div
                className={`marker ${i === currentStep ? 'active' : ''} ${
                  i <= currentStep ? 'passed' : ''
                } layer-${e.layer}`}
              />
              <span className="marker-label">
                {e.fieldId ?? (i === 0 ? 'start' : i === 5 ? 'JSON' : i === 6 ? 'L2' : 'end')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="timeline-info">
        <span className="step-label">
          Step {currentStep}/{totalSteps}
        </span>
        {evt && (
          <span className="step-desc">{evt.description}</span>
        )}
      </div>

      {/* JSON viewer toggle */}
      <button
        className="json-toggle-inline"
        onClick={() => setJsonOpen(!jsonOpen)}
        title="Toggle JSON view"
      >
        <span className="json-badge">{'{ }'}</span>
      </button>

      {/* JSON panel */}
      {jsonOpen && evt && (
        <div className="json-panel">
          <div className="json-panel-header">
            <span className="json-toggle-label">SerializationEvent</span>
            <button
              className="json-copy"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(evt, null, 2))}
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
          <pre className="json-pre"><code>{highlightJson(evt)}</code></pre>
        </div>
      )}
    </div>
  );
}
