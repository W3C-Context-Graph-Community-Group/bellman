import eventBus from '../events/EventBus.js';
import { modalManager } from '../ModalManager.js';
import {
  ANSWER_KEY,
  LAYER2_FIELDS,
  GRADES,
} from './bellman-constants.js';
import { ContextManager } from './facets/ContextManager.js';

export class BellmanPanel {
  constructor(panel) {
    this.panel = panel;
    // Read initial layer from URL (/layer/0, /layer/1, /layer/2)
    const urlMatch = window.location.pathname.match(/\/layer\/(\d+)/);
    this.activeLayer = urlMatch ? Number(urlMatch[1]) : 0;
    this.scores = new Map();       // Layer 1: fieldKey → 'A'|'D'|'U'|'H'|null
    this.layer2Scores = new Map(); // Layer 2: fieldKey → 'A'|'D'|'U'|'H'|null
    this.fields = [];              // enriched from API
    this.totalEntropy = 0;
    this.minimumRotations = 0;
    this.failureModes = null;
    this.layer2HasResponse = false;
    this.layer2DynamicFields = null;
    this.recommendations = new Map(); // fieldKey → 'A'|'D'|'U'|'H' from classifier
    this.facetData = { data: {}, structure: {}, meaning: {}, context: {} };
    this.contextManager = new ContextManager();

    this._buildDOM();
    this._subscribe();
    this._fetchAndInit();
  }

  async _fetchAndInit() {
    await Promise.all([
      this._fetchSuperpositions(),
      this._fetchFailureModes(),
      this._checkBoot(),
    ]);
    this._initScores();
    this._renderLayer0();
    this._renderLayer1Fields();
    this._renderLayer2();
    this._renderScoreboard();
  }

  async _fetchSuperpositions() {
    try {
      const res = await fetch('/api/semantic_superposition');
      const payload = await res.json();

      // API returns { data, structure, meaning, context }
      this.facetData = payload;

      const superpositions = payload.data?.semantic_superpositions || {};

      this.fields = ANSWER_KEY.fields.map((f) => {
        const interpretations = superpositions[f.key] || [f.value];
        const omega = interpretations.length;
        return {
          ...f,
          interpretations,
          omega,
          entropy: omega > 1 ? parseFloat(Math.log2(omega).toFixed(2)) : 0,
          open: omega > 1,
        };
      });

      this.totalEntropy = parseFloat(
        this.fields.reduce((sum, f) => sum + f.entropy, 0).toFixed(2)
      );
      this.minimumRotations = this.fields.filter((f) => f.open).length;
    } catch (e) {
      console.error('Failed to load semantic superpositions:', e);
    }
  }

  async _fetchFailureModes() {
    try {
      const res = await fetch('/api/failure-modes');
      this.failureModes = await res.json();
    } catch (e) {
      console.error('Failed to load failure modes:', e);
    }
  }

  async _checkBoot() {
    try {
      const res = await fetch('/api/boot');
      const { bootId } = await res.json();
      const prev = localStorage.getItem('bellman_boot_id');
      if (prev && prev !== bootId) {
        localStorage.removeItem('bellman_scores');
        localStorage.removeItem('bellman_layer2_scores');
      }
      localStorage.setItem('bellman_boot_id', bootId);
    } catch (e) {
      console.error('Failed to check boot ID:', e);
    }
  }

  /* ================================================================ */
  /*  DOM                                                             */
  /* ================================================================ */

  _buildDOM() {
    this.panel.innerHTML = `
      <div class="bellman-panel">
        <div class="bellman-header">
          <h2>Bellman</h2>
          <button class="bellman-info-btn" title="Legend">i</button>
          <div class="bellman-tabs">
            <button class="bellman-tab${this.activeLayer === 0 ? ' bellman-tab--active' : ''}" data-layer="0">Raw</button>
            <button class="bellman-tab${this.activeLayer === 1 ? ' bellman-tab--active' : ''}" data-layer="1">Protocol</button>
            <button class="bellman-tab${this.activeLayer === 2 ? ' bellman-tab--active' : ''}" data-layer="2">Coherence</button>
          </div>
        </div>

        <div class="bellman-layer${this.activeLayer === 0 ? ' bellman-layer--active' : ''}" data-layer-content="0"></div>
        <div class="bellman-layer${this.activeLayer === 1 ? ' bellman-layer--active' : ''}" data-layer-content="1"></div>
        <div class="bellman-layer${this.activeLayer === 2 ? ' bellman-layer--active' : ''}" data-layer-content="2"></div>

        <div class="bellman-scoreboard">
          <div class="bellman-stat">
            <span class="bellman-stat-label">H_total</span>
            <span class="bellman-stat-value" data-stat="entropy">\u2014</span>
          </div>
          <div class="bellman-stat">
            <span class="bellman-stat-label">Rotations</span>
            <span class="bellman-stat-value" data-stat="rotations">\u2014</span>
          </div>
          <div class="bellman-stat">
            <span class="bellman-stat-label">Undetected</span>
            <span class="bellman-stat-value" data-stat="undetected">\u2014</span>
          </div>
          <div class="bellman-stat">
            <span class="bellman-stat-label">|H|</span>
            <span class="bellman-stat-value" data-stat="hallucinated">\u2014</span>
          </div>
        </div>
      </div>
    `;

    this._layer0El = this.panel.querySelector('[data-layer-content="0"]');
    this._layer1El = this.panel.querySelector('[data-layer-content="1"]');
    this._layer2El = this.panel.querySelector('[data-layer-content="2"]');

    // Tab switching
    this.panel.querySelectorAll('.bellman-tab').forEach((tab) => {
      tab.addEventListener('click', () => this._switchLayer(Number(tab.dataset.layer)));
    });

    // Info button \u2192 legend modal
    this.panel.querySelector('.bellman-info-btn').addEventListener('click', () => {
      modalManager.open(this._buildLegendHTML());
    });
  }

  /* ================================================================ */
  /*  EventBus                                                        */
  /* ================================================================ */

  _subscribe() {
    eventBus.on('message:sent', () => this.reset());
    eventBus.on('layer2:response', (data) => this._handleLayer2Response(data));
    eventBus.on('bellman:classified', (data) => this._handleClassified(data));

    // Sync when ChatPanel dropdown changes layer
    eventBus.on('prompt:layerChanged', ({ layer }) => {
      if (this.activeLayer === layer) return;
      this._applyLayerView(layer);
      history.replaceState(null, '', `/layer/${layer}`);
    });

    // Browser back/forward
    window.addEventListener('popstate', () => this._handlePopState());
  }

  _handlePopState() {
    const m = window.location.pathname.match(/\/layer\/(\d+)/);
    const layer = m ? Number(m[1]) : 0;
    if (this.activeLayer === layer) return;
    this._applyLayerView(layer);
    eventBus.emit('bellman:layerChanged', { layer });
  }

  _handleClassified({ classifications }) {
    if (!classifications) return;
    this.recommendations = new Map(Object.entries(classifications));
    this._renderLayer1Fields();
    this._renderScoreboard();
  }

  _handleLayer2Response({ parsed }) {
    if (!parsed) return;

    const trace = parsed.decision_trace;
    if (!Array.isArray(trace) || trace.length === 0) return;

    // Build dynamic fields from the agent's actual assumptions
    this.layer2DynamicFields = trace.map((item) => {
      const key = (item.assumption || 'unknown')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      // Try to match to a known LAYER2_FIELDS entry for interpretations
      const known = LAYER2_FIELDS.find((f) =>
        key.includes(f.key) ||
        f.key.includes(key) ||
        (item.assumption || '').toLowerCase().includes(f.name.toLowerCase())
      );

      if (known) {
        return {
          ...known,
          value: item.value || known.value,
        };
      }

      return {
        key,
        name: item.assumption || 'unknown',
        value: item.value || 'unspecified',
        omega: 1,
        entropy: 0,
        open: true,
        interpretations: [item.value || 'unspecified'],
      };
    });

    this.layer2HasResponse = true;

    // Re-init Layer 2 scores for the dynamic fields
    this.layer2Scores = new Map();
    this.layer2DynamicFields.forEach((f) => {
      this.layer2Scores.set(f.key, null);
    });

    this._renderLayer2();
    this._renderScoreboard();
  }

  /* ================================================================ */
  /*  State                                                           */
  /* ================================================================ */

  _initScores() {
    this.fields.forEach((f) => {
      this.scores.set(f.key, null);
    });
    const l2Fields = this.layer2DynamicFields || LAYER2_FIELDS;
    l2Fields.forEach((f) => {
      this.layer2Scores.set(f.key, null);
    });
  }

  reset() {
    this.scores = new Map();
    this.layer2Scores = new Map();
    this.recommendations = new Map();
    this.layer2HasResponse = false;
    this.layer2DynamicFields = null;
    this._initScores();

    this._renderLayer0();
    this._renderLayer1Fields();
    this._renderLayer2();
    this._renderScoreboard();
  }

  /* ================================================================ */
  /*  Rendering \u2014 Layer 0 (raw data)                                  */
  /* ================================================================ */

  _renderLayer0() {
    this._layer0El.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'bellman-section';
    section.innerHTML = `<h3>Raw Data \u2014 Columns</h3>`;

    const note = document.createElement('p');
    note.className = 'bellman-inherited-label';
    note.textContent = 'Source fields before any semantic interpretation is applied.';
    section.appendChild(note);

    ANSWER_KEY.fields.forEach((field) => {
      const row = document.createElement('div');
      row.className = 'bellman-field bellman-field--closed';

      row.innerHTML = `
        <div class="bellman-field-info">
          <span class="bellman-field-name">${field.name}</span>
          <span class="bellman-field-value">${field.value}</span>
        </div>
      `;
      section.appendChild(row);
    });

    this._layer0El.appendChild(section);
  }

  /* ================================================================ */
  /*  Rendering \u2014 Layer 1                                             */
  /* ================================================================ */

  _renderLayer1Fields() {
    this._layer1El.innerHTML = '';

    const FACETS = ['data', 'structure', 'meaning', 'context'];

    FACETS.forEach((facetKey) => {
      const facet = this._buildFacet(facetKey);
      this._layer1El.appendChild(facet);
    });
  }

  _buildFacet(facetKey) {
    const facet = document.createElement('div');
    facet.className = 'bellman-facet';
    facet.dataset.facet = facetKey;

    const facetHeader = document.createElement('div');
    facetHeader.className = 'bellman-facet-header';
    facetHeader.dataset.facet = facetKey;

    const toggle = document.createElement('span');
    toggle.className = 'bellman-facet-toggle';
    toggle.textContent = '\u25BC'; // down arrow = expanded

    const title = document.createElement('span');
    title.className = 'bellman-facet-title';
    title.textContent = facetKey.toUpperCase();

    facetHeader.appendChild(toggle);
    facetHeader.appendChild(title);

    const facetBody = document.createElement('div');
    facetBody.className = 'bellman-facet-body';

    facetHeader.addEventListener('click', () => {
      const collapsed = facet.classList.toggle('bellman-facet--collapsed');
      toggle.textContent = collapsed ? '\u25B6' : '\u25BC'; // right : down
    });

    // Delegate to facet managers
    if (facetKey === 'data') {
      this.fields.forEach((field) => {
        this._renderFieldRow(field, this.scores, facetBody);
      });
    } else if (facetKey === 'context') {
      this.contextManager.render(facetBody);
    } else {
      // STRUCTURE, MEANING: placeholder until manager exists
      const placeholder = document.createElement('p');
      placeholder.className = 'bellman-facet-placeholder';
      placeholder.textContent = `No ${facetKey} analysis yet.`;
      facetBody.appendChild(placeholder);
    }

    facet.appendChild(facetHeader);
    facet.appendChild(facetBody);
    return facet;
  }

  /* ================================================================ */
  /*  Rendering \u2014 Layer 2                                             */
  /* ================================================================ */

  _renderLayer2() {
    this._layer2El.innerHTML = '';

    // Inherited section
    const inheritedSection = document.createElement('div');
    inheritedSection.className = 'bellman-section';
    inheritedSection.innerHTML = `<h3>Inherited from Layer 1</h3>`;

    const openFields = this.fields.filter((f) => f.open);
    openFields.forEach((field) => {
      const row = this._buildInheritedRow(field);
      inheritedSection.appendChild(row);
    });

    const inheritedNote = document.createElement('p');
    inheritedNote.className = 'bellman-inherited-label';
    inheritedNote.textContent = `Inherited null entropy: ${this.totalEntropy} bits (invisible to this agent)`;
    inheritedSection.appendChild(inheritedNote);
    this._layer2El.appendChild(inheritedSection);

    // Own assumptions section
    const ownSection = document.createElement('div');
    ownSection.className = 'bellman-section';
    ownSection.innerHTML = `<h3>Layer 2 Own Assumptions</h3>`;

    if (!this.layer2HasResponse) {
      const placeholder = document.createElement('p');
      placeholder.className = 'bellman-inherited-label';
      placeholder.textContent = 'Awaiting Layer 2 agent response\u2026';
      ownSection.appendChild(placeholder);
    } else {
      const fields = this.layer2DynamicFields || LAYER2_FIELDS;
      fields.forEach((field) => {
        this._renderFieldRow(field, this.layer2Scores, ownSection);
      });
    }
    this._layer2El.appendChild(ownSection);

    // Closure property
    const closure = document.createElement('div');
    closure.className = 'bellman-section bellman-killer';
    closure.innerHTML = `<h3>Closure Property</h3>`;
    this._closureEl = document.createElement('p');
    this._updateClosure();
    closure.appendChild(this._closureEl);
    this._layer2El.appendChild(closure);
  }

  _buildInheritedRow(field) {
    const row = document.createElement('div');
    row.className = 'bellman-field bellman-field--inherited';
    row.title = `${field.name}: ${field.omega} interpretations at Layer 1 \u2014 invisible to the risk agent`;

    row.innerHTML = `
      <div class="bellman-field-info">
        <span class="bellman-field-name">${field.name}</span>
        <span class="bellman-field-value">${field.value}</span>
        <span class="bellman-field-entropy">${field.entropy.toFixed(2)} bits</span>
      </div>
      <div class="bellman-superposition">
        <div class="bellman-superposition-header">Semantic Superposition:</div>
        <div class="bellman-superposition-tags">
          ${field.interpretations.map((i) => `<span class="bellman-superposition-tag">${i}</span>`).join('')}
        </div>
      </div>
    `;
    return row;
  }

  /* ================================================================ */
  /*  Rendering \u2014 shared field row                                    */
  /* ================================================================ */

  _renderFieldRow(field, scoreMap, container) {
    const row = document.createElement('div');
    const grade = scoreMap.get(field.key);
    const isOpen = field.open;

    let cls = 'bellman-field';
    if (!isOpen) cls += ' bellman-field--closed';
    else if (grade) cls += ` bellman-field--graded-${grade}`;
    row.className = cls;
    row.dataset.field = field.key;

    // Info line
    const info = document.createElement('div');
    info.className = 'bellman-field-info';
    info.innerHTML = `
      <span class="bellman-field-name">${field.name}</span>
      <span class="bellman-field-value">${field.value}</span>
      <span class="bellman-field-entropy">${field.entropy.toFixed(2)} bits</span>
    `;
    row.appendChild(info);

    // Semantic Superposition
    const superpos = document.createElement('div');
    superpos.className = 'bellman-superposition';

    const header = document.createElement('div');
    header.className = 'bellman-superposition-header';
    header.textContent = 'Semantic Superposition:';
    superpos.appendChild(header);

    const tags = document.createElement('div');
    tags.className = 'bellman-superposition-tags';
    field.interpretations.forEach((interp) => {
      const tag = document.createElement('span');
      tag.className = 'bellman-superposition-tag';
      tag.textContent = interp;
      tags.appendChild(tag);
    });
    superpos.appendChild(tags);

    row.appendChild(superpos);

    // Scoring buttons \u2014 generated dynamically from failure_modes.json categories
    const scoring = document.createElement('div');
    scoring.className = 'bellman-scoring';

    const categories = this.failureModes?.scoring_categories;
    const gradeKeys = categories ? Object.keys(categories) : Object.keys(GRADES);
    const recommended = !grade ? this.recommendations.get(field.key) : null;

    gradeKeys.forEach((g) => {
      const btn = document.createElement('button');
      btn.className = 'bellman-btn';
      if (grade === g) {
        btn.classList.add(`bellman-btn--selected-${g}`);
      } else if (recommended === g) {
        btn.classList.add(`bellman-btn--recommended-${g}`);
      }
      btn.dataset.grade = g;
      btn.title = categories?.[g]?.label || GRADES[g]?.title || g;
      btn.textContent = categories?.[g]?.label || GRADES[g]?.label || g;
      btn.addEventListener('click', () =>
        this._handleScore(field.key, g, scoreMap)
      );
      scoring.appendChild(btn);
    });

    row.appendChild(scoring);

    // Grade label
    const label = document.createElement('div');
    label.className = 'bellman-grade-label';
    if (grade) {
      label.textContent = GRADES[grade]?.fullLabel || grade;
    } else if (recommended) {
      label.textContent = `${GRADES[recommended]?.fullLabel || recommended} (recommended)`;
    }
    row.appendChild(label);

    container.appendChild(row);
  }

  /* ================================================================ */
  /*  Scoring                                                         */
  /* ================================================================ */

  _handleScore(fieldKey, grade, scoreMap) {
    const current = scoreMap.get(fieldKey);
    // Toggle: clicking the same grade again unscores
    scoreMap.set(fieldKey, current === grade ? null : grade);

    // Persist to localStorage for cross-tab audit report
    localStorage.setItem('bellman_scores', JSON.stringify(Object.fromEntries(this.scores)));
    localStorage.setItem('bellman_layer2_scores', JSON.stringify(Object.fromEntries(this.layer2Scores)));

    // Re-render the active layer's fields
    if (scoreMap === this.scores) {
      this._renderLayer1Fields();
    } else {
      this._renderLayer2();
    }
    this._renderScoreboard();
  }

  /* ================================================================ */
  /*  Layer switching                                                 */
  /* ================================================================ */

  _applyLayerView(num) {
    this.activeLayer = num;

    this.panel.querySelectorAll('.bellman-tab').forEach((t) => {
      t.classList.toggle('bellman-tab--active', Number(t.dataset.layer) === num);
    });

    this._layer0El.classList.toggle('bellman-layer--active', num === 0);
    this._layer1El.classList.toggle('bellman-layer--active', num === 1);
    this._layer2El.classList.toggle('bellman-layer--active', num === 2);

    this._renderScoreboard();
  }

  _switchLayer(num) {
    this._applyLayerView(num);
    history.pushState(null, '', `/layer/${num}`);
    eventBus.emit('bellman:layerChanged', { layer: num });
  }

  /* ================================================================ */
  /*  Scoreboard                                                      */
  /* ================================================================ */

  _renderScoreboard() {
    const entropyEl = this.panel.querySelector('[data-stat="entropy"]');
    const rotationsEl = this.panel.querySelector('[data-stat="rotations"]');
    const undetectedEl = this.panel.querySelector('[data-stat="undetected"]');
    const hallucinatedEl = this.panel.querySelector('[data-stat="hallucinated"]');

    const entropyLabel = entropyEl.closest('.bellman-stat').querySelector('.bellman-stat-label');
    const rotationsLabel = rotationsEl.closest('.bellman-stat').querySelector('.bellman-stat-label');
    const undetectedLabel = undetectedEl.closest('.bellman-stat').querySelector('.bellman-stat-label');
    const hallucinatedLabel = hallucinatedEl.closest('.bellman-stat').querySelector('.bellman-stat-label');

    if (this.activeLayer === 0) {
      const fieldCount = ANSWER_KEY.fields.length;

      entropyLabel.textContent = 'Fields';
      rotationsLabel.textContent = 'Entropy';
      undetectedLabel.textContent = 'Layer';
      hallucinatedLabel.textContent = 'Status';

      entropyEl.textContent = `${fieldCount}`;
      entropyEl.className = 'bellman-stat-value';

      rotationsEl.textContent = '\u2014';
      rotationsEl.className = 'bellman-stat-value';

      undetectedEl.textContent = '0';
      undetectedEl.className = 'bellman-stat-value';

      hallucinatedEl.textContent = 'Raw';
      hallucinatedEl.className = 'bellman-stat-value';
    } else if (this.activeLayer === 1) {
      // H_total: \u03A3 log\u2082|\u03A9_i| for D and U fields (and unscored).
      // A sets field entropy to 0. H excluded entirely.
      const entropy = this._computeEntropy(this.scores, this.fields);
      const rotations = this._countGrades(this.scores, 'A');
      const undetected = this._countGrades(this.scores, 'U');
      const hallucinated = this._countGrades(this.scores, 'H');

      entropyLabel.textContent = 'H_total';
      rotationsLabel.textContent = 'Rotations';
      undetectedLabel.textContent = 'Undetected';
      hallucinatedLabel.textContent = '|H|';

      entropyEl.textContent = `${entropy.toFixed(2)} / ${this.totalEntropy}`;
      entropyEl.className = 'bellman-stat-value' +
        (entropy === 0 ? ' bellman-stat-value--success' : '');

      rotationsEl.textContent = `${rotations} / ${this.minimumRotations}`;
      rotationsEl.className = 'bellman-stat-value' +
        (rotations >= this.minimumRotations ? ' bellman-stat-value--success' : '');

      undetectedEl.textContent = `${undetected}`;
      undetectedEl.className = 'bellman-stat-value' +
        (undetected > 0 ? ' bellman-stat-value--danger' : '');

      hallucinatedEl.textContent = `${hallucinated}`;
      hallucinatedEl.className = 'bellman-stat-value' +
        (hallucinated > 0 ? ' bellman-stat-value--danger' : '');
    } else {
      const l2Fields = this.layer2DynamicFields || LAYER2_FIELDS;
      const ownEntropy = this._computeEntropy(this.layer2Scores, l2Fields);
      const inherited = this.totalEntropy;
      const total = ownEntropy + inherited;
      const rotations = this._countGrades(this.layer2Scores, 'A');
      const undetected = this._countGrades(this.layer2Scores, 'U');
      const hallucinated = this._countGrades(this.layer2Scores, 'H');

      entropyLabel.textContent = 'Total H';
      rotationsLabel.textContent = 'Own H';
      undetectedLabel.textContent = 'Undetected';
      hallucinatedLabel.textContent = '|H|';

      entropyEl.textContent = `${total.toFixed(2)} bits`;
      entropyEl.className = 'bellman-stat-value bellman-stat-value--danger';

      rotationsEl.textContent = `${ownEntropy.toFixed(2)} bits`;
      rotationsEl.className = 'bellman-stat-value';

      undetectedEl.textContent = `${undetected}`;
      undetectedEl.className = 'bellman-stat-value' +
        (undetected > 0 ? ' bellman-stat-value--danger' : '');

      hallucinatedEl.textContent = `${hallucinated}`;
      hallucinatedEl.className = 'bellman-stat-value' +
        (hallucinated > 0 ? ' bellman-stat-value--danger' : '');

      this._updateClosure();
    }
  }

  /* ================================================================ */
  /*  Closure (Layer 2)                                               */
  /* ================================================================ */

  _updateClosure() {
    if (!this._closureEl) return;
    const scored = this._countScored(this.layer2Scores);
    const total = (this.layer2DynamicFields || LAYER2_FIELDS).length;
    const inherited = this.totalEntropy;
    const broken = inherited > 0;

    this._closureEl.innerHTML = `
      Assumptions identified: ${scored} / ${total}<br>
      Inherited entropy: ${inherited} bits<br>
      <span class="${broken ? 'bellman-status' : 'bellman-status bellman-status--ok'}">
        Bellman: ${broken ? 'BROKEN at serialization boundary' : 'Optimal sub-structure preserved'}
      </span>
    `;
  }

  /* ================================================================ */
  /*  Legend                                                          */
  /* ================================================================ */

  _buildLegendHTML() {
    // Build Scoring Grades rows from failure_modes.json data
    const gradeColors = { A: '#22c55e', D: '#f59e0b', U: '#ef4444', H: '#7c3aed' };
    let scoringRows = '';

    if (this.failureModes?.scoring_categories) {
      const cats = this.failureModes.scoring_categories;
      for (const [key, cat] of Object.entries(cats)) {
        const color = gradeColors[key] || '#6b7280';
        const def = key === 'D'
          ? `${cat.layer_1.definition} ${cat.layer_1.serialization_output}`
          : cat.layer_1.definition;
        scoringRows += `
          <tr>
            <td><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${color};vertical-align:middle;margin-right:6px"></span><strong>${cat.label}</strong></td>
            <td>${def}</td>
            <td><em>${cat.layer_1.example}</em></td>
          </tr>`;
      }
    }

    // Build scoring table rows from failure_modes.json
    let tableRows = '';
    if (this.failureModes?.scoring_table) {
      const { columns, rows } = this.failureModes.scoring_table;
      for (const row of rows) {
        const [category, label, slotInS2, referentInW, rhoDefined, recoverable, epistemicState] = row;
        const color = gradeColors[category] || '#6b7280';
        tableRows += `
          <tr>
            <td><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${color};vertical-align:middle;margin-right:6px"></span><strong>${category}</strong></td>
            <td>${label}</td>
            <td>${slotInS2 ? 'Yes' : 'No'}</td>
            <td>${referentInW ? 'Yes' : 'No'}</td>
            <td>${rhoDefined ? 'Yes' : 'No'}</td>
            <td>${recoverable ? 'Yes' : 'No'}</td>
            <td>${epistemicState}</td>
          </tr>`;
      }
    }

    return `
      <h1>Bellman Legend</h1>

      <h2>Scoring Grades</h2>
      <table>
        <thead>
          <tr><th>Grade</th><th>Definition</th><th>Example</th></tr>
        </thead>
        <tbody>
          ${scoringRows}
        </tbody>
      </table>

      <h2>Layer 2 Epistemic States</h2>
      <table>
        <thead>
          <tr><th></th><th>Label</th><th>Slot in S2</th><th>Referent in W</th><th>\u03C1 Defined</th><th>Recoverable</th><th>Epistemic State</th></tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <h2>Scoreboard</h2>
      <table>
        <thead>
          <tr><th>Metric</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Entropy</strong></td><td>Remaining information-theoretic uncertainty in bits. Computed as &Sigma; log&#8322;|&Omega;<sub>i</sub>| for <em>Detected</em> and <em>Undetected</em> fields only. <em>Asked</em> reduces entropy. <em>Hallucinated</em> fields are excluded &mdash; they are not configurations within &Omega; and must be tracked separately as |H|.</td></tr>
          <tr><td><strong>Rotations</strong></td><td>Number of fields graded <em>Asked</em>. These are the cross-boundary measurements that close ambiguity.</td></tr>
          <tr><td><strong>Undetected</strong></td><td>Count of fields the agent silently assumed. These produce null uncertainty at Layer 2.</td></tr>
          <tr><td><strong>|H|</strong></td><td>Count of hallucinated fields. Tracked separately from entropy. Tracked separately from entropy. Required for C* (paper &sect;7.5, Open Question 6 &mdash; not yet computable).</td></tr>
        </tbody>
      </table>
    `;
  }

  /* ================================================================ */
  /*  Math helpers                                                    */
  /* ================================================================ */

  /**
   * H_total: \u03A3 log\u2082|\u03A9_i| for D and U fields (and unscored).
   * A reduces field entropy to 0 (rotation closes it).
   * H is excluded entirely \u2014 not a configuration within \u03A9.
   */
  _computeEntropy(scoreMap, fields) {
    let sum = 0;
    for (const f of fields) {
      const grade = scoreMap.get(f.key);
      // A: entropy zeroed (verified). H: excluded (fictitious, outside \u03A9).
      // null/D/U: entropy stays in H_total.
      if (grade !== 'A' && grade !== 'H') {
        sum += f.entropy;
      }
    }
    return sum;
  }

  _countGrades(scoreMap, grade) {
    let count = 0;
    for (const v of scoreMap.values()) {
      if (v === grade) count++;
    }
    return count;
  }

  _countScored(scoreMap) {
    let count = 0;
    for (const v of scoreMap.values()) {
      if (v !== null) count++;
    }
    return count;
  }
}
