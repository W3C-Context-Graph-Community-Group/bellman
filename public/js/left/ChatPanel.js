import eventBus from '../events/EventBus.js';
import { PromptManager } from './PromptManager.js';
import { PROMPT_CONFIG } from './prompt-config.js';

export class ChatPanel {
  constructor(panel, mode) {
    this.panel = panel;
    this.mode = mode;
    this.messages = [];
    this._sending = false;
    this.promptManager = new PromptManager();
    this._buildDOM();
    this._bindEvents();

    // Read URL on init to sync dropdown with current layer
    const urlMatch = window.location.pathname.match(/\/layer\/(\d+)/);
    const initLayer = urlMatch ? Number(urlMatch[1]) : 0;
    if (initLayer > 0 && PROMPT_CONFIG[initLayer]) {
      this.promptSelect.value = String(initLayer);
      const config = this.promptManager.selectLayer(initLayer);
      this.textarea.value = config.user_prompt;
      this._autoResize();
      this.viewPromptLink.classList.remove('chat-view-prompt-link--disabled');
    }
  }

  _buildDOM() {
    const modelOptionsHTML = this.mode.modelOptions.map(
      o => `<option value="${o.value}">${o.label}</option>`
    ).join('');

    const promptOptionsHTML = Object.entries(PROMPT_CONFIG).map(
      ([n, def]) => `<option value="${n}">${def.label}</option>`
    ).join('');

    this.panel.id = 'leftColumn';
    this.panel.innerHTML = `
      <div id="leftColumnHeader" class="chat-header">
        <h2>${this.mode.title}</h2>
        <div class="chat-header-controls">
          <select class="chat-model-select">
            ${modelOptionsHTML}
          </select>
          <select class="chat-prompt-select" title="Select Layer Prompt">
            <option value="" disabled selected>Select Layer Prompt</option>
            ${promptOptionsHTML}
          </select>
          <a class="chat-view-prompt-link chat-view-prompt-link--disabled">View System Prompt</a>
        </div>
      </div>
      <div class="chat-messages"></div>
      <div class="chat-input-area">
        <textarea id="leftColumnChatTextareaInput" class="chat-textarea" rows="1"></textarea>
      </div>
      <div class="chat-send-row">
        <button class="chat-send-btn">Send</button>
      </div>

      <div class="prompt-modal-overlay" hidden>
        <div class="prompt-modal">
          <div class="prompt-modal-header">
            <h3 class="prompt-modal-title">System Prompt</h3>
            <button class="prompt-modal-close">&times;</button>
          </div>
          <pre class="prompt-modal-body"></pre>
        </div>
      </div>
    `;
    this.messageList = this.panel.querySelector('.chat-messages');
    this.textarea = this.panel.querySelector('.chat-textarea');
    this.sendBtn = this.panel.querySelector('.chat-send-btn');
    this.modelSelect = this.panel.querySelector('.chat-model-select');
    this.promptSelect = this.panel.querySelector('.chat-prompt-select');
    this.viewPromptLink = this.panel.querySelector('.chat-view-prompt-link');
    this.modalOverlay = this.panel.querySelector('.prompt-modal-overlay');
    this.modalTitle = this.panel.querySelector('.prompt-modal-title');
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
    this.promptSelect.addEventListener('change', () => {
      const layerNum = parseInt(this.promptSelect.value, 10);
      const config = this.promptManager.selectLayer(layerNum);

      // Auto-populate textarea with the resolved user prompt
      this.textarea.value = config.user_prompt;
      this._autoResize();

      // Clear conversation for new layer
      this.messages = [];
      this.messageList.innerHTML = '';

      // Enable the "View System Prompt" link
      this.viewPromptLink.classList.remove('chat-view-prompt-link--disabled');
    });
    this.viewPromptLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.promptManager.currentLayer === 0) return;
      this._openPromptModal();
    });
    this.modalClose.addEventListener('click', () => this._closePromptModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this._closePromptModal();
    });
    this._autoResize();

    // Sync when Bellman tabs change layer
    eventBus.on('bellman:layerChanged', ({ layer }) => {
      const current = parseInt(this.promptSelect.value, 10) || 0;
      if (current === layer) return;

      if (layer === 0) {
        this.promptSelect.selectedIndex = 0;
        this.promptManager.reset();
        this.textarea.value = '';
        this._autoResize();
        this.messages = [];
        this.messageList.innerHTML = '';
        this.viewPromptLink.classList.add('chat-view-prompt-link--disabled');
        return;
      }

      this.promptSelect.value = String(layer);
      const config = this.promptManager.selectLayer(layer);
      this.textarea.value = config.user_prompt;
      this._autoResize();
      this.messages = [];
      this.messageList.innerHTML = '';
      this.viewPromptLink.classList.remove('chat-view-prompt-link--disabled');
    });
  }

  _autoResize() {
    const ta = this.textarea;
    ta.style.height = 'auto';
    const maxH = this.panel.clientHeight * 0.3;
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
  }

  _openPromptModal() {
    const config = this.promptManager.getConfig();
    if (!config) return;

    const layerDef = PROMPT_CONFIG[config.prompt_layer];
    this.modalTitle.textContent = layerDef.label;
    this.modalBody.textContent = config.system_prompt;
    this.modalOverlay.hidden = false;
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

    const config = this.promptManager.getConfig();
    if (!config) {
      this._appendBubble('error', 'Please select a system prompt layer first.');
      return;
    }

    this.textarea.value = '';
    this._autoResize();
    this._setSending(true);

    this.messages.push({ role: 'user', content: text });
    this._appendBubble('user', text);
    const sentAt = Date.now();
    eventBus.emit('message:sent', { text, timestamp: new Date().toISOString() });

    const systemPrompt = config.system_prompt;
    const currentLayer = this.promptManager.currentLayer;

    const MAX_RETRIES = 3;
    let validationErrors = 0;
    let raw = '';
    let parsed = null;
    let fatalError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      raw = '';
      parsed = null;

      let res;
      console.log(`[ChatPanel] Attempt ${attempt + 1}: sending to LLM (layer=${currentLayer}, model=${this.modelSelect.value}, messages=${this.messages.length})`);
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
      const result = await this.mode.handleResponse(data, this.messages, currentLayer);
      raw = result.raw;
      parsed = result.parsed;

      if (!result.error) {
        fatalError = null;
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
      this.promptManager.storeOutput(currentLayer, raw);
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

    if (currentLayer === 2 && parsed && !error) {
      eventBus.emit('layer2:response', { raw, parsed });
    }

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
