import { useEffect } from 'react';
import { MetricsHeader } from './components/layout/MetricsHeader';
import { StepBanner } from './components/layout/StepBanner';
import { GridContainer } from './components/grid/GridContainer';
import { FieldLegend } from './components/layout/FieldLegend';
import { TimelineScrubber } from './components/panels/TimelineScrubber';
import { EventDetailModal } from './components/modals/EventDetailModal';
import { GuideModal } from './components/modals/GuideModal';
import { usePolytopeStore } from './store/usePolytopeStore';
import { useEntryAnimation } from './hooks/useEntryAnimation';
// Design system & reset
import './styles/variables.css';
import './styles/layout.css';

// Component styles
import './styles/MetricsHeader.css';
import './styles/StepBanner.css';
import './styles/Grid.css';
import './styles/FieldLegend.css';
import './styles/TimelineScrubber.css';
import './styles/Modal.css';

export default function App() {
  const initialize = usePolytopeStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEntryAnimation();

  return (
    <div className="app-layout">
      <MetricsHeader />
      <StepBanner />
      <div className="grid-area">
        <GridContainer />
      </div>
      <FieldLegend />
      <div className="bottom-bar">
        <TimelineScrubber />
      </div>
      <EventDetailModal />
    </div>
  );
}
