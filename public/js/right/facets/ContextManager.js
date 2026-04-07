/**
 * ContextManager
 *
 * Renders context cards into the CONTEXT facet body.
 * Cards use the same .bellman-field design but have no semantic superposition
 * and no A/D/U/H scoring buttons — these are observable facts, not ambiguous.
 */
export class ContextManager {
  constructor() {
    this.fields = this._collect();
  }

  _collect() {
    const now = new Date();

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      || `UTC${now.getTimezoneOffset() <= 0 ? '+' : '-'}${String(Math.abs(now.getTimezoneOffset() / 60)).padStart(2, '0')}:${String(Math.abs(now.getTimezoneOffset() % 60)).padStart(2, '0')}`;

    return [
      {
        key: 'user_timezone',
        name: 'User timezone',
        value: tz,
      },
      {
        key: 'session_start_utc',
        name: 'UTC timestamp of session start',
        value: now.toISOString(),
      },
    ];
  }

  render(facetBody) {
    facetBody.innerHTML = '';
    this.fields.forEach((field) => {
      facetBody.appendChild(this._buildCard(field));
    });
  }

  _buildCard(field) {
    const row = document.createElement('div');
    row.className = 'bellman-field';
    row.dataset.field = field.key;

    const info = document.createElement('div');
    info.className = 'bellman-field-info';
    info.innerHTML = `
      <span class="bellman-field-name">${field.name}</span>
      <span class="bellman-field-value">${field.value}</span>
    `;
    row.appendChild(info);

    return row;
  }
}
