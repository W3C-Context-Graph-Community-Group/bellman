import { useEffect, useRef } from 'react';
import { usePolytopeStore } from '../../store/usePolytopeStore';
import { SERIALIZATION_EVENTS } from '../../data/events';

export function TimelineScrubber() {
  const currentStep = usePolytopeStore((s) => s.currentStep);
  const totalSteps = usePolytopeStore((s) => s.totalSteps);
  const isPlaying = usePolytopeStore((s) => s.isPlaying);
  const stepForward = usePolytopeStore((s) => s.stepForward);
  const stepBackward = usePolytopeStore((s) => s.stepBackward);
  const goToStep = usePolytopeStore((s) => s.goToStep);
  const togglePlay = usePolytopeStore((s) => s.togglePlay);
  const setPlaying = usePolytopeStore((s) => s.setPlaying);

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
      }, 1500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

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
              className={`marker ${i === currentStep ? 'active' : ''} ${
                i <= currentStep ? 'passed' : ''
              } layer-${e.layer}`}
              onClick={() => goToStep(i)}
              title={e.description}
            />
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
    </div>
  );
}
