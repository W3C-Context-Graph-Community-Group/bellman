import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Log files live in services/log/sessions/
const SESSIONS_DIR = path.join(__dirname, 'sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
//  Helper: resolve session log file path
// ---------------------------------------------------------------------------
function logPath(sessionId) {
  // Sanitize to prevent path traversal
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(SESSIONS_DIR, `${safe}.txt`);
}

function formatTimestamp() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
//  POST /services/log/task/capture
//  Appends a timestamped entry to the session log file.
// ---------------------------------------------------------------------------
router.post('/task/capture', (req, res) => {
  const { sessionId, layer, direction, payload, aduh, entropy } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const ts = formatTimestamp();
  const filePath = logPath(sessionId);

  let entry = `\n[${ ts }] Layer ${ layer ?? '?' } | ${ direction ?? '?' }\n`;
  entry += `${ '-'.repeat(72) }\n`;

  if (payload !== undefined) {
    const payloadStr = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload, null, 2);
    entry += `Payload:\n${ payloadStr }\n`;
  }

  if (aduh) {
    entry += `ADUH Scores: ${ JSON.stringify(aduh) }\n`;
  }

  if (entropy !== undefined) {
    entry += `Entropy: ${ entropy }\n`;
  }

  entry += `${ '-'.repeat(72) }\n`;

  try {
    fs.appendFileSync(filePath, entry, 'utf-8');
    res.json({ ok: true, file: `${sessionId}.txt`, timestamp: ts });
  } catch (err) {
    console.error('[Log/capture] Write failed:', err.message);
    res.status(500).json({ error: 'Failed to write log', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
//  GET /services/log/task/capture?sessionId=...
//  Returns the full session log as plain text.
// ---------------------------------------------------------------------------
router.get('/task/capture', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId query param required' });
  }

  const filePath = logPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No log found for this session' });
  }

  const contents = fs.readFileSync(filePath, 'utf-8');
  res.type('text/plain').send(contents);
});

// ---------------------------------------------------------------------------
//  POST /services/log/task/introspect
//  Sends the full log to an LLM as an outside analyst with the answer key.
// ---------------------------------------------------------------------------
router.post('/task/introspect', async (req, res) => {
  const { sessionId, taskDescription } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const filePath = logPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No log found for this session' });
  }

  const logContents = fs.readFileSync(filePath, 'utf-8');

  const introspectPrompt = `You are an analyst reviewing a log of an AI agent pipeline. You have information the agents in the pipeline did not have.

Here is the answer key — these fields were ambiguous in the original input:
- date "4/5/2026": could be MM/DD (April 5) or DD/MM (May 4). 2 interpretations.
- amount "1000000": could be USD notional, SGD notional, GBP notional, shares, or lots. 5 interpretations.
- location "Singapore": could mean client location, exchange venue, broker, settlement jurisdiction, or employee desk. 5 interpretations.
- instrument "SGX": could mean Singapore Exchange (venue), ticker symbol, or index product. 3 interpretations.

Here is the full event log from the pipeline run:

${logContents}

${taskDescription ? `Additional context: ${taskDescription}\n` : ''}For each of the 4 ambiguous fields, trace what happened:
1. What value did Layer 1 receive?
2. Did Layer 1 treat it as ambiguous or as known? (check: did it ask for clarification, note the ambiguity, or silently assume?)
3. What value did Layer 1 output in its JSON?
4. Did Layer 2 treat the received value as data (fixed fact) or as an assumption (something uncertain)?
5. Did Layer 2 ever reference the original ambiguity?

Return ONLY valid JSON:
{
  "fields": [
    {
      "name": "...",
      "layer1_input": "...",
      "layer1_behavior": "asked | detected | undetected | hallucinated",
      "layer1_output": "...",
      "layer2_treated_as": "data | assumption",
      "layer2_referenced_ambiguity": true/false,
      "closure_property_holds": true/false
    }
  ],
  "summary": {
    "fields_where_closure_holds": 0,
    "total_ambiguous_fields": 4,
    "inherited_entropy_visible_to_layer2": "0 bits | partial | full"
  }
}`;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  console.log(`[Log/introspect] Sending ${logContents.length} chars of log to analyst LLM`);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{ role: 'user', content: introspectPrompt }]
      })
    });

    const data = await response.json();
    console.log(`[Log/introspect] LLM responded ${response.status}`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'LLM call failed', detail: data });
    }

    // Extract text content from response
    const text = data.content
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('') || '';

    // Try to parse JSON from the response
    let findings;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      findings = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      findings = null;
    }

    res.json({
      ok: true,
      findings,
      raw: text,
      model: data.model,
      usage: data.usage
    });
  } catch (err) {
    console.error('[Log/introspect] Error:', err.message);
    res.status(502).json({ error: 'Introspect LLM call failed', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
//  POST /services/log/task/reason
//  Takes introspect output + answer key, returns structured diff.
// ---------------------------------------------------------------------------
router.post('/task/reason', async (req, res) => {
  const { introspectFindings } = req.body;
  if (!introspectFindings) {
    return res.status(400).json({ error: 'introspectFindings is required' });
  }

  const answerKey = {
    date: { interpretations: 2, options: ['MM/DD (April 5)', 'DD/MM (May 4)'] },
    amount: { interpretations: 5, options: ['USD notional', 'SGD notional', 'GBP notional', 'shares', 'lots'] },
    location: { interpretations: 5, options: ['client location', 'exchange venue', 'broker', 'settlement jurisdiction', 'employee desk'] },
    instrument: { interpretations: 3, options: ['Singapore Exchange (venue)', 'ticker symbol', 'index product'] }
  };

  const totalBits = Math.log2(2) + Math.log2(5) + Math.log2(5) + Math.log2(3); // 7.22 bits

  const reasonPrompt = `You are comparing the results of an outside analyst's review against a known answer key.

ANSWER KEY (7.22 bits total):
- date: ${answerKey.date.interpretations} interpretations (${answerKey.date.options.join(', ')}). Entropy: ${Math.log2(2).toFixed(2)} bits.
- amount: ${answerKey.amount.interpretations} interpretations (${answerKey.amount.options.join(', ')}). Entropy: ${Math.log2(5).toFixed(2)} bits.
- location: ${answerKey.location.interpretations} interpretations (${answerKey.location.options.join(', ')}). Entropy: ${Math.log2(5).toFixed(2)} bits.
- instrument: ${answerKey.instrument.interpretations} interpretations (${answerKey.instrument.options.join(', ')}). Entropy: ${Math.log2(3).toFixed(2)} bits.

ANALYST FINDINGS:
${JSON.stringify(introspectFindings, null, 2)}

For each of the 4 ambiguous fields, compare what the analyst found against what the answer key says:
1. Did the pipeline agent treat the field as data (certain) or as an assumption (uncertain)?
2. According to the answer key, should the field have been flagged as ambiguous?
3. Did the closure property hold — i.e., did the ambiguity survive serialization from Layer 1 to Layer 2?

Return ONLY valid JSON:
{
  "diff": [
    {
      "field": "...",
      "answer_key_entropy_bits": 0.00,
      "answer_key_interpretations": 0,
      "layer1_status": "data | assumption",
      "layer2_status": "data | assumption",
      "closure_holds": true/false,
      "explanation": "..."
    }
  ],
  "summary": {
    "total_answer_key_bits": 7.22,
    "bits_preserved_through_pipeline": 0.00,
    "bits_lost_at_serialization": 0.00,
    "closure_holds_count": 0,
    "closure_broken_count": 0,
    "verdict": "..."
  }
}`;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  console.log(`[Log/reason] Sending diff analysis to LLM`);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{ role: 'user', content: reasonPrompt }]
      })
    });

    const data = await response.json();
    console.log(`[Log/reason] LLM responded ${response.status}`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'LLM call failed', detail: data });
    }

    const text = data.content
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('') || '';

    let findings;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      findings = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      findings = null;
    }

    res.json({
      ok: true,
      findings,
      raw: text,
      answerKey,
      totalBits,
      model: data.model,
      usage: data.usage
    });
  } catch (err) {
    console.error('[Log/reason] Error:', err.message);
    res.status(502).json({ error: 'Reason LLM call failed', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
//  GET /services/log/sessions
//  Lists all session log files.
// ---------------------------------------------------------------------------
router.get('/sessions', (_req, res) => {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.txt'))
      .map(f => ({
        id: f.replace('.txt', ''),
        size: fs.statSync(path.join(SESSIONS_DIR, f)).size,
        modified: fs.statSync(path.join(SESSIONS_DIR, f)).mtime.toISOString()
      }))
      .sort((a, b) => b.modified.localeCompare(a.modified));
    res.json({ sessions: files });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list sessions', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
//  GET /services/log/viewer
//  Self-contained HTML page: lists sessions, click to view log.
// ---------------------------------------------------------------------------
router.get('/viewer', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Logs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; color: #1f2937; }
    .header { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 1rem; }
    .header h1 { font-size: 1rem; font-weight: 600; }
    .header a { font-size: 0.75rem; color: #3b82f6; text-decoration: none; }
    .header a:hover { text-decoration: underline; }
    .container { display: flex; height: calc(100vh - 49px); }
    .sidebar { width: 340px; border-right: 1px solid #e5e7eb; background: #fff; overflow-y: auto; flex-shrink: 0; }
    .sidebar-header { padding: 0.6rem 1rem; font-size: 0.7rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f3f4f6; }
    .session-item { padding: 0.6rem 1rem; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.1s; }
    .session-item:hover { background: #f0f9ff; }
    .session-item.active { background: #eff6ff; border-left: 3px solid #3b82f6; }
    .session-id { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.72rem; color: #1f2937; word-break: break-all; }
    .session-meta { font-size: 0.65rem; color: #9ca3af; margin-top: 0.2rem; }
    .viewer { flex: 1; overflow: auto; padding: 1rem 1.5rem; }
    .viewer-empty { color: #9ca3af; font-size: 0.85rem; font-style: italic; padding-top: 2rem; text-align: center; }
    .log-content { background: #111827; color: #d1d5db; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.75rem; line-height: 1.55; padding: 1rem 1.25rem; border-radius: 6px; white-space: pre-wrap; word-break: break-word; min-height: 200px; }
    .no-sessions { padding: 2rem; text-align: center; color: #9ca3af; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Session Logs</h1>
    <a href="/">&larr; Back to app</a>
  </div>
  <div class="container">
    <div class="sidebar">
      <div class="sidebar-header">Sessions</div>
      <div id="sessionList"><div class="no-sessions">Loading...</div></div>
    </div>
    <div class="viewer">
      <div id="logViewer" class="viewer-empty">Select a session to view its log.</div>
    </div>
  </div>
  <script>
    const listEl = document.getElementById('sessionList');
    const viewerEl = document.getElementById('logViewer');
    let activeId = null;

    async function loadSessions() {
      const res = await fetch('/services/log/sessions');
      const { sessions } = await res.json();
      if (!sessions || sessions.length === 0) {
        listEl.innerHTML = '<div class="no-sessions">No sessions yet. Run the pipeline first.</div>';
        return;
      }
      listEl.innerHTML = '';
      for (const s of sessions) {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.dataset.id = s.id;
        const sizeKB = (s.size / 1024).toFixed(1);
        const time = new Date(s.modified).toLocaleString();
        item.innerHTML = '<div class="session-id">' + s.id + '</div>'
          + '<div class="session-meta">' + sizeKB + ' KB &middot; ' + time + '</div>';
        item.addEventListener('click', () => loadLog(s.id, item));
        listEl.appendChild(item);
      }
    }

    async function loadLog(id, el) {
      document.querySelectorAll('.session-item.active').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      activeId = id;
      viewerEl.className = '';
      viewerEl.innerHTML = '<div class="log-content">Loading...</div>';
      const res = await fetch('/services/log/task/capture?sessionId=' + encodeURIComponent(id));
      const text = await res.text();
      viewerEl.innerHTML = '<div class="log-content">' + escapeHtml(text) + '</div>';
    }

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    loadSessions();
  </script>
</body>
</html>`);
});

export default router;
