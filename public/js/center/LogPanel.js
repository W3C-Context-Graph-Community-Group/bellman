import eventBus from '../events/EventBus.js';

export class LogPanel {
  constructor(panel) {
    this.panel = panel;
    this._buildDOM();
    this._subscribe();
  }

  _buildDOM() {
    this.panel.innerHTML = `
      <div class="log-header"><h2>Traces</h2></div>
      <div class="log-entries"></div>
    `;
    this.entriesList = this.panel.querySelector('.log-entries');
  }

  _subscribe() {
    eventBus.on('message:sent', (data) => this._renderSent(data));
    eventBus.on('message:stats', (data) => this._renderStats(data));
    eventBus.on('message:received', (data) => this._renderReceived(data));
  }

  _renderSent({ text, timestamp }) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <div class="log-entry-header">
        <span class="log-badge log-badge--sent">SENT</span>
        <span class="log-timestamp">${this._formatTime(timestamp)}</span>
      </div>
      <div class="log-entry-body">
        <p class="log-text">${this._escapeHTML(text)}</p>
      </div>
    `;
    this._append(entry);
  }

  _renderStats({ elapsedMs, totalChars, estimatedTokens, validationErrors, timestamp }) {
    const elapsed = elapsedMs < 1000
      ? `${elapsedMs}ms`
      : `${(elapsedMs / 1000).toFixed(2)}s`;

    const errClass = validationErrors > 0 ? ' log-stat--error' : '';

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <div class="log-entry-header">
        <span class="log-badge log-badge--stats">STATS</span>
        <span class="log-timestamp">${this._formatTime(timestamp)}</span>
      </div>
      <div class="log-entry-body log-stats-body">
        <span class="log-stat"><strong>Elapsed:</strong> ${elapsed}</span>
        <span class="log-stat"><strong>Total chars:</strong> ${totalChars.toLocaleString()}</span>
        <span class="log-stat"><strong>Est. tokens:</strong> ~${estimatedTokens.toLocaleString()}</span>
        <span class="log-stat${errClass}"><strong>Validation errors:</strong> ${validationErrors}</span>
      </div>
    `;
    this._append(entry);
  }

  _renderReceived({ raw, parsed, timestamp, error }) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    let bodyHTML = '';

    if (error && !parsed) {
      bodyHTML += `<div class="log-error-banner">Parse error: ${this._escapeHTML(error)}</div>`;
      if (raw) {
        bodyHTML += `<pre class="log-json">${this._escapeHTML(raw)}</pre>`;
      }
    } else if (parsed) {
      if (parsed.decision_trace) {
        bodyHTML += `
          <h4 class="log-section-title">decision_trace</h4>
          <pre class="log-json">${this._escapeHTML(JSON.stringify(parsed.decision_trace, null, 2))}</pre>
        `;
      }
      if (parsed.reasoning_trace) {
        bodyHTML += `
          <h4 class="log-section-title">reasoning_trace</h4>
          <pre class="log-json">${this._escapeHTML(JSON.stringify(parsed.reasoning_trace, null, 2))}</pre>
        `;
      }
      if (!parsed.decision_trace && !parsed.reasoning_trace) {
        bodyHTML += `<pre class="log-json">${this._escapeHTML(JSON.stringify(parsed, null, 2))}</pre>`;
      }
    } else {
      if (raw) {
        bodyHTML += `<pre class="log-json">${this._escapeHTML(raw)}</pre>`;
      }
    }

    entry.innerHTML = `
      <div class="log-entry-header">
        <span class="log-badge log-badge--received">RECEIVED</span>
        <span class="log-timestamp">${this._formatTime(timestamp)}</span>
      </div>
      <div class="log-entry-body">${bodyHTML}</div>
    `;
    this._append(entry);
  }

  _append(entry) {
    this.entriesList.appendChild(entry);
    this.entriesList.scrollTop = this.entriesList.scrollHeight;
  }

  _formatTime(iso) {
    return new Date(iso).toLocaleTimeString();
  }

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
