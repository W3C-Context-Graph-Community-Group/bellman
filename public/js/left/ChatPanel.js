import eventBus from '../events/EventBus.js';

const DEFAULT_MESSAGE = `Please execute this order:

date,amount,location,instrument,direction,order_type,account
4/5/2026,1000000,Singapore,SGX,buy,market,TRD-4471`;

export class ChatPanel {
  constructor(panel) {
    this.panel = panel;
    this.messages = [];
    this._sending = false;
    this._buildDOM();
    this._bindEvents();
    this._checkStatus();
  }

  _buildDOM() {
    this.panel.id = 'leftColumn';
    this.panel.innerHTML = `
      <div id="leftColumnHeader" class="chat-header">
        <h2>Agent</h2>
        <div class="chat-header-controls">
          <select class="chat-model-select">
            <option value="claude-sonnet-4-5-20250929">Sonnet 4.5</option>
          </select>
          <span class="chat-status-light">
            <span class="status-dot"></span>
            <span class="status-label">Checking</span>
          </span>
          <button class="chat-prompt-btn" title="View System Prompt">Prompt</button>
        </div>
      </div>
      <div class="chat-messages"></div>
      <div class="chat-input-area">
        <textarea id="leftColumnChatTextareaInput" class="chat-textarea" rows="1">${DEFAULT_MESSAGE}</textarea>
      </div>
      <div class="chat-send-row">
        <button class="chat-send-btn">Send</button>
      </div>

      <div class="prompt-modal-overlay" hidden>
        <div class="prompt-modal">
          <div class="prompt-modal-header">
            <h3>System Prompt</h3>
            <button class="prompt-modal-close">&times;</button>
          </div>
          <pre class="prompt-modal-body">Loading…</pre>
        </div>
      </div>
    `;
    this.messageList = this.panel.querySelector('.chat-messages');
    this.textarea = this.panel.querySelector('.chat-textarea');
    this.sendBtn = this.panel.querySelector('.chat-send-btn');
    this.modelSelect = this.panel.querySelector('.chat-model-select');
    this.statusDot = this.panel.querySelector('.status-dot');
    this.statusLabel = this.panel.querySelector('.status-label');
    this.promptBtn = this.panel.querySelector('.chat-prompt-btn');
    this.modalOverlay = this.panel.querySelector('.prompt-modal-overlay');
    this.modalBody = this.panel.querySelector('.prompt-modal-body');
    this.modalClose = this.panel.querySelector('.prompt-modal-close');
  }

  _bindEvents() {
    this.sendBtn.addEventListener('click', () => this._handleSend());
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });
    this.textarea.addEventListener('input', () => this._autoResize());
    this.promptBtn.addEventListener('click', () => this._openPromptModal());
    this.modalClose.addEventListener('click', () => this._closePromptModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this._closePromptModal();
    });
    this._autoResize();
  }

  _autoResize() {
    const ta = this.textarea;
    ta.style.height = 'auto';
    const maxH = this.panel.clientHeight * 0.3;
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
  }

  async _checkStatus() {
    try {
      const res = await fetch('/api/prompt');
      if (res.ok) {
        this._setStatus(true);
      } else {
        this._setStatus(false);
      }
    } catch {
      this._setStatus(false);
    }
  }

  _setStatus(active) {
    this.statusDot.classList.toggle('status-dot--active', active);
    this.statusDot.classList.toggle('status-dot--error', !active);
    this.statusLabel.textContent = active ? 'Active' : 'Inactive';
  }

  async _fetchSystemPrompt() {
    const res = await fetch('/api/prompt');
    if (!res.ok) throw new Error(`Failed to load prompt: HTTP ${res.status}`);
    return res.text();
  }

  async _openPromptModal() {
    this.modalOverlay.hidden = false;
    this.modalBody.textContent = 'Loading…';
    try {
      const text = await this._fetchSystemPrompt();
      this.modalBody.textContent = text;
    } catch (err) {
      this.modalBody.textContent = `Error: ${err.message}`;
    }
  }

  _closePromptModal() {
    this.modalOverlay.hidden = true;
  }

  async _handleSend() {
    const text = this.textarea.value.trim();
    if (!text || this._sending) return;

    this.textarea.value = '';
    this._autoResize();
    this._setSending(true);

    this.messages.push({ role: 'user', content: text });
    this._appendBubble('user', text);
    const sentAt = Date.now();
    eventBus.emit('message:sent', { text, timestamp: new Date().toISOString() });

    const MAX_RETRIES = 3;
    let validationErrors = 0;

    try {
      const systemPrompt = await this._fetchSystemPrompt();
      let raw = '';
      let parsed = null;
      let lastValidationErrors = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch('/api/llm/anthropic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.modelSelect.value,
            max_tokens: 4096,
            system: systemPrompt,
            messages: this.messages
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        raw = data.content?.[0]?.text ?? '';

        // Strip markdown code fences if present
        const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        // Try JSON parse
        try {
          parsed = JSON.parse(cleaned);
        } catch (e) {
          parsed = null;
          if (attempt < MAX_RETRIES) {
            validationErrors++;
            this.messages.push({ role: 'assistant', content: raw });
            this.messages.push({
              role: 'user',
              content: `Your response was not valid JSON. Parse error: ${e.message}. You MUST return ONLY raw JSON with no markdown, no backticks, no text — just a valid JSON object with "decision_trace" and "reasoning_trace" keys.`
            });
            this._appendBubble('error', `Retry ${attempt + 1}: invalid JSON — ${e.message}`);
            continue;
          }
          break;
        }

        // Validate schema via backend
        const valRes = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        const valData = await valRes.json();

        if (valData.valid) {
          lastValidationErrors = null;
          break;
        }

        // Schema validation failed
        lastValidationErrors = valData.errors;
        validationErrors++;

        if (attempt < MAX_RETRIES) {
          const errorSummary = valData.errors.map(e =>
            `${e.instancePath || '/'}: ${e.message}`
          ).join('; ');
          this.messages.push({ role: 'assistant', content: raw });
          this.messages.push({
            role: 'user',
            content: `Your JSON failed schema validation: ${errorSummary}. You MUST return ONLY a JSON object with exactly two keys: "decision_trace" (object) and "reasoning_trace" (object). No other keys, no wrapping text.`
          });
          this._appendBubble('error', `Retry ${attempt + 1}: schema validation failed — ${errorSummary}`);
          parsed = null;
        }
      }

      const elapsedMs = Date.now() - sentAt;
      const totalChars = this.messages.reduce((sum, m) => sum + m.content.length, 0) + raw.length;

      eventBus.emit('message:stats', {
        elapsedMs,
        totalChars,
        estimatedTokens: Math.ceil(totalChars / 4),
        validationErrors,
        timestamp: new Date().toISOString()
      });

      this.messages.push({ role: 'assistant', content: raw });
      this._appendBubble('assistant', raw);
      this._setStatus(true);

      let error = null;
      if (!parsed) {
        error = 'Failed to produce valid JSON after retries';
      } else if (lastValidationErrors) {
        error = lastValidationErrors.map(e => `${e.instancePath || '/'}: ${e.message}`).join('; ');
      }

      eventBus.emit('message:received', {
        raw,
        parsed,
        timestamp: new Date().toISOString(),
        ...(error && { error })
      });
    } catch (err) {
      this._appendBubble('error', err.message);
      this._setStatus(false);

      const elapsedMs = Date.now() - sentAt;
      eventBus.emit('message:stats', {
        elapsedMs,
        totalChars: this.messages.reduce((sum, m) => sum + m.content.length, 0),
        estimatedTokens: Math.ceil(this.messages.reduce((sum, m) => sum + m.content.length, 0) / 4),
        validationErrors,
        timestamp: new Date().toISOString()
      });

      eventBus.emit('message:received', {
        raw: '',
        parsed: null,
        timestamp: new Date().toISOString(),
        error: err.message
      });
    } finally {
      this._setSending(false);
    }
  }

  _setSending(val) {
    this._sending = val;
    this.sendBtn.disabled = val;
    this.textarea.disabled = val;
  }

  _appendBubble(type, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble--${type}`;
    bubble.textContent = text;
    this.messageList.appendChild(bubble);
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }
}
