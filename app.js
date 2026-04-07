import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import llmService from './routes/api/llm_service.js';
import semanticSuperposition from './routes/api/semantic_superposition.js';
import bellmanClassifier from './routes/api/bellman_classifier.js';
import polytopeRoutes from './routes/api/polytope.js';
import reportRoutes from './routes/api/report.js';
import logService from './services/log/index.js';
import secRoutes from './routes/sec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BOOT_ID = Date.now().toString();

// Read failure_modes.json once at startup
const failureModes = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'failure_modes.json'), 'utf-8')
);

// View engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request/Response logging
app.use((req, res, next) => {
  const t0 = Date.now();
  console.log(`[HTTP] → ${req.method} ${req.originalUrl} body=${JSON.stringify(req.body)}`);
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    console.log(`[HTTP] ← ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - t0}ms) body=${JSON.stringify(data).substring(0, 500)}`);
    return originalJson(data);
  };
  const originalSend = res.send.bind(res);
  res.send = (data) => {
    const preview = typeof data === 'string' ? data.substring(0, 200) : '[buffer]';
    console.log(`[HTTP] ← ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - t0}ms) ${preview}`);
    return originalSend(data);
  };
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resizers.html'));
});

// Layer routes — fake URLs so the address bar reflects the current layer
app.get('/layer/:num', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resizers.html'));
});

// Audit report
app.get('/report', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

// SEC filings browser
app.use('/sec', secRoutes);

// API routes
app.use('/api/llm', llmService);
app.use('/api/semantic_superposition', semanticSuperposition);
app.use('/api/bellman', bellmanClassifier);
app.use('/api/polytope', polytopeRoutes);
app.use('/api/report', reportRoutes);
app.use('/services/log', logService);

// Serve polytope-viz built dist at /interpretation-space
app.use('/interpretation-space', express.static(path.join(__dirname, 'polytope-viz', 'dist')));
app.get('/interpretation-space/*path', (_req, res) => {
  res.sendFile(path.join(__dirname, 'polytope-viz', 'dist', 'index.html'));
});

app.get('/api/boot', (_req, res) => {
  res.json({ bootId: BOOT_ID });
});

app.get('/api/failure-modes', (req, res) => {
  res.json(failureModes);
});

app.get('/api/prompt/sec', (req, res) => {
  res.sendFile(path.join(__dirname, 'data', 'prompt-sec.txt'));
});

app.get('/api/docs/null-uncertainty', (req, res) => {
  res.sendFile(path.join(__dirname, 'data', 'docs', 'null_uncertainty_guide.md'));
});

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile({
  type: 'object',
  required: ['decision_trace', 'reasoning_trace'],
  properties: {
    decision_trace: { type: 'object' },
    reasoning_trace: {
      type: 'array',
      items: {
        type: 'object',
        required: ['assumption', 'reasoning', 'judgement_criteria', 'alternatives_considered'],
        properties: {
          assumption: { type: 'string' },
          reasoning: { type: 'string' },
          judgement_criteria: { type: 'string' },
          alternatives_considered: { type: 'string' }
        }
      },
      minItems: 3,
      maxItems: 3
    }
  },
  additionalProperties: false
});

app.post('/api/validate', (req, res) => {
  const valid = validateSchema(req.body);
  res.json({
    valid,
    errors: valid ? null : validateSchema.errors
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
