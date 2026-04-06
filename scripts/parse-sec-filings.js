#!/usr/bin/env node

/**
 * Parses SEC filing tar archives from data/sec_filings/
 * and outputs a JSONL file to data/test/sec/filings.jsonl
 *
 * Usage: node scripts/parse-sec-filings.js
 */

import { execSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, 'data', 'sec_filings');
const OUT_DIR = join(ROOT, 'data', 'test', 'sec');
const OUT_FILE = join(OUT_DIR, 'filings.jsonl');

function extractMetadata(tarPath) {
  try {
    const raw = execSync(`tar xf "${tarPath}" -O metadata.json`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseRecord(ticker, filingType, meta) {
  const filer = meta.filer || {};
  const company = filer['company-data'] || {};
  const filingVals = filer['filing-values'] || {};
  const bizAddr = filer['business-address'] || {};

  const docs = meta.documents || [];
  const primaryDoc = docs.find(d => d.sequence === '1') || docs[0] || {};

  return {
    ticker,
    company_name: company['conformed-name'] || null,
    cik: company.cik || null,
    sic: company['assigned-sic'] || null,
    state_of_incorporation: company['state-of-incorporation'] || null,
    fiscal_year_end: company['fiscal-year-end'] || null,
    filing_type: filingType,
    form_type: filingVals['form-type'] || meta.type || null,
    accession_number: meta['accession-number'] || null,
    period: meta.period || null,
    filing_date: meta['filing-date'] || null,
    acceptance_datetime: meta['acceptance-datetime'] || null,
    file_number: filingVals['file-number'] || null,
    primary_document: primaryDoc.filename || null,
    document_count: parseInt(meta['public-document-count'], 10) || null,
    business_address: {
      street: bizAddr.street1 || null,
      city: bizAddr.city || null,
      state: bizAddr.state || null,
      zip: bizAddr.zip || null,
      phone: bizAddr.phone || null,
    },
  };
}

function discoverTarFiles() {
  const files = [];
  const tickers = readdirSync(SRC_DIR).filter(d => {
    try { return statSync(join(SRC_DIR, d)).isDirectory(); } catch { return false; }
  });

  for (const ticker of tickers) {
    const tickerDir = join(SRC_DIR, ticker);
    const filingTypes = readdirSync(tickerDir).filter(d => {
      try { return statSync(join(tickerDir, d)).isDirectory(); } catch { return false; }
    });

    for (const filingType of filingTypes) {
      const typeDir = join(tickerDir, filingType);
      const tars = readdirSync(typeDir).filter(f => f.endsWith('.tar'));
      for (const tar of tars) {
        files.push({ ticker, filingType, path: join(typeDir, tar) });
      }
    }
  }

  return files;
}

function main() {
  const tarFiles = discoverTarFiles();
  console.log(`Found ${tarFiles.length} filing archives`);

  mkdirSync(OUT_DIR, { recursive: true });

  const lines = [];
  let errors = 0;

  for (const { ticker, filingType, path } of tarFiles) {
    const meta = extractMetadata(path);
    if (!meta) {
      console.error(`  SKIP: failed to extract metadata from ${path}`);
      errors++;
      continue;
    }
    const record = parseRecord(ticker, filingType, meta);
    lines.push(JSON.stringify(record));
  }

  lines.sort((a, b) => {
    const ra = JSON.parse(a);
    const rb = JSON.parse(b);
    return (
      ra.ticker.localeCompare(rb.ticker) ||
      ra.filing_type.localeCompare(rb.filing_type) ||
      (ra.period || '').localeCompare(rb.period || '')
    );
  });

  writeFileSync(OUT_FILE, lines.join('\n') + '\n');
  console.log(`Wrote ${lines.length} records to ${OUT_FILE}`);
  if (errors) console.log(`${errors} files skipped due to errors`);
}

main();
