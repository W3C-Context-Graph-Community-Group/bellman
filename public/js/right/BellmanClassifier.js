import eventBus from '../events/EventBus.js';
import { ANSWER_KEY } from './bellman-constants.js';

/**
 * BellmanClassifier
 *
 * Listens for LLM responses, fires a separate background LLM call to classify
 * each field's epistemic state (A/D/U/H), and emits the results so
 * BellmanPanel can render faint recommended highlights.
 */
export class BellmanClassifier {
  constructor() {
    this._superpositions = null; // cached from API
    this._subscribe();
  }

  _subscribe() {
    eventBus.on('message:received', (data) => this._onMessageReceived(data));
  }

  async _onMessageReceived({ parsed, error }) {
    if (error || !parsed) return;

    const decisionTrace = parsed.decision_trace;
    const reasoningTrace = parsed.reasoning_trace;
    if (!decisionTrace) return;

    // Fetch superpositions (cache after first call)
    if (!this._superpositions) {
      try {
        const res = await fetch('/api/semantic_superposition');
        const data = await res.json();
        this._superpositions = data.semantic_superpositions;
      } catch (e) {
        console.error('[BellmanClassifier] Failed to fetch superpositions:', e);
        return;
      }
    }

    // Fire the classification request in the background
    try {
      console.log('[BellmanClassifier] Requesting classification...');
      const res = await fetch('/api/bellman/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision_trace: decisionTrace,
          reasoning_trace: reasoningTrace,
          fields: ANSWER_KEY.fields,
          semantic_superpositions: this._superpositions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('[BellmanClassifier] Classification failed:', err);
        return;
      }

      const { classifications } = await res.json();
      console.log('[BellmanClassifier] Classifications received:', classifications);

      eventBus.emit('bellman:classified', { classifications });
    } catch (e) {
      console.error('[BellmanClassifier] Classification request error:', e);
    }
  }
}
