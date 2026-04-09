import { L1_COL_HEADERS, L2_COL_HEADERS } from '../../data/seed';

interface ColumnHeadersProps {
  activeLayer: 1 | 2;
}

export function ColumnHeaders({ activeLayer }: ColumnHeadersProps) {
  if (activeLayer === 1) {
    // Layer 1: date(2) × amount(5) = 10 columns
    // Top row: date spans 5 cols each
    const dateLabels = ['MM/DD → April 5', 'DD/MM → May 4'];
    return (
      <>
        {/* Top-level date headers */}
        {dateLabels.map((date, di) => (
          <div
            key={`date-${di}`}
            className="col-header-group"
            style={{ gridColumn: `${di * 5 + 2} / span 5`, gridRow: 1 }}
          >
            {date}
          </div>
        ))}
        {/* Sub-level amount headers */}
        {L1_COL_HEADERS.map((col, i) => (
          <div
            key={`amt-${i}`}
            className="col-header-sub"
            style={{ gridColumn: i + 2, gridRow: 2 }}
          >
            {col.amount}
          </div>
        ))}
      </>
    );
  }

  // Layer 2: volatility(4) × hedging(3) = 12 columns
  const volLabels = ['GBM', 'Heston', 'SABR', 'Local vol'];
  return (
    <>
      {volLabels.map((vol, vi) => (
        <div
          key={`vol-${vi}`}
          className="col-header-group"
          style={{ gridColumn: `${vi * 3 + 2} / span 3`, gridRow: 1 }}
        >
          {vol}
        </div>
      ))}
      {L2_COL_HEADERS.map((col, i) => (
        <div
          key={`hedge-${i}`}
          className="col-header-sub"
          style={{ gridColumn: i + 2, gridRow: 2 }}
        >
          {col.hedging}
        </div>
      ))}
    </>
  );
}
