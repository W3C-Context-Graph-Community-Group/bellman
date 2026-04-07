import type { FieldState } from '../types';

export const LAYER1_FIELDS: FieldState[] = [
  {
    id: 'date',
    name: 'date',
    value: '4/5/2026',
    omega: ['MM/DD → April 5', 'DD/MM → May 4'],
    omegaSize: 2,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: Math.log2(2),
    isAmbiguous: true,
    layer: 1,
  },
  {
    id: 'amount',
    name: 'amount',
    value: '1000000',
    omega: ['USD notional', 'SGD notional', 'GBP notional', 'shares', 'lots'],
    omegaSize: 5,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: Math.log2(5),
    isAmbiguous: true,
    layer: 1,
  },
  {
    id: 'location',
    name: 'location',
    value: 'Singapore',
    omega: [
      'client location',
      'exchange venue',
      'broker',
      'settlement jurisdiction',
      'employee desk',
    ],
    omegaSize: 5,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: Math.log2(5),
    isAmbiguous: true,
    layer: 1,
  },
  {
    id: 'instrument',
    name: 'instrument',
    value: 'SGX',
    omega: ['Singapore Exchange (venue)', 'ticker symbol', 'index product'],
    omegaSize: 3,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: Math.log2(3),
    isAmbiguous: true,
    layer: 1,
  },
];

export const LAYER2_FIELDS: FieldState[] = [
  {
    id: 'volatility_model',
    name: 'volatility model',
    value: 'GBM',
    omega: ['GBM (geometric Brownian)', 'Heston stochastic vol', 'SABR', 'local vol'],
    omegaSize: 4,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: 2.0,
    isAmbiguous: true,
    layer: 2,
  },
  {
    id: 'correlation',
    name: 'correlation assumption',
    value: '0',
    omega: ['zero correlation', 'historical correlation', 'implied correlation'],
    omegaSize: 3,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: 1.58,
    isAmbiguous: true,
    layer: 2,
  },
  {
    id: 'hedging_horizon',
    name: 'hedging horizon',
    value: '1D',
    omega: ['1-day horizon', '1-week horizon', 'to-maturity'],
    omegaSize: 3,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: 1.58,
    isAmbiguous: true,
    layer: 2,
  },
  {
    id: 'risk_threshold',
    name: 'risk threshold',
    value: '95%',
    omega: ['95% VaR', '99% VaR', '97.5% ES'],
    omegaSize: 3,
    resolvedTo: null,
    aduhScore: null,
    collapsedAtStep: null,
    entropy: 1.58,
    isAmbiguous: true,
    layer: 2,
  },
];

export const ALL_FIELDS = [...LAYER1_FIELDS, ...LAYER2_FIELDS];

export const AXIS_NAMES = ['date', 'amount', 'location', 'instrument'];
export const AXIS_SIZES = [2, 5, 5, 3]; // product = 150

export const LAYER2_AXIS_NAMES = ['volatility_model', 'correlation', 'hedging_horizon', 'risk_threshold'];
export const LAYER2_AXIS_SIZES = [4, 3, 3, 3]; // product = 108

// Layer 1 grid headers: rows = location(5) × instrument(3) = 15, cols = date(2) × amount(5) = 10
export const L1_ROW_HEADERS = LAYER1_FIELDS[2].omega.flatMap((loc) =>
  LAYER1_FIELDS[3].omega.map((inst) => ({ location: loc, instrument: inst }))
);

export const L1_COL_HEADERS = LAYER1_FIELDS[0].omega.flatMap((date) =>
  LAYER1_FIELDS[1].omega.map((amt) => ({ date, amount: amt }))
);

// Layer 2 grid headers: rows = correlation(3) × risk_threshold(3) = 9, cols = volatility(4) × hedging(3) = 12
export const L2_ROW_HEADERS = LAYER2_FIELDS[1].omega.flatMap((corr) =>
  LAYER2_FIELDS[3].omega.map((risk) => ({ correlation: corr, risk_threshold: risk }))
);

export const L2_COL_HEADERS = LAYER2_FIELDS[0].omega.flatMap((vol) =>
  LAYER2_FIELDS[2].omega.map((hedge) => ({ volatility: vol, hedging: hedge }))
);
