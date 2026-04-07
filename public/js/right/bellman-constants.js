/**
 * Bellman Breaking Visualization — constants and answer key.
 *
 * All values are hard-coded from the specification so the panel can render
 * without any server round-trip.
 */

/* ------------------------------------------------------------------ */
/*  Answer Key — Layer 1 (serialization boundary)                     */
/* ------------------------------------------------------------------ */

export const ANSWER_KEY = {
  fields: [
    { key: 'date',       name: 'date',       value: '4/5/2026'  },
    { key: 'amount',     name: 'amount',     value: '1000000'   },
    { key: 'location',   name: 'location',   value: 'Singapore' },
    { key: 'instrument', name: 'instrument', value: 'SGX'       },
    { key: 'direction',  name: 'direction',  value: 'buy'       },
    { key: 'order_type', name: 'order_type', value: 'market'    },
    { key: 'account',    name: 'account',    value: 'TRD-4471'  },
  ],
};

/* ------------------------------------------------------------------ */
/*  Layer 2 — risk-agent own assumptions                              */
/* ------------------------------------------------------------------ */

export const LAYER2_FIELDS = [
  {
    key: 'volatility_model',
    name: 'volatility model',
    value: 'GBM',
    omega: 4,
    entropy: 2.00,
    open: true,
    interpretations: [
      'GBM (geometric Brownian)',
      'Heston stochastic vol',
      'SABR',
      'local vol',
    ],
  },
  {
    key: 'correlation',
    name: 'correlation assumption',
    value: '0',
    omega: 3,
    entropy: 1.58,
    open: true,
    interpretations: [
      'zero correlation',
      'historical correlation',
      'implied correlation',
    ],
  },
  {
    key: 'hedging_horizon',
    name: 'hedging horizon',
    value: '1D',
    omega: 3,
    entropy: 1.58,
    open: true,
    interpretations: ['1-day horizon', '1-week horizon', 'to-maturity'],
  },
  {
    key: 'risk_threshold',
    name: 'risk threshold',
    value: '95%',
    omega: 3,
    entropy: 1.58,
    open: true,
    interpretations: ['95% VaR', '99% VaR', '97.5% ES'],
  },
];

export const LAYER2_TOTAL_ENTROPY = 6.74; // sum of Layer 2 own fields

/* ------------------------------------------------------------------ */
/*  Grades                                                            */
/* ------------------------------------------------------------------ */

export const GRADES = {
  A: {
    key: 'A',
    label: 'Asked',
    fullLabel: 'verified',
    color: '#22c55e',
    title: 'Asked (verified)',
  },
  D: {
    key: 'D',
    label: 'Detected',
    fullLabel: 'detected, assumed',
    color: '#f59e0b',
    title: 'Detected, assumed default',
  },
  U: {
    key: 'U',
    label: 'Undetected',
    fullLabel: 'silently assumed',
    color: '#ef4444',
    title: 'Undetected (silently assumed)',
  },
  H: {
    key: 'H',
    label: 'Hallucinated',
    fullLabel: 'fictitious dimension',
    color: '#7c3aed',
    title: 'Hallucinated (no referent in W)',
  },
};

export const COLORS = {
  UNSCORED: '#93c5fd',
  INHERITED: '#d1d5db',
  GRADE_A: '#22c55e',
  GRADE_D: '#f59e0b',
  GRADE_U: '#ef4444',
  GRADE_H: '#7c3aed',
  TAB_ACTIVE: '#3b82f6',
};
