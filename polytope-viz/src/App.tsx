import { useEffect } from 'react';
import { PolytopeScene } from './components/canvas/PolytopeScene';
import { Scoreboard } from './components/panels/Scoreboard';
import { TablePanel } from './components/panels/TablePanel';
import { TimelineScrubber } from './components/panels/TimelineScrubber';
import { ViewToggle } from './components/panels/ViewToggle';
import { DepthSlider } from './components/panels/DepthSlider';
import { EventDetailModal } from './components/modals/EventDetailModal';
import { usePolytopeStore } from './store/usePolytopeStore';
import { useCollapseAnimation } from './hooks/useCollapseAnimation';
import './styles/App.css';

export default function App() {
  const initialize = usePolytopeStore((s) => s.initialize);
  const setShowEventModal = usePolytopeStore((s) => s.setShowEventModal);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useCollapseAnimation();

  return (
    <div className="app-layout">
      <PolytopeScene />

      <div className="right-panel">
        <Scoreboard />
        <ViewToggle />
        <DepthSlider />
        <TablePanel />
        <button
          className="event-detail-btn"
          style={{ margin: '8px 16px' }}
          onClick={() => setShowEventModal(true)}
        >
          Event Details
        </button>
      </div>

      <div className="bottom-bar">
        <TimelineScrubber />
      </div>

      <EventDetailModal />
    </div>
  );
}
