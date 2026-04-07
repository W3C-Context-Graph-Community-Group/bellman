import { create } from 'zustand';
import type { Vertex, FieldState, ViewMode, Grade } from '../types';
import { ALIVE_COLOR } from '../types';
import { LAYER1_FIELDS, LAYER2_FIELDS, AXIS_SIZES, LAYER2_AXIS_SIZES } from '../data/seed';
import { SERIALIZATION_EVENTS } from '../data/events';
import { generate4DLattice, generateEdges } from '../engine/lattice';
import { collapseAxis, finalizeElimination, addGhostVertices } from '../engine/collapse';
import { computeTotalEntropy, computeOmegaTotal, countRotations } from '../engine/entropy';
import { project4Dto3D } from '../engine/projection';

interface PolytopeStore {
  vertices: Vertex[];
  edges: [number, number][];
  currentStep: number;
  totalSteps: number;
  fields: FieldState[];
  viewMode: ViewMode;
  isPlaying: boolean;
  hTotal: number;
  omegaTotal: number;
  rotations: number;
  ghostCount: number;
  selectedVertexId: number | null;
  selectedFieldId: string | null;
  showEventModal: boolean;
  activeLayer: 1 | 2;

  // Actions
  initialize: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStep: (step: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  selectVertex: (id: number | null) => void;
  selectField: (id: string | null) => void;
  setShowEventModal: (show: boolean) => void;
  setFieldScore: (fieldId: string, score: Grade) => void;
}

function buildStateAtStep(step: number): {
  vertices: Vertex[];
  edges: [number, number][];
  fields: FieldState[];
  activeLayer: 1 | 2;
} {
  const events = SERIALIZATION_EVENTS;

  if (step <= 5) {
    // Layer 1 territory
    let vertices = generate4DLattice(AXIS_SIZES);
    let edges = generateEdges(vertices);
    const fields = LAYER1_FIELDS.map((f) => ({ ...f }));
    const collapsedAxes = new Set<number>();
    const axisFieldMap = ['date', 'amount', 'location', 'instrument'];

    for (let s = 1; s <= Math.min(step, 4); s++) {
      const evt = events[s];
      if (!evt.fieldId) continue;
      const axisIndex = axisFieldMap.indexOf(evt.fieldId);
      if (axisIndex === -1) continue;

      const field = fields.find((f) => f.id === evt.fieldId);
      if (field) {
        field.resolvedTo = evt.resolvedValue;
        field.aduhScore = evt.aduhScore;
        field.collapsedAtStep = s;
      }

      collapsedAxes.add(axisIndex);
      vertices = collapseAxis(vertices, axisIndex, 0, AXIS_SIZES, collapsedAxes, evt.aduhScore);
      vertices = finalizeElimination(vertices);
    }

    // Filter edges for alive vertices only
    const aliveIds = new Set(vertices.filter((v) => v.status === 'alive').map((v) => v.id));
    edges = edges.filter(([a, b]) => aliveIds.has(a) && aliveIds.has(b));

    return { vertices, edges, fields, activeLayer: 1 };
  }

  // Step 6+: Layer 2
  if (step === 6) {
    // Layer 2 receives — build Layer 2 polytope (108 vertices)
    const l2Vertices = generate4DLattice(LAYER2_AXIS_SIZES);
    const l2Edges = generateEdges(l2Vertices);
    const fields = [
      ...LAYER1_FIELDS.map((f) => ({
        ...f,
        resolvedTo: SERIALIZATION_EVENTS.find((e) => e.fieldId === f.id)?.resolvedValue ?? null,
        aduhScore: SERIALIZATION_EVENTS.find((e) => e.fieldId === f.id)?.aduhScore ?? null,
        collapsedAtStep: SERIALIZATION_EVENTS.find((e) => e.fieldId === f.id)?.step ?? null,
      })),
      ...LAYER2_FIELDS.map((f) => ({ ...f })),
    ];
    return { vertices: l2Vertices, edges: l2Edges, fields, activeLayer: 2 };
  }

  // Steps 7-11: Layer 2 collapses
  let vertices = generate4DLattice(LAYER2_AXIS_SIZES);
  let edges = generateEdges(vertices);
  const l2AxisMap = ['volatility_model', 'correlation', 'hedging_horizon', 'risk_threshold'];
  const collapsedAxes = new Set<number>();

  const fields = [
    ...LAYER1_FIELDS.map((f) => ({
      ...f,
      resolvedTo: SERIALIZATION_EVENTS.find((e) => e.fieldId === f.id)?.resolvedValue ?? null,
      aduhScore: SERIALIZATION_EVENTS.find((e) => e.fieldId === f.id)?.aduhScore ?? null,
      collapsedAtStep: SERIALIZATION_EVENTS.find((e) => e.fieldId === f.id)?.step ?? null,
    })),
    ...LAYER2_FIELDS.map((f) => ({ ...f })),
  ];

  for (let s = 7; s <= Math.min(step, 10); s++) {
    const evt = events[s];
    if (!evt.fieldId) continue;
    const axisIndex = l2AxisMap.indexOf(evt.fieldId);
    if (axisIndex === -1) continue;

    const field = fields.find((f) => f.id === evt.fieldId);
    if (field) {
      field.resolvedTo = evt.resolvedValue;
      field.aduhScore = evt.aduhScore;
      field.collapsedAtStep = s;
    }

    collapsedAxes.add(axisIndex);
    vertices = collapseAxis(vertices, axisIndex, 0, LAYER2_AXIS_SIZES, collapsedAxes, evt.aduhScore);
    vertices = finalizeElimination(vertices);
  }

  const aliveIds = new Set(vertices.filter((v) => v.status === 'alive').map((v) => v.id));
  edges = edges.filter(([a, b]) => aliveIds.has(a) && aliveIds.has(b));

  return { vertices, edges, fields, activeLayer: 2 };
}

export const usePolytopeStore = create<PolytopeStore>((set, get) => ({
  vertices: [],
  edges: [],
  currentStep: 0,
  totalSteps: SERIALIZATION_EVENTS.length - 1,
  fields: LAYER1_FIELDS.map((f) => ({ ...f })),
  viewMode: 'god',
  isPlaying: false,
  hTotal: 0,
  omegaTotal: 150,
  rotations: 4,
  ghostCount: 0,
  selectedVertexId: null,
  selectedFieldId: null,
  showEventModal: false,
  activeLayer: 1,

  initialize: () => {
    const state = buildStateAtStep(0);
    const unresolvedFields = state.fields.filter((f) => f.resolvedTo === null);
    set({
      ...state,
      currentStep: 0,
      hTotal: computeTotalEntropy(unresolvedFields),
      omegaTotal: computeOmegaTotal(unresolvedFields),
      rotations: countRotations(state.fields),
    });
  },

  stepForward: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep >= totalSteps) return;
    get().goToStep(currentStep + 1);
  },

  stepBackward: () => {
    const { currentStep } = get();
    if (currentStep <= 0) return;
    get().goToStep(currentStep - 1);
  },

  goToStep: (step: number) => {
    const clamped = Math.max(0, Math.min(step, SERIALIZATION_EVENTS.length - 1));
    const state = buildStateAtStep(clamped);
    const activeFields = state.activeLayer === 1
      ? state.fields.filter((f) => f.layer === 1)
      : state.fields;
    set({
      ...state,
      currentStep: clamped,
      hTotal: computeTotalEntropy(activeFields.filter((f) => f.resolvedTo === null)),
      omegaTotal: computeOmegaTotal(activeFields.filter((f) => f.resolvedTo === null)),
      rotations: countRotations(activeFields),
    });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),

  setViewMode: (mode) => {
    set({ viewMode: mode });
    // Rebuild to reflect view mode
    const { currentStep } = get();
    get().goToStep(currentStep);
  },

  selectVertex: (id) => set({ selectedVertexId: id }),
  selectField: (id) => set({ selectedFieldId: id }),
  setShowEventModal: (show) => set({ showEventModal: show }),

  setFieldScore: (fieldId, score) => {
    const { fields, currentStep } = get();
    const updated = fields.map((f) =>
      f.id === fieldId ? { ...f, aduhScore: score } : f,
    );
    set({ fields: updated });

    // If H: add ghost vertices
    if (score === 'H') {
      const { vertices } = get();
      const ghosts = addGhostVertices(vertices, 5, vertices.length + 1000);
      set((s) => ({
        vertices: [...s.vertices, ...ghosts],
        ghostCount: s.ghostCount + ghosts.length,
      }));
    }
  },
}));
