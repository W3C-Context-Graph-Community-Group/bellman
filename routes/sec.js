import { Router } from 'express';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import MiniSearch from 'minisearch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const router = Router();

const textIndexPath = path.join(DATA_DIR, 'sec_filings_text.jsonl');

// ---------------------------------------------------------------------------
// Build MiniSearch index at startup: chunk each filing into ~500-word paragraphs
// ---------------------------------------------------------------------------
const chunks = [];    // id → { id, ticker, company, period, filing_date, filing_type, accession, text }
const miniSearch = new MiniSearch({
  fields: ['text'],                       // searchable field
  storeFields: ['ticker', 'company', 'period', 'filing_date', 'filing_type', 'accession', 'text'],
  searchOptions: {
    boost: { text: 1 },
    fuzzy: 0.2,
    prefix: true,
  },
});

console.log('[SEC] Building search index...');
const lines = readFileSync(textIndexPath, 'utf-8').trim().split('\n');
let chunkId = 0;
for (const line of lines) {
  const filing = JSON.parse(line);
  // Split on double-newlines (paragraph boundaries) or fall back to ~500 word windows
  const paragraphs = filing.text.split(/\n{2,}/);
  let buf = '';
  for (const para of paragraphs) {
    buf += (buf ? '\n\n' : '') + para;
    if (buf.split(/\s+/).length >= 300) {
      chunks.push({
        id: chunkId++,
        ticker: filing.ticker,
        company: filing.company,
        period: filing.period,
        filing_date: filing.filing_date,
        filing_type: filing.filing_type,
        accession: filing.accession,
        text: buf,
      });
      buf = '';
    }
  }
  if (buf.trim()) {
    chunks.push({
      id: chunkId++,
      ticker: filing.ticker,
      company: filing.company,
      period: filing.period,
      filing_date: filing.filing_date,
      filing_type: filing.filing_type,
      accession: filing.accession,
      text: buf,
    });
  }
}
miniSearch.addAll(chunks);
console.log(`[SEC] Indexed ${chunks.length} chunks from ${lines.length} filings`);

// ---------------------------------------------------------------------------
// GET /sec/search — Full-text search API (MiniSearch powered)
// ---------------------------------------------------------------------------
router.get('/search', (req, res) => {
  const { ticker, year, q, filing_type, limit } = req.query;
  console.log(`[SEC] GET /sec/search ticker=${ticker} year=${year} q=${q} filing_type=${filing_type}`);

  const maxResults = Math.min(parseInt(limit) || 20, 50);

  // If no query, fall back to listing chunks filtered by ticker/year
  if (!q) {
    let filtered = chunks;
    if (ticker) filtered = filtered.filter(c => c.ticker === ticker.toLowerCase());
    if (year) filtered = filtered.filter(c => c.period.startsWith(year));
    if (filing_type) filtered = filtered.filter(c => c.filing_type === filing_type);
    const results = filtered.slice(0, maxResults).map(c => ({
      ticker: c.ticker, company: c.company, period: c.period,
      filing_date: c.filing_date, filing_type: c.filing_type,
      accession: c.accession, text: c.text.substring(0, 2000),
    }));
    return res.json({ results, total: filtered.length });
  }

  // Build MiniSearch filter from optional params
  const filter = (result) => {
    if (ticker && result.ticker !== ticker.toLowerCase()) return false;
    if (year && !result.period.startsWith(year)) return false;
    if (filing_type && result.filing_type !== filing_type) return false;
    return true;
  };

  const hits = miniSearch.search(q, { filter });
  const results = hits.slice(0, maxResults).map(hit => ({
    score: hit.score,
    ticker: hit.ticker,
    company: hit.company,
    period: hit.period,
    filing_date: hit.filing_date,
    filing_type: hit.filing_type,
    accession: hit.accession,
    text: hit.text.substring(0, 2000),
  }));

  console.log(`[SEC] Query "${q}" → ${hits.length} hits, returning ${results.length}`);
  res.json({ results, total: hits.length });
});

// GET /sec — Filing list
router.get('/', (req, res) => {
  const filingsPath = path.join(DATA_DIR, 'test', 'sec', 'filings.jsonl');
  const lines = readFileSync(filingsPath, 'utf-8').trim().split('\n');
  const filings = lines.map(line => JSON.parse(line));
  res.render('sec/index', { title: 'SEC Filings', filings });
});

// GET /sec/filing/:ticker/:type/:accession — Filing text viewer
router.get('/filing/:ticker/:type/:accession', (req, res) => {
  const { ticker, type, accession } = req.params;
  const tarPath = path.join(DATA_DIR, 'sec_filings', ticker, type, `${accession}.tar`);

  // Read metadata.json from the tar
  const metaRaw = execSync(`tar xf ${JSON.stringify(tarPath)} -O metadata.json`, {
    encoding: 'utf-8',
  });
  const metadata = JSON.parse(metaRaw);

  // Find the primary document (sequence "1")
  const primaryDoc = metadata.documents.find(d => d.sequence === '1');
  const filename = primaryDoc.filename;

  // Extract the HTML file and rewrite relative asset URLs
  const html = execSync(`tar xf ${JSON.stringify(tarPath)} -O ${JSON.stringify(filename)}`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  const assetBase = `/sec/asset/${ticker}/${type}/${accession}/`;
  const rewritten = html.replace(/src="(?!https?:\/\/)([^"]+)"/g, `src="${assetBase}$1"`);

  res.type('html').send(rewritten);
});

// GET /sec/asset/:ticker/:type/:accession/:filename — Serve assets from tar
router.get('/asset/:ticker/:type/:accession/:filename', (req, res) => {
  const { ticker, type, accession, filename } = req.params;
  const tarPath = path.join(DATA_DIR, 'sec_filings', ticker, type, `${accession}.tar`);

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  try {
    const buf = execSync(`tar xf ${JSON.stringify(tarPath)} -O ${JSON.stringify(filename)}`, {
      maxBuffer: 10 * 1024 * 1024,
    });
    res.type(mimeTypes[ext] || 'application/octet-stream').send(buf);
  } catch {
    res.status(404).send('Asset not found');
  }
});

export default router;
