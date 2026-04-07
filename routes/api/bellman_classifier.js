import express from 'express';
const router = express.Router();

// ---------------------------------------------------------------------------
// Bellman Classifier API Route
// ---------------------------------------------------------------------------
// Makes a separate LLM call to classify each field's epistemic state (A/D/U/H)
// by comparing the agent's decision_trace against semantic superpositions.
//
//   POST /api/bellman/classify
//     Body: { decision_trace, reasoning_trace, fields, semantic_superpositions }
//     Returns: { classifications: { date: "U", amount: "D", ... } }
// ---------------------------------------------------------------------------

function buildClassifierPrompt(fields, superpositions, decisionTrace, reasoningTrace) {
  const fieldList = fields.map(f => f.key).join(', ');

  let superBlock = '';
  for (const f of fields) {
    const interps = superpositions[f.key] || [f.value];
    superBlock += `- ${f.key} (value: "${f.value}"): ${JSON.stringify(interps)}\n`;
  }

  return `You are an epistemic classifier for a trading order analysis system.

Given an agent's decision trace and reasoning trace, classify how the agent handled each field's semantic ambiguity.

## Order Fields
${fieldList}

## Semantic Superpositions (all valid interpretations for each field)
${superBlock}
## Agent's Decision Trace
${JSON.stringify(decisionTrace, null, 2)}

## Agent's Reasoning Trace
${JSON.stringify(reasoningTrace, null, 2)}

## Classification Rules

For EACH field, assign exactly one grade:

- "A" (Asked): The agent explicitly asked the user for clarification on this field before proceeding. The agent halted execution to resolve ambiguity via a question.
- "D" (Detected): The agent detected/mentioned the ambiguity or multiple interpretations for this field, but chose a default without asking the user.
- "U" (Undetected): The agent silently assumed a single interpretation without mentioning any ambiguity or alternatives for this field.
- "H" (Hallucinated): The agent used a value or interpretation that does NOT appear in the semantic superposition array above. The agent fabricated information with no referent in the valid options.

## Important
- A field with only 1 interpretation (e.g., direction: ["buy"]) can still be H if the agent invented a different value, otherwise it should be U (no ambiguity to detect).
- Check the reasoning_trace carefully — if an assumption mentions alternatives for a field, that's D not U.
- Check if any value the agent chose is outside the known interpretations — that's H.

Return ONLY a valid JSON object mapping each field key to its grade. No markdown, no backticks, no explanation.

Example: {"date": "U", "amount": "D", "location": "U", "instrument": "D", "direction": "U", "order_type": "U", "account": "U"}`;
}

router.post('/classify', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { decision_trace, reasoning_trace, fields, semantic_superpositions } = req.body;

  if (!decision_trace || !fields || !semantic_superpositions) {
    return res.status(400).json({ error: 'Missing required fields: decision_trace, fields, semantic_superpositions' });
  }

  const prompt = buildClassifierPrompt(
    fields,
    semantic_superpositions,
    decision_trace,
    reasoning_trace || []
  );

  const t0 = Date.now();
  console.log(`[Bellman Classifier] ${new Date().toISOString()} → POST anthropic (classifier)`);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    console.log(`[Bellman Classifier] ${new Date().toISOString()} ← ${response.status} (${Date.now() - t0}ms)`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Classifier LLM call failed', detail: data });
    }

    const text = data.content?.[0]?.text ?? '';
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let classifications;
    try {
      classifications = JSON.parse(cleaned);
    } catch (e) {
      console.error(`[Bellman Classifier] JSON parse error: ${e.message}\nRaw: ${text}`);
      return res.status(502).json({ error: 'Classifier returned invalid JSON', raw: text });
    }

    // Validate: every value must be A, D, U, or H
    const validGrades = new Set(['A', 'D', 'U', 'H']);
    for (const [field, grade] of Object.entries(classifications)) {
      if (!validGrades.has(grade)) {
        classifications[field] = 'U'; // fallback
      }
    }

    console.log(`[Bellman Classifier] Classifications: ${JSON.stringify(classifications)}`);
    res.json({ classifications });
  } catch (err) {
    console.error(`[Bellman Classifier] ${new Date().toISOString()} Error after ${Date.now() - t0}ms: ${err.message}`);
    res.status(502).json({ error: 'Classifier request failed', detail: err.message });
  }
});

export default router;
