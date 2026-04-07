import eventBus from '../events/EventBus.js';

export class LogPanel {
  constructor(panel) {
    this.panel = panel;
    this._buildDOM();
    this._subscribe();
  }

  _buildDOM() {
    this.panel.innerHTML = `
      <div id="centerColumnHeader" class="log-header">
        <h2>Traces</h2>
        <div class="log-header-controls">
          <span class="log-timer">00:00.000</span>
        </div>
      </div>
      <div class="log-entries"></div>
    `;
    this.entriesList = this.panel.querySelector('.log-entries');
    this.timerEl = this.panel.querySelector('.log-timer');
    this._timerId = null;
    this._timerStart = null;
    this._nextId = 0;
  }

  _subscribe() {
    eventBus.on('message:sent', () => this._startTimer());
    eventBus.on('message:sent', (data) => this._renderSent(data));
    eventBus.on('message:error', (data) => this._renderError(data));
    eventBus.on('message:stats', () => this._stopTimer());
    eventBus.on('message:stats', (data) => this._renderStats(data));
    eventBus.on('message:received', (data) => this._renderReceived(data));
    eventBus.on('message:tool_call', (data) => this._renderToolCall(data));
    eventBus.on('message:tool_result', (data) => this._renderToolResult(data));
  }

  _startTimer() {
    this._stopTimer();
    this._timerStart = Date.now();
    this.timerEl.classList.add('log-timer--active');
    this._tick();
    this._timerId = setInterval(() => this._tick(), 47);
  }

  _stopTimer() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    this._tick();
    this.timerEl.classList.remove('log-timer--active');
  }

  _tick() {
    if (!this._timerStart) return;
    const ms = Date.now() - this._timerStart;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    this.timerEl.textContent =
      String(mins).padStart(2, '0') + ':' +
      String(secs).padStart(2, '0') + '.' +
      String(millis).padStart(3, '0');
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
    this._append(entry, 'sent');
  }

  _renderError({ attempt, type, detail, raw, timestamp }) {
    const entry = document.createElement('div');
    entry.className = 'log-entry log-entry--error';
    entry.innerHTML = `
      <div class="log-entry-header">
        <span class="log-badge log-badge--error">ERROR</span>
        <span class="log-badge log-badge--attempt">Attempt ${attempt}</span>
        <span class="log-timestamp">${this._formatTime(timestamp)}</span>
      </div>
      <div class="log-entry-body">
        <p class="log-error-type"><strong>${this._escapeHTML(type)}</strong></p>
        <p class="log-error-detail">${this._escapeHTML(detail)}</p>
        ${raw ? `<details class="log-error-raw"><summary>Raw response</summary><pre class="log-json">${this._escapeHTML(raw)}</pre></details>` : ''}
      </div>
    `;
    this._append(entry, 'error');
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
    this._append(entry, 'stats');
  }

  _renderToolCall({ tool, input, timestamp }) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <div class="log-entry-header">
        <span class="log-badge log-badge--tool">TOOL CALL</span>
        <span class="log-timestamp">${this._formatTime(timestamp)}</span>
      </div>
      <div class="log-entry-body">
        <p class="log-text"><strong>${this._escapeHTML(tool)}</strong></p>
        <pre class="log-json">${this._escapeHTML(JSON.stringify(input, null, 2))}</pre>
      </div>
    `;
    this._append(entry, 'tool_call');
  }

  _renderToolResult({ tool, result, timestamp }) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <div class="log-entry-header">
        <span class="log-badge log-badge--tool-result">TOOL RESULT</span>
        <span class="log-timestamp">${this._formatTime(timestamp)}</span>
      </div>
      <div class="log-entry-body">
        <p class="log-text"><strong>${this._escapeHTML(tool)}</strong></p>
        <pre class="log-json">${this._escapeHTML(result)}</pre>
      </div>
    `;
    this._append(entry, 'tool_result');
  }

  _renderReceived({ raw, parsed, timestamp, error }) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    let bodyHTML = '';

    if (error && !parsed) {
      bodyHTML += `<div class="log-error-banner">Error: ${this._escapeHTML(error)}</div>`;
      if (raw) {
        bodyHTML += `<pre class="log-json">${this._escapeHTML(raw)}</pre>`;
      }
    } else if (parsed) {
      bodyHTML += `<pre class="log-json">${this._escapeHTML(JSON.stringify(parsed, null, 2))}</pre>`;
    } else if (raw) {
      bodyHTML += `<pre class="log-json">${this._escapeHTML(raw)}</pre>`;
    }

    entry.innerHTML = `
      <div class="log-entry-header">
        <span class="log-badge log-badge--received">RECEIVED</span>
        <span class="log-timestamp">${this._formatTime(timestamp)}</span>
      </div>
      <div class="log-entry-body">${bodyHTML}</div>
    `;
    this._append(entry, 'received');
  }

  _append(entry, traceType) {
    entry.dataset.trace_type = traceType;
    entry.dataset.id = this._nextId++;

    // Copy button in header
    const header = entry.querySelector('.log-entry-header');
    if (header) {
      const btn = document.createElement('button');
      btn.className = 'log-copy-btn';
      btn.title = 'Copy';
      const copyIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="9" height="9" rx="1.5"/><path d="M3.5 10.5h-1a1.5 1.5 0 0 1-1.5-1.5v-7a1.5 1.5 0 0 1 1.5-1.5h7a1.5 1.5 0 0 1 1.5 1.5v1"/></svg>';
      const checkIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5 6.5-8"/></svg>';
      btn.innerHTML = copyIcon;
      btn.addEventListener('click', () => {
        const body = entry.querySelector('.log-entry-body');
        if (!body) return;
        navigator.clipboard.writeText(body.innerText).then(() => {
          btn.innerHTML = checkIcon;
          btn.classList.add('log-copy-btn--done');
          setTimeout(() => {
            btn.innerHTML = copyIcon;
            btn.classList.remove('log-copy-btn--done');
          }, 2000);
        });
      });
      header.appendChild(btn);
    }

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
