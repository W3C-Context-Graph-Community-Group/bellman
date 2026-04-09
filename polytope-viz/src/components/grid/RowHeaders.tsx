import { L1_ROW_HEADERS, L2_ROW_HEADERS } from '../../data/seed';

interface RowHeadersProps {
  activeLayer: 1 | 2;
}

export function RowHeaders({ activeLayer }: RowHeadersProps) {
  if (activeLayer === 1) {
    // Layer 1: location(5) × instrument(3) = 15 rows
    // Show combined location + instrument in each row header cell
    return (
      <>
        {L1_ROW_HEADERS.map((row, i) => {
          // Show location label only on first instrument of each group
          const isFirstInGroup = i % 3 === 0;
          return (
            <div
              key={`row-${i}`}
              className={`row-header-cell ${isFirstInGroup ? 'group-start' : ''}`}
              style={{ gridRow: i + 3, gridColumn: 1 }}
            >
              {isFirstInGroup && (
                <span className="row-group-label">{row.location}</span>
              )}
              <span className="row-sub-label">{row.instrument}</span>
            </div>
          );
        })}
      </>
    );
  }

  // Layer 2: correlation(3) × risk_threshold(3) = 9 rows
  return (
    <>
      {L2_ROW_HEADERS.map((row, i) => {
        const isFirstInGroup = i % 3 === 0;
        return (
          <div
            key={`row-${i}`}
            className={`row-header-cell ${isFirstInGroup ? 'group-start' : ''}`}
            style={{ gridRow: i + 3, gridColumn: 1 }}
          >
            {isFirstInGroup && (
              <span className="row-group-label">{row.correlation}</span>
            )}
            <span className="row-sub-label">{row.risk_threshold}</span>
          </div>
        );
      })}
    </>
  );
}
