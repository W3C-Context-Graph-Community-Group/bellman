#!/usr/bin/env node
/**
 * Pre-extract plain text from SEC filing tars into a single .jsonl file.
 *
 * Usage: node scripts/extract-sec-text.js
 *
 * Reads:  data/test/sec/filings.jsonl   (metadata index)
 *         data/sec_filings/<ticker>/<type>/<accession>.tar
 *
 * Writes: data/sec_filings_text.jsonl
 *         One JSON line per filing with { ticker, company, period, filing_date,
 *         filing_type, accession, text }
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const filingsPath = path.join(DATA_DIR, 'test', 'sec', 'filings.jsonl');
const outPath = path.join(DATA_DIR, 'sec_filings_text.jsonl');

const lines = readFileSync(filingsPath, 'utf-8').trim().split('\n');
const filings = lines.map(l => JSON.parse(l));

let written = 0;
let skipped = 0;
let errors = 0;
const output = [];

for (const f of filings) {
  const accessionClean = f.accession_number.replace(/-/g, '');
  const tarPath = path.join(DATA_DIR, 'sec_filings', f.ticker, f.filing_type, `${accessionClean}.tar`);

  if (!existsSync(tarPath)) {
    skipped++;
    continue;
  }

  // Read metadata.json from tar to find primary document
  let metaRaw;
  try {
    metaRaw = execSync(`tar xf ${JSON.stringify(tarPath)} -O metadata.json`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
  } catch (e) {
    console.error(`SKIP (no metadata): ${f.ticker} ${f.filing_type} ${f.accession_number}`);
    errors++;
    continue;
  }

  let metadata;
  try {
    metadata = JSON.parse(metaRaw);
  } catch {
    console.error(`SKIP (bad metadata JSON): ${f.ticker} ${f.accession_number}`);
    errors++;
    continue;
  }

  const primaryDoc = metadata.documents?.find(d => d.sequence === '1');
  if (!primaryDoc) {
    console.error(`SKIP (no primary doc): ${f.ticker} ${f.accession_number}`);
    errors++;
    continue;
  }

  // Extract primary HTML
  let html;
  try {
    html = execSync(
      `tar xf ${JSON.stringify(tarPath)} -O ${JSON.stringify(primaryDoc.filename)}`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 30000 }
    );
  } catch (e) {
    console.error(`SKIP (extract failed): ${f.ticker} ${f.accession_number} — ${e.message?.slice(0, 80)}`);
    errors++;
    continue;
  }

  // Strip HTML → plain text
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const record = {
    ticker: f.ticker,
    company: f.company_name,
    period: f.period,
    filing_date: f.filing_date,
    filing_type: f.filing_type,
    accession: f.accession_number,
    text_length: text.length,
    text,
  };

  output.push(JSON.stringify(record));
  written++;

  if (written % 20 === 0) {
    console.log(`Extracted ${written} filings...`);
  }
}

writeFileSync(outPath, output.join('\n') + '\n', 'utf-8');

console.log(`\nDone.`);
console.log(`  Written: ${written}`);
console.log(`  Skipped (no tar): ${skipped}`);
console.log(`  Errors: ${errors}`);
console.log(`  Output: ${outPath}`);
