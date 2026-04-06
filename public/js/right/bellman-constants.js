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
    {
      key: 'date',
      name: 'date',
      value: '4/5/2026',
      omega: 2,
      entropy: 1.00,
      open: true,
      interpretations: ['MM/DD \u2192 April 5', 'DD/MM \u2192 May 4'],
    },
    {
      key: 'amount',
      name: 'amount',
      value: '1000000',
      omega: 5,
      entropy: 2.32,
      open: true,
      interpretations: [
        'USD notional',
        'SGD notional',
        'GBP notional',
        'shares',
        'lots',
      ],
    },
    {
      key: 'location',
      name: 'location',
      value: 'Singapore',
      omega: 5,
      entropy: 2.32,
      open: true,
      interpretations: [
        'client location',
        'exchange venue',
        'broker',
        'settlement jurisdiction',
        'employee desk',
      ],
    },
    {
      key: 'instrument',
      name: 'instrument',
      value: 'SGX',
      omega: 3,
      entropy: 1.58,
      open: true,
      interpretations: [
        'Singapore Exchange (venue)',
        'ticker symbol',
        'index product',
      ],
    },
    {
      key: 'direction',
      name: 'direction',
      value: 'buy',
      omega: 1,
      entropy: 0,
      open: false,
      interpretations: ['buy'],
    },
    {
      key: 'order_type',
      name: 'order_type',
      value: 'market',
      omega: 1,
      entropy: 0,
      open: false,
      interpretations: ['market'],
    },
    {
      key: 'account',
      name: 'account',
      value: 'TRD-4471',
      omega: 1,
      entropy: 0,
      open: false,
      interpretations: ['opaque identifier'],
    },
  ],
  totalEntropy: 7.22,
  totalConfigurations: 150,
  nullConfigurations: 149,
  minimumRotations: 4,
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
  S: {
    key: 'S',
    label: 'Surfaced',
    fullLabel: 'surfaced, assumed',
    color: '#f59e0b',
    title: 'Surfaced, assumed',
  },
  N: {
    key: 'N',
    label: 'Null',
    fullLabel: 'assumed',
    color: '#ef4444',
    title: 'Null (silently assumed)',
  },
};

export const COLORS = {
  UNSCORED: '#93c5fd',
  INHERITED: '#d1d5db',
  GRADE_A: '#22c55e',
  GRADE_S: '#f59e0b',
  GRADE_N: '#ef4444',
  TAB_ACTIVE: '#3b82f6',
};
