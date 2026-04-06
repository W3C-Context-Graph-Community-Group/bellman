import { Router } from 'express';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const router = Router();

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
