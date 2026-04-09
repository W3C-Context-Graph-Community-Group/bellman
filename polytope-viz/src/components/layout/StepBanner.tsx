import { usePolytopeStore } from '../../store/usePolytopeStore';
import { SERIALIZATION_EVENTS } from '../../data/events';

export function StepBanner() {
  const currentStep = usePolytopeStore((s) => s.currentStep);
  const totalSteps = usePolytopeStore((s) => s.totalSteps);
  const vertices = usePolytopeStore((s) => s.vertices);
  const isEntryComplete = usePolytopeStore((s) => s.isEntryComplete);

  const evt = SERIALIZATION_EVENTS[currentStep];
  const aliveCount = vertices.filter((v) => v.status === 'alive').length;
  const eliminatedCount = vertices.filter((v) => v.status === 'eliminated').length;

  if (currentStep === 0) {
    return (
      <div className={`step-banner ${isEntryComplete ? 'visible' : 'hidden'}`}>
        <div className="banner-text">
          This grid shows all <strong>{vertices.length}</strong> possible
          interpretations of the ambiguous CSV fields. Each card is one
          configuration. Watch as fields collapse and interpretations are
          eliminated.
        </div>
      </div>
    );
  }

  return (
    <div className="step-banner visible" key={currentStep}>
      <div className="banner-step">Step {currentStep} of {totalSteps}</div>
      <div className="banner-text">
        {evt?.description}
        {eliminatedCount > 0 && (
          <span className="banner-stats">
            {' '}&mdash; {eliminatedCount} eliminated, {aliveCount} remain
          </span>
        )}
      </div>
    </div>
  );
}
