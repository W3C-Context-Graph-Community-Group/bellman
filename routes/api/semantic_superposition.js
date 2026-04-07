import express from 'express';
const router = express.Router();

// ---------------------------------------------------------------------------
// Semantic Superposition API Route
// ---------------------------------------------------------------------------
// Returns the intent map — all possible interpretations for each field in the
// order CSV.  This is the source of truth that drives the Bellman panel's
// semantic-superposition display.
// ---------------------------------------------------------------------------

const SEMANTIC_SUPERPOSITIONS = {
  date:       ['MM/DD → April 5', 'DD/MM → May 4'],
  amount:     ['USD notional', 'SGD notional', 'GBP notional', 'shares', 'lots'],
  location:   ['client location', 'exchange venue', 'broker', 'settlement jurisdiction', 'employee desk'],
  instrument: ['Singapore Exchange (venue)', 'ticker symbol', 'index product'],
  direction:  ['buy'],
  order_type: ['market'],
  account:    ['identifier'],
};

// Layer 0 — raw columns before any interpretation
router.get('/layer0', (_req, res) => {
  res.json({
    data: { columns: Object.keys(SEMANTIC_SUPERPOSITIONS) },
  });
});

// Layer 1 — semantic superpositions (Intent Map)
router.get('/', (_req, res) => {
  res.json({
    data:      { semantic_superpositions: SEMANTIC_SUPERPOSITIONS },
    structure: {},
    meaning:   {},
    context:   {},
  });
});

export default router;
