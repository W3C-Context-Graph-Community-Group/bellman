/**
 * LogCapture — transparent pipeline event logger.
 *
 * Listens to EventBus events (message:sent, message:received, layer2:response,
 * bellman:classified, message:error, message:tool_call, message:tool_result,
 * message:stats) and POSTs each to /services/log/task/capture.
 *
 * One session ID per page load. Does not modify the pipeline — fire and forget.
 */
import eventBus from './events/EventBus.js';

export class LogCapture {
  constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._currentLayer = null;
    this._subscribe();
    console.log(`[LogCapture] Session: ${this.sessionId}`);
  }

  get session() {
    return this.sessionId;
  }

  _subscribe() {
    eventBus.on('prompt:layerChanged', (data) => {
      this._currentLayer = data.layer;
      this._capture('prompt', 'layer-changed', {
        layer: data.layer,
        hasChainedInput: data.hasChainedInput
      });
    });

    eventBus.on('message:sent', (data) => {
      this._capture(this._currentLayer ?? '?', 'sent', data.text);
    });

    eventBus.on('message:received', (data) => {
      this._capture(this._currentLayer ?? '?', 'received', {
        raw: data.raw,
        parsed: data.parsed,
        error: data.error || null
      });
    });

    eventBus.on('message:error', (data) => {
      this._capture(this._currentLayer ?? '?', 'error', {
        attempt: data.attempt,
        type: data.type,
        detail: data.detail,
        raw: data.raw
      });
    });

    eventBus.on('message:stats', (data) => {
      this._capture(this._currentLayer ?? '?', 'stats', {
        elapsedMs: data.elapsedMs,
        totalChars: data.totalChars,
        estimatedTokens: data.estimatedTokens,
        validationErrors: data.validationErrors
      });
    });

    eventBus.on('message:tool_call', (data) => {
      this._capture(this._currentLayer ?? '?', 'tool-call', {
        tool: data.tool,
        input: data.input
      });
    });

    eventBus.on('message:tool_result', (data) => {
      this._capture(this._currentLayer ?? '?', 'tool-result', {
        tool: data.tool,
        result: data.result
      });
    });

    eventBus.on('bellman:classified', (data) => {
      this._capture('bellman', 'classified', null, data.classifications);
    });

    eventBus.on('layer2:response', (data) => {
      this._capture(2, 'layer2-response', {
        raw: data.raw,
        parsed: data.parsed
      });
    });
  }

  _capture(layer, direction, payload, aduh, entropy) {
    // Fire and forget — do not block the pipeline
    fetch('/services/log/task/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        layer,
        direction,
        payload,
        aduh: aduh || undefined,
        entropy: entropy || undefined
      })
    }).catch(err => {
      console.warn('[LogCapture] Capture failed:', err.message);
    });
  }
}
