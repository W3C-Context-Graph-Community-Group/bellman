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

router.get('/', (_req, res) => {
  res.json({ semantic_superpositions: SEMANTIC_SUPERPOSITIONS });
});

export default router;
