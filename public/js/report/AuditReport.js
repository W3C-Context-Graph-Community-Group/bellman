/**
 * AuditReport — client-side module for the /report page.
 *
 * Reads Bellman scores from localStorage (written by BellmanPanel),
 * POSTs them to /api/report, and renders a live audit dashboard.
 * Listens for `storage` events so the report auto-refreshes
 * when scores change in another tab.
 */

const SCORES_KEY = 'bellman_scores';
const L2_SCORES_KEY = 'bellman_layer2_scores';

const container = document.getElementById('report-root');
const liveDot = document.getElementById('live-dot');

async function fetchAudit(scores, layer2Scores) {
  const hasScores = scores && Object.keys(scores).length > 0;

  if (!hasScores) {
    const res = await fetch('/api/report');
    return res.json();
  }

  const res = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores, layer2Scores }),
  });
  return res.json();
}

function readScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    const raw2 = localStorage.getItem(L2_SCORES_KEY);
    return {
      scores: raw ? JSON.parse(raw) : null,
      layer2Scores: raw2 ? JSON.parse(raw2) : null,
    };
  } catch {
    return { scores: null, layer2Scores: null };
  }
}

function renderSummary(summary) {
  if (!summary) return '';
  return `
    <div class="report-summary">
      <div class="report-summary-item pass">
        <span class="count">${summary.pass}</span> Pass
      </div>
      <div class="report-summary-item fail">
        <span class="count">${summary.fail}</span> Fail
      </div>
      <div class="report-summary-item warn">
        <span class="count">${summary.warn}</span> Warn
      </div>
      <div class="report-summary-item skip">
        <span class="count">${summary.skip}</span> Skip
      </div>
    </div>
  `;
}

function renderRules(rules) {
  if (!rules || rules.length === 0) return '<p class="report-no-scores">No rules defined.</p>';

  let rows = '';
  for (const rule of rules) {
    const checks = rule.checks || [];
    for (let i = 0; i < checks.length; i++) {
      const c = checks[i];
      rows += `
        <tr>
          ${i === 0 ? `
            <td rowspan="${checks.length}">
              <div class="rule-name">${rule.name}</div>
              <div class="paper-ref">${rule.paper_ref}</div>
            </td>
            <td rowspan="${checks.length}" style="max-width:280px">${rule.paper_definition}</td>
          ` : ''}
          <td>${c.check}</td>
          <td><span class="status-badge ${c.status}">${c.status}</span></td>
          <td>${c.detail || ''}</td>
        </tr>
      `;
    }
  }

  return `
    <table class="report-table">
      <thead>
        <tr>
          <th>Rule</th>
          <th>Paper Definition</th>
          <th>Check</th>
          <th>Status</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function render(data) {
  const hasScores = !data.status || data.status !== 'structural_only';

  let html = renderSummary(data.summary);

  if (!hasScores) {
    html += `<p class="report-no-scores">No live scores detected. Score fields in the main app tab to see live audit results.</p>`;
  }

  html += renderRules(data.rules);
  container.innerHTML = html;
}

async function refresh() {
  const { scores, layer2Scores } = readScores();
  const hasScores = scores && Object.values(scores).some((v) => v !== null);

  if (hasScores) {
    liveDot.classList.add('connected');
  } else {
    liveDot.classList.remove('connected');
  }

  try {
    const data = await fetchAudit(
      hasScores ? scores : null,
      hasScores ? layer2Scores : null,
    );
    render(data);
  } catch (err) {
    container.innerHTML = `<p class="report-no-scores">Error fetching audit: ${err.message}</p>`;
  }
}

// Wipe stale scores if the server has restarted
async function checkBoot() {
  try {
    const res = await fetch('/api/boot');
    const { bootId } = await res.json();
    const prev = localStorage.getItem('bellman_boot_id');
    if (prev && prev !== bootId) {
      localStorage.removeItem(SCORES_KEY);
      localStorage.removeItem(L2_SCORES_KEY);
    }
    localStorage.setItem('bellman_boot_id', bootId);
  } catch { /* ignore */ }
}

// Initial load
checkBoot().then(() => refresh());

// Auto-refresh when scores change in another tab
window.addEventListener('storage', (e) => {
  if (e.key === SCORES_KEY || e.key === L2_SCORES_KEY) {
    refresh();
  }
});
