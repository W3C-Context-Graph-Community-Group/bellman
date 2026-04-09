import { useRef, useState, useCallback } from 'react';
import { usePolytopeStore } from '../../store/usePolytopeStore';
import { ConfigCard } from './ConfigCard';
import { ColumnHeaders } from './ColumnHeaders';
import { RowHeaders } from './RowHeaders';

export function GridContainer() {
  const vertices = usePolytopeStore((s) => s.vertices);
  const viewMode = usePolytopeStore((s) => s.viewMode);
  const activeLayer = usePolytopeStore((s) => s.activeLayer);
  const newlyEliminatedIds = usePolytopeStore((s) => s.newlyEliminatedIds);
  const isEntryComplete = usePolytopeStore((s) => s.isEntryComplete);

  const newlyEliminatedSet = new Set(newlyEliminatedIds);

  const containerRef = useRef<HTMLDivElement>(null);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setTiltY((prev) => Math.max(-15, Math.min(15, prev + dx * 0.2)));
    setTiltX((prev) => Math.max(-15, Math.min(15, prev - dy * 0.2)));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const aliveCount = vertices.filter((v) => v.status === 'alive').length;
  const isSingleSurvivor = aliveCount === 1;

  // Determine which vertices to show
  const visibleVertices = viewMode === 'god'
    ? vertices.filter((v) => v.status === 'alive' || v.status === 'eliminated')
    : vertices;

  const cols = activeLayer === 1 ? 10 : 12;
  const rows = activeLayer === 1 ? 15 : 9;

  return (
    <div
      className="grid-perspective"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={containerRef}
        className={`config-grid layer-${activeLayer}`}
        style={{
          gridTemplateColumns: `140px repeat(${cols}, minmax(100px, 1fr))`,
          gridTemplateRows: `40px 40px repeat(${rows}, auto)`,
          transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }}
      >
        <ColumnHeaders activeLayer={activeLayer} />
        <RowHeaders activeLayer={activeLayer} />

        {visibleVertices.map((v, idx) => {
          const isHidden =
            viewMode === 'layer2' && v.status === 'eliminated';
          return (
            <ConfigCard
              key={v.id}
              vertex={v}
              isNewlyEliminated={newlyEliminatedSet.has(v.id)}
              isSurvivor={isSingleSurvivor && v.status === 'alive'}
              cardIndex={idx}
              isEntryComplete={isEntryComplete}
            />
          );
        })}
      </div>
    </div>
  );
}
