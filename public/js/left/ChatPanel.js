import eventBus from '../events/EventBus.js';

export class ChatPanel {
  constructor(panel, mode) {
    this.panel = panel;
    this.mode = mode;
    this.messages = [];
    this._sending = false;
    this._buildDOM();
    this._bindEvents();
    this._checkStatus();
  }

  _buildDOM() {
    const modelOptionsHTML = this.mode.modelOptions.map(
      o => `<option value="${o.value}">${o.label}</option>`
    ).join('');

    this.panel.id = 'leftColumn';
    this.panel.innerHTML = `
      <div id="leftColumnHeader" class="chat-header">
        <h2>${this.mode.title}</h2>
        <div class="chat-header-controls">
          <select class="chat-model-select">
            ${modelOptionsHTML}
          </select>
          <span class="chat-status-light">
            <span class="status-dot"></span>
            <span class="status-label">Checking</span>
          </span>
          <button class="chat-prompt-btn" title="View System Prompt">System Prompt</button>
        </div>
      </div>
      <div class="chat-messages"></div>
      <div class="chat-input-area">
        <textarea id="leftColumnChatTextareaInput" class="chat-textarea" rows="1">${this.mode.defaultMessage}</textarea>
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
      const res = await fetch(this.mode.promptEndpoint);
      this._setStatus(res.ok);
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
    const res = await fetch(this.mode.promptEndpoint);
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

  async _callLLM(systemPrompt) {
    const body = {
      model: this.modelSelect.value,
      max_tokens: 4096,
      system: systemPrompt,
      messages: this.messages
    };
    if (this.mode.tools) {
      body.tools = this.mode.tools;
    }
    console.log(`[ChatPanel] _callLLM: POST /api/llm/anthropic (${JSON.stringify(body).length} bytes)`);
    const res = await fetch('/api/llm/anthropic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res;
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
    let raw = '';
    let parsed = null;
    let fatalError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      raw = '';
      parsed = null;

      let systemPrompt;
      console.log(`[ChatPanel] Attempt ${attempt + 1}: fetching system prompt from ${this.mode.promptEndpoint}`);
      try {
        systemPrompt = await this._fetchSystemPrompt();
      } catch (e) {
        validationErrors++;
        fatalError = `Prompt fetch failed: ${e.message}`;
        eventBus.emit('message:error', {
          attempt: attempt + 1, type: 'Network', detail: fatalError, raw: '', timestamp: new Date().toISOString()
        });
        this._appendBubble('error', `Attempt ${attempt + 1}: ${fatalError}`);
        this._setStatus(false);
        break;
      }

      let res;
      console.log(`[ChatPanel] Attempt ${attempt + 1}: sending to LLM (model=${this.modelSelect.value}, messages=${this.messages.length}, tools=${this.mode.tools?.length ?? 0})`);
      const llmStart = Date.now();
      const waitingBubble = this._appendBubble('assistant', '...');
      let dots = 3;
      const waitingInterval = setInterval(() => {
        dots = (dots % 3) + 1;
        waitingBubble.textContent = '.'.repeat(dots);
      }, 500);
      try {
        res = await this._callLLM(systemPrompt);
      } catch (e) {
        clearInterval(waitingInterval);
        waitingBubble.remove();
        console.error(`[ChatPanel] LLM fetch threw after ${Date.now() - llmStart}ms:`, e.message);
        validationErrors++;
        fatalError = `LLM request failed: ${e.message}`;
        eventBus.emit('message:error', {
          attempt: attempt + 1, type: 'Network', detail: fatalError, raw: '', timestamp: new Date().toISOString()
        });
        this._appendBubble('error', `Attempt ${attempt + 1}: ${fatalError}`);
        this._setStatus(false);
        break;
      }
      clearInterval(waitingInterval);
      waitingBubble.remove();
      console.log(`[ChatPanel] LLM responded HTTP ${res.status} after ${Date.now() - llmStart}ms`);

      if (!res.ok) {
        validationErrors++;
        fatalError = `HTTP ${res.status}`;
        eventBus.emit('message:error', {
          attempt: attempt + 1, type: 'HTTP error', detail: fatalError, raw: '', timestamp: new Date().toISOString()
        });
        this._appendBubble('error', `Attempt ${attempt + 1}: ${fatalError}`);
        this._setStatus(false);
        break;
      }

      let data = await res.json();
      console.log(`[ChatPanel] LLM stop_reason=${data.stop_reason}, content_blocks=${data.content?.length}`);

      // Tool-use loop: if the model wants to call tools, handle them
      if (data.stop_reason === 'tool_use' && this.mode.handleToolCall) {
        data = await this._handleToolUseLoop(data, systemPrompt);
        if (data._fatalError) {
          fatalError = data._fatalError;
          validationErrors++;
          break;
        }
      }

      // Delegate to mode's handleResponse
      const result = await this.mode.handleResponse(data, this.messages);
      raw = result.raw;
      parsed = result.parsed;

      if (!result.error) {
        fatalError = null;
        this._setStatus(true);
        break;
      }

      // Mode reported an error
      validationErrors++;
      eventBus.emit('message:error', {
        attempt: attempt + 1,
        type: result.retry ? 'Validation' : 'Fatal',
        detail: result.error,
        raw,
        timestamp: new Date().toISOString()
      });

      if (result.retry && attempt < MAX_RETRIES && result.retryMessage) {
        this.messages.push({ role: 'assistant', content: raw });
        this.messages.push({ role: 'user', content: result.retryMessage });
        this._appendBubble('error', `Retry ${attempt + 1}: ${result.error}`);
        continue;
      }

      if (!result.retry) {
        fatalError = result.error;
      }
      break;
    }

    const elapsedMs = Date.now() - sentAt;
    const totalChars = this.messages.reduce((sum, m) => {
      if (typeof m.content === 'string') return sum + m.content.length;
      return sum;
    }, 0) + raw.length;

    eventBus.emit('message:stats', {
      elapsedMs,
      totalChars,
      estimatedTokens: Math.ceil(totalChars / 4),
      validationErrors,
      timestamp: new Date().toISOString()
    });

    if (raw) {
      this.messages.push({ role: 'assistant', content: raw });
    }
    if (parsed || (!fatalError && raw)) {
      this._appendBubble('assistant', 'Executed');
    } else {
      this._appendBubble('error', fatalError || 'No response');
    }

    let error = null;
    if (fatalError) {
      error = fatalError;
    } else if (this.mode.tools && !parsed && raw) {
      // For tool-use modes, raw text without parsed is fine (not an error)
      error = null;
    } else if (!parsed && !raw) {
      error = 'No response received';
    }

    eventBus.emit('message:received', {
      raw,
      parsed,
      timestamp: new Date().toISOString(),
      ...(error && { error })
    });

    this._setSending(false);
  }

  async _handleToolUseLoop(data, systemPrompt) {
    const MAX_TOOL_ROUNDS = 5;
    console.log(`[ChatPanel] Entering tool-use loop`);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const toolUseBlocks = data.content.filter(b => b.type === 'tool_use');
      if (toolUseBlocks.length === 0) break;
      console.log(`[ChatPanel] Tool round ${round + 1}: ${toolUseBlocks.length} tool call(s)`);

      // Add assistant message with the full content (text + tool_use blocks)
      this.messages.push({ role: 'assistant', content: data.content });

      const toolResults = [];
      for (const block of toolUseBlocks) {
        console.log(`[ChatPanel] Calling tool: ${block.name}`, block.input);
        this._appendBubble('assistant', `Calling tool: ${block.name}(${JSON.stringify(block.input)})`);
        eventBus.emit('message:tool_call', {
          tool: block.name,
          input: block.input,
          timestamp: new Date().toISOString()
        });

        let result;
        const toolStart = Date.now();
        try {
          result = await this.mode.handleToolCall(block.name, block.input);
        } catch (e) {
          result = JSON.stringify({ error: e.message });
        }
        console.log(`[ChatPanel] Tool ${block.name} returned after ${Date.now() - toolStart}ms (${result.length} chars)`);

        eventBus.emit('message:tool_result', {
          tool: block.name,
          result: result.substring(0, 500),
          timestamp: new Date().toISOString()
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result
        });
      }

      this.messages.push({ role: 'user', content: toolResults });

      // Call LLM again with tool results
      let res;
      try {
        res = await this._callLLM(systemPrompt);
      } catch (e) {
        return { _fatalError: `LLM request failed during tool loop: ${e.message}` };
      }

      if (!res.ok) {
        return { _fatalError: `HTTP ${res.status} during tool loop` };
      }

      data = await res.json();

      // If the model is done (no more tool calls), return the final response
      if (data.stop_reason !== 'tool_use') {
        return data;
      }
    }

    return data;
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
    return bubble;
  }
}
