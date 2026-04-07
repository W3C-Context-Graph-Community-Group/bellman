/**
 * MetaAnalysisModal — Layer 5 God's-eye view.
 *
 * Three sections:
 *   1. Event Log  — raw session log from /capture (always available)
 *   2. Introspect — per-field analysis from /introspect (on demand)
 *   3. Reason     — diff vs answer key from /reason (on demand)
 *
 * Opens as a modal overlay on the existing run — not a new page.
 */

const ANSWER_KEY_DISPLAY = [
  { field: 'date',       value: '4/5/2026',  interpretations: 2, options: 'MM/DD (April 5) or DD/MM (May 4)',                                              bits: '1.00' },
  { field: 'amount',     value: '1000000',    interpretations: 5, options: 'USD notional, SGD notional, GBP notional, shares, lots',                         bits: '2.32' },
  { field: 'location',   value: 'Singapore',  interpretations: 5, options: 'client location, exchange venue, broker, settlement jurisdiction, employee desk', bits: '2.32' },
  { field: 'instrument', value: 'SGX',        interpretations: 3, options: 'Singapore Exchange (venue), ticker symbol, index product',                       bits: '1.58' },
];

export class MetaAnalysisModal {
  constructor(logCapture) {
    this.logCapture = logCapture;
    this._built = false;
    this._introspectData = null;
    this._reasonData = null;
  }

  open() {
    this._ensureDOM();
    this._overlay.classList.remove('hidden');
    this._loadEventLog();
    // Reset analysis sections to initial state
    this._introspectBody.innerHTML = '<p class="meta-placeholder">Click "Run Analysis" to analyze the pipeline log.</p>';
    this._reasonBody.innerHTML = '<p class="meta-placeholder">Runs after Introspect completes.</p>';
    this._introspectData = null;
    this._reasonData = null;
  }

  close() {
    if (this._overlay) this._overlay.classList.add('hidden');
  }

  _ensureDOM() {
    if (this._built) return;
    this._built = true;

    this._overlay = document.createElement('div');
    this._overlay.className = 'meta-modal hidden';

    const content = document.createElement('div');
    content.className = 'meta-modal-content';

    // Header
    const header = document.createElement('div');
    header.className = 'meta-modal-header';
    header.innerHTML = `
      <h2>Meta-Analysis <span class="meta-badge">Layer 5</span></h2>
      <div class="meta-header-actions">
        <button class="meta-run-btn">Run Analysis</button>
        <button class="meta-close-btn">&times;</button>
      </div>
    `;
    content.appendChild(header);

    // Answer Key sidebar
    const answerKey = document.createElement('div');
    answerKey.className = 'meta-answer-key';
    answerKey.innerHTML = `
      <h3>Answer Key <span class="meta-bits-total">7.22 bits</span></h3>
      <div class="meta-answer-key-fields">
        ${ANSWER_KEY_DISPLAY.map(f => `
          <div class="meta-ak-field">
            <span class="meta-ak-name">${f.field}</span>
            <span class="meta-ak-value">${f.value}</span>
            <span class="meta-ak-bits">${f.bits} bits</span>
            <span class="meta-ak-options">${f.interpretations} interpretations: ${f.options}</span>
          </div>
        `).join('')}
      </div>
    `;
    content.appendChild(answerKey);

    // Sections container
    const sections = document.createElement('div');
    sections.className = 'meta-sections';

    // Section 1: Event Log
    const logSection = document.createElement('div');
    logSection.className = 'meta-section';
    logSection.innerHTML = `<h3>Event Log</h3>`;
    this._logBody = document.createElement('pre');
    this._logBody.className = 'meta-log-body';
    this._logBody.textContent = 'Loading...';
    logSection.appendChild(this._logBody);
    sections.appendChild(logSection);

    // Section 2: Introspect
    const introspectSection = document.createElement('div');
    introspectSection.className = 'meta-section';
    introspectSection.innerHTML = `<h3>Introspect <span class="meta-section-subtitle">Per-field analysis by outside analyst</span></h3>`;
    this._introspectBody = document.createElement('div');
    this._introspectBody.className = 'meta-introspect-body';
    this._introspectBody.innerHTML = '<p class="meta-placeholder">Click "Run Analysis" to analyze the pipeline log.</p>';
    introspectSection.appendChild(this._introspectBody);
    sections.appendChild(introspectSection);

    // Section 3: Reason
    const reasonSection = document.createElement('div');
    reasonSection.className = 'meta-section';
    reasonSection.innerHTML = `<h3>Reason <span class="meta-section-subtitle">Diff vs answer key</span></h3>`;
    this._reasonBody = document.createElement('div');
    this._reasonBody.className = 'meta-reason-body';
    this._reasonBody.innerHTML = '<p class="meta-placeholder">Runs after Introspect completes.</p>';
    reasonSection.appendChild(this._reasonBody);
    sections.appendChild(reasonSection);

    content.appendChild(sections);
    this._overlay.appendChild(content);
    document.body.appendChild(this._overlay);

    // Events
    header.querySelector('.meta-close-btn').addEventListener('click', () => this.close());
    header.querySelector('.meta-run-btn').addEventListener('click', () => this._runAnalysis());
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close();
    });
  }

  async _loadEventLog() {
    const sessionId = this.logCapture.session;
    try {
      const res = await fetch(`/services/log/task/capture?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) {
        this._logBody.textContent = res.status === 404
          ? 'No events captured yet. Run a pipeline first.'
          : `Error loading log: HTTP ${res.status}`;
        return;
      }
      const text = await res.text();
      this._logBody.textContent = text || '(empty log)';
    } catch (err) {
      this._logBody.textContent = `Error: ${err.message}`;
    }
  }

  async _runAnalysis() {
    const sessionId = this.logCapture.session;

    // Step 1: Introspect
    this._introspectBody.innerHTML = '<p class="meta-loading">Running introspect analysis...</p>';
    this._reasonBody.innerHTML = '<p class="meta-placeholder">Waiting for Introspect...</p>';

    try {
      const res = await fetch('/services/log/task/introspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      const data = await res.json();

      if (!res.ok || !data.findings) {
        this._introspectBody.innerHTML = `
          <p class="meta-error">Introspect failed</p>
          <pre class="meta-raw">${data.raw || data.error || JSON.stringify(data, null, 2)}</pre>
        `;
        return;
      }

      this._introspectData = data.findings;
      this._renderIntrospect(data.findings);

      // Step 2: Reason (auto-triggers after introspect)
      await this._runReason(data.findings);
    } catch (err) {
      this._introspectBody.innerHTML = `<p class="meta-error">Error: ${err.message}</p>`;
    }
  }

  _renderIntrospect(findings) {
    let html = '';

    if (findings.fields && Array.isArray(findings.fields)) {
      html += '<div class="meta-fields-grid">';
      for (const field of findings.fields) {
        const holds = field.closure_property_holds;
        const statusClass = holds ? 'meta-field--ok' : 'meta-field--broken';

        html += `
          <div class="meta-field-card ${statusClass}">
            <div class="meta-field-header">
              <span class="meta-field-name">${field.name}</span>
              <span class="meta-field-closure ${holds ? 'meta-closure--ok' : 'meta-closure--broken'}">
                ${holds ? 'Closure Holds' : 'Closure Broken'}
              </span>
            </div>
            <div class="meta-field-rows">
              <div class="meta-field-row">
                <span class="meta-field-label">L1 Input:</span>
                <span>${field.layer1_input || '?'}</span>
              </div>
              <div class="meta-field-row">
                <span class="meta-field-label">L1 Behavior:</span>
                <span class="meta-behavior meta-behavior--${field.layer1_behavior}">${field.layer1_behavior || '?'}</span>
              </div>
              <div class="meta-field-row">
                <span class="meta-field-label">L1 Output:</span>
                <span>${field.layer1_output || '?'}</span>
              </div>
              <div class="meta-field-row">
                <span class="meta-field-label">L2 Treated As:</span>
                <span class="meta-treated meta-treated--${field.layer2_treated_as}">${field.layer2_treated_as || '?'}</span>
              </div>
              <div class="meta-field-row">
                <span class="meta-field-label">L2 Referenced Ambiguity:</span>
                <span>${field.layer2_referenced_ambiguity ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    if (findings.summary) {
      const s = findings.summary;
      html += `
        <div class="meta-summary">
          <span class="meta-summary-stat">Closure holds: ${s.fields_where_closure_holds} / ${s.total_ambiguous_fields}</span>
          <span class="meta-summary-stat">Inherited entropy visible: ${s.inherited_entropy_visible_to_layer2}</span>
        </div>
      `;
    }

    this._introspectBody.innerHTML = html;
  }

  async _runReason(introspectFindings) {
    this._reasonBody.innerHTML = '<p class="meta-loading">Running reason analysis...</p>';

    try {
      const res = await fetch('/services/log/task/reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ introspectFindings })
      });

      const data = await res.json();

      if (!res.ok || !data.findings) {
        this._reasonBody.innerHTML = `
          <p class="meta-error">Reason failed</p>
          <pre class="meta-raw">${data.raw || data.error || JSON.stringify(data, null, 2)}</pre>
        `;
        return;
      }

      this._reasonData = data.findings;
      this._renderReason(data.findings, data.answerKey, data.totalBits);
    } catch (err) {
      this._reasonBody.innerHTML = `<p class="meta-error">Error: ${err.message}</p>`;
    }
  }

  _renderReason(findings, answerKey, totalBits) {
    let html = '';

    if (findings.diff && Array.isArray(findings.diff)) {
      html += '<div class="meta-diff-grid">';
      for (const item of findings.diff) {
        const holds = item.closure_holds;
        const cls = holds ? 'meta-diff--ok' : 'meta-diff--broken';

        html += `
          <div class="meta-diff-card ${cls}">
            <div class="meta-diff-header">
              <span class="meta-diff-field">${item.field}</span>
              <span class="meta-diff-bits">${item.answer_key_entropy_bits} bits (${item.answer_key_interpretations} interps)</span>
              <span class="meta-diff-closure ${holds ? 'meta-closure--ok' : 'meta-closure--broken'}">
                ${holds ? 'Preserved' : 'Lost'}
              </span>
            </div>
            <div class="meta-diff-statuses">
              <span class="meta-diff-status">L1: <strong>${item.layer1_status}</strong></span>
              <span class="meta-diff-arrow">&rarr;</span>
              <span class="meta-diff-status">L2: <strong>${item.layer2_status}</strong></span>
            </div>
            <p class="meta-diff-explanation">${item.explanation || ''}</p>
          </div>
        `;
      }
      html += '</div>';
    }

    if (findings.summary) {
      const s = findings.summary;
      html += `
        <div class="meta-reason-summary">
          <div class="meta-reason-stat">
            <span class="meta-reason-label">Total Answer Key</span>
            <span class="meta-reason-value">${s.total_answer_key_bits} bits</span>
          </div>
          <div class="meta-reason-stat">
            <span class="meta-reason-label">Bits Preserved</span>
            <span class="meta-reason-value meta-reason-value--ok">${s.bits_preserved_through_pipeline} bits</span>
          </div>
          <div class="meta-reason-stat">
            <span class="meta-reason-label">Bits Lost</span>
            <span class="meta-reason-value meta-reason-value--bad">${s.bits_lost_at_serialization} bits</span>
          </div>
          <div class="meta-reason-stat">
            <span class="meta-reason-label">Closure</span>
            <span class="meta-reason-value">${s.closure_holds_count} hold / ${s.closure_broken_count} broken</span>
          </div>
          <p class="meta-verdict">${s.verdict || ''}</p>
        </div>
      `;
    }

    this._reasonBody.innerHTML = html;
  }
}
