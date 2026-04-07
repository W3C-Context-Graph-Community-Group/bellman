import express from 'express';
const router = express.Router();

// ---------------------------------------------------------------------------
// Polytope Visualization API Routes
// ---------------------------------------------------------------------------

const SEMANTIC_SUPERPOSITIONS = {
  date:       ['MM/DD → April 5', 'DD/MM → May 4'],
  amount:     ['USD notional', 'SGD notional', 'GBP notional', 'shares', 'lots'],
  location:   ['client location', 'exchange venue', 'broker', 'settlement jurisdiction', 'employee desk'],
  instrument: ['Singapore Exchange (venue)', 'ticker symbol', 'index product'],
};

const LAYER2_FIELDS = {
  volatility_model: ['GBM (geometric Brownian)', 'Heston stochastic vol', 'SABR', 'local vol'],
  correlation:      ['zero correlation', 'historical correlation', 'implied correlation'],
  hedging_horizon:  ['1-day horizon', '1-week horizon', 'to-maturity'],
  risk_threshold:   ['95% VaR', '99% VaR', '97.5% ES'],
};

const ANSWER_KEY = {
  date: '4/5/2026',
  amount: '1000000',
  location: 'Singapore',
  instrument: 'SGX',
};

// GET /api/polytope/state — all fields with omega arrays and entropy
router.get('/state', (_req, res) => {
  const fields = [];

  for (const [key, omega] of Object.entries(SEMANTIC_SUPERPOSITIONS)) {
    fields.push({
      id: key,
      name: key,
      value: ANSWER_KEY[key] || null,
      layer: 1,
      omega,
      omegaSize: omega.length,
      entropy: Math.log2(omega.length),
      isAmbiguous: omega.length > 1,
    });
  }

  for (const [key, omega] of Object.entries(LAYER2_FIELDS)) {
    fields.push({
      id: key,
      name: key.replace(/_/g, ' '),
      layer: 2,
      omega,
      omegaSize: omega.length,
      entropy: Math.log2(omega.length),
      isAmbiguous: omega.length > 1,
    });
  }

  res.json({ fields });
});

// GET /api/polytope/events — ordered serialization event timeline
router.get('/events', (_req, res) => {
  const events = [
    { id: 'evt-0', step: 0, fieldId: null, layer: 1, description: 'CSV arrives — 150 possible world states', beforeOmega: 150, afterOmega: 150, resolvedValue: null, entropyReduction: 0 },
    { id: 'evt-1', step: 1, fieldId: 'date', layer: 1, description: 'Date field collapses: MM/DD → April 5', beforeOmega: 150, afterOmega: 75, resolvedValue: 'MM/DD → April 5', entropyReduction: 1.0 },
    { id: 'evt-2', step: 2, fieldId: 'amount', layer: 1, description: 'Amount field collapses: USD notional', beforeOmega: 75, afterOmega: 15, resolvedValue: 'USD notional', entropyReduction: 2.32 },
    { id: 'evt-3', step: 3, fieldId: 'location', layer: 1, description: 'Location field collapses: exchange venue', beforeOmega: 15, afterOmega: 3, resolvedValue: 'exchange venue', entropyReduction: 2.32 },
    { id: 'evt-4', step: 4, fieldId: 'instrument', layer: 1, description: 'Instrument field collapses: Singapore Exchange', beforeOmega: 3, afterOmega: 1, resolvedValue: 'Singapore Exchange (venue)', entropyReduction: 1.58 },
    { id: 'evt-5', step: 5, fieldId: null, layer: 1, description: 'JSON output — single resolved state', beforeOmega: 1, afterOmega: 1, resolvedValue: null, entropyReduction: 0 },
    { id: 'evt-6', step: 6, fieldId: null, layer: 2, description: 'Layer 2 receives — risk agent adds own dimensions (×108)', beforeOmega: 1, afterOmega: 108, resolvedValue: null, entropyReduction: -6.74 },
    { id: 'evt-7', step: 7, fieldId: 'volatility_model', layer: 2, description: 'Volatility model collapses: GBM', beforeOmega: 108, afterOmega: 27, resolvedValue: 'GBM (geometric Brownian)', entropyReduction: 2.0 },
    { id: 'evt-8', step: 8, fieldId: 'correlation', layer: 2, description: 'Correlation collapses: zero correlation', beforeOmega: 27, afterOmega: 9, resolvedValue: 'zero correlation', entropyReduction: 1.58 },
    { id: 'evt-9', step: 9, fieldId: 'hedging_horizon', layer: 2, description: 'Hedging horizon collapses: 1-day', beforeOmega: 9, afterOmega: 3, resolvedValue: '1-day horizon', entropyReduction: 1.58 },
    { id: 'evt-10', step: 10, fieldId: 'risk_threshold', layer: 2, description: 'Risk threshold collapses: 95% VaR', beforeOmega: 3, afterOmega: 1, resolvedValue: '95% VaR', entropyReduction: 1.58 },
    { id: 'evt-11', step: 11, fieldId: null, layer: 2, description: 'Final state — fully resolved', beforeOmega: 1, afterOmega: 1, resolvedValue: null, entropyReduction: 0 },
  ];

  res.json({ events });
});

export default router;
