import { usePolytopeStore } from '../../store/usePolytopeStore';
import { ADUH_COLORS, GRADE_LABELS } from '../../types';
import type { Grade } from '../../types';

const GRADE_OPTIONS: (Grade | null)[] = [null, 'A', 'D', 'U', 'H'];

export function TablePanel() {
  const fields = usePolytopeStore((s) => s.fields);
  const selectedFieldId = usePolytopeStore((s) => s.selectedFieldId);
  const selectField = usePolytopeStore((s) => s.selectField);
  const setFieldScore = usePolytopeStore((s) => s.setFieldScore);
  const activeLayer = usePolytopeStore((s) => s.activeLayer);

  const displayFields = fields.filter((f) =>
    activeLayer === 1 ? f.layer === 1 : true,
  );

  return (
    <div className="table-panel">
      <h3 className="panel-title">Fields</h3>
      <table className="field-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>|&Omega;|</th>
            <th>H</th>
            <th>Score</th>
            <th>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {displayFields.map((f) => (
            <tr
              key={f.id}
              className={`field-row ${selectedFieldId === f.id ? 'selected' : ''} ${
                f.resolvedTo ? 'resolved' : ''
              } layer-${f.layer}`}
              onClick={() => selectField(f.id === selectedFieldId ? null : f.id)}
            >
              <td className="field-name">
                {f.layer === 2 && <span className="layer-badge">L2</span>}
                {f.name}
              </td>
              <td className="field-omega">{f.omegaSize}</td>
              <td className="field-entropy">{f.entropy.toFixed(2)}</td>
              <td className="field-score">
                <select
                  value={f.aduhScore ?? ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setFieldScore(f.id, val as Grade);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: f.aduhScore
                      ? ADUH_COLORS[f.aduhScore]
                      : 'transparent',
                    color: f.aduhScore ? '#fff' : '#94a3b8',
                  }}
                  className="score-select"
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g ?? 'none'} value={g ?? ''}>
                      {g ? `${g} — ${GRADE_LABELS[g]}` : '—'}
                    </option>
                  ))}
                </select>
              </td>
              <td className="field-resolved">
                {f.resolvedTo ?? (
                  <span className="unresolved">ambiguous</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
