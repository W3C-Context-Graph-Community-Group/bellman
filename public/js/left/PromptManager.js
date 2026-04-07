import eventBus from '../events/EventBus.js';
import { PROMPT_CONFIG } from './prompt-config.js';

/**
 * PromptManager
 *
 * Owns layer configuration, prompt resolution, and cross-layer
 * output chaining.  Layer 1's raw output auto-populates Layer 2's
 * user prompt — no manual copy/paste.
 */
export class PromptManager {
  constructor() {
    this._currentLayer = 0;        // 0 = none selected
    this._outputs = new Map();     // layer → raw LLM output string
  }

  /** Current active layer number (0 if none selected). */
  get currentLayer() {
    return this._currentLayer;
  }

  /** Layer definitions from PROMPT_CONFIG (for building UI). */
  get layers() {
    return PROMPT_CONFIG;
  }

  /**
   * selectLayer(n) → { system_prompt, user_prompt, prompt_layer }
   *
   * Sets current layer and resolves the config object.
   * Layer 2's user_prompt is auto-filled from stored Layer 1 output.
   */
  selectLayer(n) {
    const layerDef = PROMPT_CONFIG[n];
    if (!layerDef) throw new Error(`Unknown layer: ${n}`);

    this._currentLayer = n;

    const config = {
      system_prompt: layerDef.system_prompt,
      user_prompt: this._resolveUserPrompt(n),
      prompt_layer: n,
    };

    eventBus.emit('prompt:layerChanged', {
      layer: n,
      config,
      hasChainedInput: n === 2 && !!this._outputs.get(1),
    });

    return config;
  }

  /**
   * getConfig() → { system_prompt, user_prompt, prompt_layer } | null
   *
   * Synchronous read of the current layer's config.
   */
  getConfig() {
    if (this._currentLayer === 0) return null;

    const layerDef = PROMPT_CONFIG[this._currentLayer];
    return {
      system_prompt: layerDef.system_prompt,
      user_prompt: this._resolveUserPrompt(this._currentLayer),
      prompt_layer: this._currentLayer,
    };
  }

  /**
   * storeOutput(layer, rawOutput)
   *
   * Saves raw LLM output for a layer.  Layer 1 output becomes
   * Layer 2's user_prompt automatically on next selectLayer(2).
   */
  storeOutput(layer, rawOutput) {
    this._outputs.set(layer, rawOutput);
    eventBus.emit('prompt:outputStored', {
      layer,
      outputLength: rawOutput.length,
      chainsTo: layer + 1,
    });
  }

  /**
   * getStoredOutput(layer) → string | undefined
   */
  getStoredOutput(layer) {
    return this._outputs.get(layer);
  }

  /**
   * reset() — clears stored outputs and deselects layer.
   */
  reset() {
    this._outputs.clear();
    this._currentLayer = 0;
  }

  // ── private ──────────────────────────────────────────────────

  _resolveUserPrompt(n) {
    const layerDef = PROMPT_CONFIG[n];

    // Layer 2 chains from Layer 1 output
    if (n === 2) {
      return this._outputs.get(1) || '';
    }

    return layerDef.default_user_prompt || '';
  }
}
