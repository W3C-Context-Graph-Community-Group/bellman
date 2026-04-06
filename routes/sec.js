import { Router } from 'express';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const router = Router();

const textIndexPath = path.join(DATA_DIR, 'sec_filings_text.jsonl');

// GET /sec/search — API: search filings for RAG tool
router.get('/search', (req, res) => {
  const { ticker, year, q } = req.query;
  console.log(`[SEC] GET /sec/search ticker=${ticker} year=${year} q=${q}`);

  if (!ticker) {
    return res.status(400).json({ error: 'ticker query parameter is required' });
  }

  let lines;
  try {
    lines = readFileSync(textIndexPath, 'utf-8').trim().split('\n');
  } catch (e) {
    return res.status(500).json({ error: 'Could not read filings text index' });
  }

  // Only parse lines matching the ticker to avoid parsing all 560
  const tickerLower = ticker.toLowerCase();
  let matches = [];
  for (const line of lines) {
    if (!line.includes(`"ticker":"${tickerLower}"`)) continue;
    const f = JSON.parse(line);
    if (f.filing_type === '10-K') matches.push(f);
  }

  if (year) {
    matches = matches.filter(f => f.period.startsWith(year));
  }

  if (matches.length === 0) {
    return res.json({ results: [], message: `No filings found for ticker "${ticker}"${year ? ` in year ${year}` : ''}` });
  }

  // Limit to first 2 filings to keep token budget reasonable
  matches = matches.slice(0, 2);

  const results = [];
  const MAX_TEXT_LENGTH = 15000;

  for (const filing of matches) {
    let text = filing.text;

    // If a search query is provided, find relevant sections
    if (q) {
      const queryTerms = q.toLowerCase().split(/\s+/);
      const sentences = text.split(/(?<=[.!?])\s+/);
      const scored = sentences.map((s, i) => {
        const lower = s.toLowerCase();
        const score = queryTerms.reduce((sum, t) => sum + (lower.includes(t) ? 1 : 0), 0);
        return { s, i, score };
      });

      const relevant = scored
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

      if (relevant.length > 0) {
        const contextSentences = new Set();
        for (const r of relevant) {
          for (let j = Math.max(0, r.i - 2); j <= Math.min(sentences.length - 1, r.i + 2); j++) {
            contextSentences.add(j);
          }
        }
        const sortedIdxs = [...contextSentences].sort((a, b) => a - b);
        text = sortedIdxs.map(i => sentences[i]).join(' ');
      }
    }

    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '... [truncated]';
    }

    results.push({
      ticker: filing.ticker,
      company: filing.company,
      period: filing.period,
      filing_date: filing.filing_date,
      accession: filing.accession,
      text
    });
  }

  console.log(`[SEC] Returning ${results.length} results`);
  res.json({ results });
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
