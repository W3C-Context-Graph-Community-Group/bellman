const DEFAULT_MESSAGE = `Please execute this order:

date,amount,location,instrument,direction,order_type,account
4/5/2026,1000000,Singapore,SGX,buy,market,TRD-4471`;

export default {
  name: 'trading',
  title: 'Agent',
  defaultMessage: DEFAULT_MESSAGE,
  promptEndpoint: '/api/prompt',
  modelOptions: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' }
  ],
  tools: null,

  handleToolCall: null,

  async handleResponse(data, messages) {
    const raw = data.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let parsed = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return {
        raw,
        parsed: null,
        error: `JSON parse error: ${e.message}`,
        retry: true,
        retryMessage: `Your response was not valid JSON. Parse error: ${e.message}. You MUST return ONLY raw JSON with no markdown, no backticks, no text — just a valid JSON object with "decision_trace" and "reasoning_trace" keys.`
      };
    }

    // Validate schema via backend
    let valData;
    try {
      const valRes = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      valData = await valRes.json();
    } catch (e) {
      return {
        raw,
        parsed: null,
        error: `Validation request failed: ${e.message}`,
        retry: false
      };
    }

    if (valData.valid) {
      return { raw, parsed, error: null, retry: false };
    }

    const errorSummary = valData.errors.map(e =>
      `${e.instancePath || '/'}: ${e.message}`
    ).join('; ');

    return {
      raw,
      parsed: null,
      error: `Schema validation failed: ${errorSummary}`,
      retry: true,
      retryMessage: `Your JSON failed schema validation: ${errorSummary}. You MUST return ONLY a JSON object with exactly two keys: "decision_trace" (object) and "reasoning_trace" (object). No other keys, no wrapping text.`
    };
  }
};
