import express from 'express';
const router = express.Router();

// ---------------------------------------------------------------------------
// LLM Service API Route
// ---------------------------------------------------------------------------
// This route acts as a backend proxy so that API keys are never exposed to the
// browser.  Any page served by this Express app (or any external client) can
// call these endpoints.
//
// ── Available endpoints ─────────────────────────────────────────────────────
//
//   POST /api/llm/anthropic   → Anthropic (Claude) Messages API
//   POST /api/llm/openai      → OpenAI Chat Completions API
//   POST /api/llm/google      → Google Gemini generateContent API
//
// ── How to call from any webpage ────────────────────────────────────────────
//
//   // Example: calling the Anthropic endpoint from the browser
//   const res = await fetch('/api/llm/anthropic', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       model: 'claude-sonnet-4-5-20250929',
//       max_tokens: 1024,
//       messages: [{ role: 'user', content: 'Hello, Claude!' }]
//     })
//   });
//   const data = await res.json();
//   console.log(data);
//
//   // Example: calling the OpenAI endpoint
//   const res = await fetch('/api/llm/openai', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       model: 'gpt-4o',
//       messages: [{ role: 'user', content: 'Hello, GPT!' }]
//     })
//   });
//   const data = await res.json();
//
//   // Example: calling the Google Gemini endpoint
//   const res = await fetch('/api/llm/google', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       model: 'gemini-2.0-flash',
//       contents: [{ parts: [{ text: 'Hello, Gemini!' }] }]
//     })
//   });
//   const data = await res.json();
//
// ── From an external app on a different origin ──────────────────────────────
//
//   Just use the full URL instead of a relative path:
//     fetch('http://localhost:5280/api/llm/anthropic', { ... })
//
//   If you need CORS, enable it in app.js with the `cors` npm package.
// ---------------------------------------------------------------------------

// ── Anthropic (Claude) ──────────────────────────────────────────────────────
// Proxies to https://api.anthropic.com/v1/messages
// Body is forwarded as-is; see Anthropic docs for the full schema.
router.post('/anthropic', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Anthropic request failed', detail: err.message });
  }
});

// ── OpenAI ──────────────────────────────────────────────────────────────────
// Proxies to https://api.openai.com/v1/chat/completions
// Body is forwarded as-is; see OpenAI docs for the full schema.
router.post('/openai', async (req, res) => {
  const key = process.env.OPENAI_KEY;
  if (!key) return res.status(500).json({ error: 'OPENAI_KEY not set' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'OpenAI request failed', detail: err.message });
  }
});

// ── Google Gemini ───────────────────────────────────────────────────────────
// Proxies to the Gemini generateContent REST endpoint.
// Send { model: "gemini-2.0-flash", contents: [...] } in the body.
// The model field is pulled out to build the URL; everything else is forwarded.
router.post('/google', async (req, res) => {
  const key = process.env.GOOGLE_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_KEY not set' });

  const { model, ...body } = req.body;
  const modelName = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Google request failed', detail: err.message });
  }
});

export default router;
