export type Grade = 'A' | 'D' | 'U' | 'H' | null;

export interface FieldState {
  id: string;
  name: string;
  value: string;
  omega: string[];
  omegaSize: number;
  resolvedTo: string | null;
  aduhScore: Grade;
  collapsedAtStep: number | null;
  entropy: number;
  isAmbiguous: boolean;
  layer: 1 | 2;
}

export interface SerializationEvent {
  id: string;
  step: number;
  fieldId: string | null;
  layer: 1 | 2;
  description: string;
  beforeOmega: number;
  afterOmega: number;
  resolvedValue: string | null;
  entropyReduction: number;
  aduhScore: Grade;
}

export interface Vertex {
  id: number;
  coords: number[];
  position3D: [number, number, number];
  targetPosition3D: [number, number, number];
  status: 'alive' | 'eliminating' | 'eliminated' | 'ghost';
  color: string;
  eliminatedBy: string | null;
  isGhost: boolean;
  scale: number;
  opacity: number;
  gridRow: number;
  gridCol: number;
  label: string;
}

export type ViewMode = 'god' | 'layer2';

export interface PolytopeState {
  vertices: Vertex[];
  currentStep: number;
  totalSteps: number;
  fields: FieldState[];
  viewMode: ViewMode;
  isPlaying: boolean;
  hTotal: number;
  omegaTotal: number;
  ghostCount: number;
  selectedVertexId: number | null;
  selectedFieldId: string | null;
  playSpeed: number;
  newlyEliminatedIds: number[];
  isEntryComplete: boolean;
}

export const ADUH_COLORS: Record<string, string> = {
  A: '#3b82f6',
  D: '#f59e0b',
  U: '#ef4444',
  H: '#7c3aed',
};

export const GRADE_LABELS: Record<string, string> = {
  A: 'Asked (verified)',
  D: 'Detected (assumed)',
  U: 'Undetected (silent)',
  H: 'Hallucinated',
};

export const ALIVE_COLOR = '#22c55e';
export const GHOST_COLOR = '#7c3aed';
