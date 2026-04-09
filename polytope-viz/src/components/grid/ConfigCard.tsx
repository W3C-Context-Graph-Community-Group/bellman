import React from 'react';
import type { Vertex } from '../../types';

interface ConfigCardProps {
  vertex: Vertex;
  isNewlyEliminated: boolean;
  isSurvivor: boolean;
  cardIndex: number;
  isEntryComplete: boolean;
}

export const ConfigCard = React.memo(function ConfigCard({
  vertex,
  isNewlyEliminated,
  isSurvivor,
  cardIndex,
  isEntryComplete,
}: ConfigCardProps) {
  const isAlive = vertex.status === 'alive';
  const isEliminated = vertex.status === 'eliminated';
  const isGhost = vertex.status === 'ghost';

  let className = 'config-card';
  if (isEliminated) className += ' eliminated';
  if (isNewlyEliminated) className += ' newly-eliminated';
  if (isSurvivor) className += ' survivor';
  if (isGhost) className += ' ghost';
  if (!isEntryComplete) className += ' entering';

  const lines = vertex.label.split(' / ');

  return (
    <div
      className={className}
      style={{
        gridRow: vertex.gridRow + 3, // +3: skip 2 header rows (1-based)
        gridColumn: vertex.gridCol + 2, // +2: skip 1 row-header col
        '--card-index': cardIndex,
      } as React.CSSProperties}
      title={`#${vertex.id + 1}: ${vertex.label}`}
    >
      <span className="card-id">#{vertex.id + 1}</span>
      {lines.map((line, i) => (
        <span key={i} className="card-line">{line}</span>
      ))}
    </div>
  );
});
