import { usePolytopeStore } from '../../store/usePolytopeStore';
import { ADUH_COLORS } from '../../types';

export function FieldLegend() {
  const fields = usePolytopeStore((s) => s.fields);
  const activeLayer = usePolytopeStore((s) => s.activeLayer);

  const visibleFields = activeLayer === 1
    ? fields.filter((f) => f.layer === 1)
    : fields;

  return (
    <div className="field-legend">
      <div className="legend-title">Field Status</div>
      <div className="legend-rows">
        {visibleFields.map((f) => {
          const isCollapsed = f.resolvedTo !== null;
          return (
            <div key={f.id} className={`legend-row ${isCollapsed ? 'collapsed' : 'ambiguous'}`}>
              <span className="legend-name">{f.name}</span>
              <span className="legend-value">{f.value}</span>
              <span className="legend-omega">|&Omega;| = {f.omegaSize}</span>
              {isCollapsed ? (
                <span
                  className="legend-status resolved"
                  style={f.aduhScore ? { borderColor: ADUH_COLORS[f.aduhScore] } : undefined}
                >
                  COLLAPSED to <strong>{f.resolvedTo}</strong>
                  {f.aduhScore && (
                    <span
                      className="aduh-badge"
                      style={{ backgroundColor: ADUH_COLORS[f.aduhScore] }}
                    >
                      {f.aduhScore}
                    </span>
                  )}
                </span>
              ) : (
                <span className="legend-status pending">ambiguous</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
