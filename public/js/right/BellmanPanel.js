import eventBus from '../events/EventBus.js';
import { modalManager } from '../ModalManager.js';
import {
  ANSWER_KEY,
  LAYER2_FIELDS,
  LAYER2_TOTAL_ENTROPY,
  GRADES,
} from './bellman-constants.js';

export class BellmanPanel {
  constructor(panel) {
    this.panel = panel;
    this.activeLayer = 1;
    this.scores = new Map();       // Layer 1: fieldKey → 'A'|'S'|'N'|null
    this.layer2Scores = new Map(); // Layer 2: fieldKey → 'A'|'S'|'N'|null

    this._buildDOM();
    this._subscribe();
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
            <button class="bellman-tab bellman-tab--active" data-layer="1">Layer 1</button>
            <button class="bellman-tab" data-layer="2">Layer 2</button>
          </div>
        </div>

        <div class="bellman-layer bellman-layer--active" data-layer-content="1"></div>
        <div class="bellman-layer" data-layer-content="2"></div>

        <div class="bellman-scoreboard">
          <div class="bellman-stat">
            <span class="bellman-stat-label">Entropy</span>
            <span class="bellman-stat-value" data-stat="entropy">—</span>
          </div>
          <div class="bellman-stat">
            <span class="bellman-stat-label">Rotations</span>
            <span class="bellman-stat-value" data-stat="rotations">—</span>
          </div>
          <div class="bellman-stat">
            <span class="bellman-stat-label">Nulls</span>
            <span class="bellman-stat-value" data-stat="nulls">—</span>
          </div>
        </div>
      </div>
    `;

    this._layer1El = this.panel.querySelector('[data-layer-content="1"]');
    this._layer2El = this.panel.querySelector('[data-layer-content="2"]');

    // Tab switching
    this.panel.querySelectorAll('.bellman-tab').forEach((tab) => {
      tab.addEventListener('click', () => this._switchLayer(Number(tab.dataset.layer)));
    });

    // Info button → legend modal
    this.panel.querySelector('.bellman-info-btn').addEventListener('click', () => {
      modalManager.open(this._buildLegendHTML());
    });

    this._initScores();
    this._renderLayer1Fields();
    this._renderLayer2();
    this._renderScoreboard();
  }

  /* ================================================================ */
  /*  EventBus                                                        */
  /* ================================================================ */

  _subscribe() {
    eventBus.on('message:sent', () => this.reset());
  }

  /* ================================================================ */
  /*  State                                                           */
  /* ================================================================ */

  _initScores() {
    ANSWER_KEY.fields.forEach((f) => {
      if (f.open) this.scores.set(f.key, null);
    });
    LAYER2_FIELDS.forEach((f) => {
      this.layer2Scores.set(f.key, null);
    });
  }

  reset() {
    this.activeLayer = 1;
    this.scores = new Map();
    this.layer2Scores = new Map();
    this._initScores();

    // Reset tab visuals
    this.panel.querySelectorAll('.bellman-tab').forEach((t) => {
      t.classList.toggle('bellman-tab--active', Number(t.dataset.layer) === 1);
    });

    this._layer1El.classList.add('bellman-layer--active');
    this._layer2El.classList.remove('bellman-layer--active');

    this._renderLayer1Fields();
    this._renderLayer2();
    this._renderScoreboard();
  }

  /* ================================================================ */
  /*  Rendering — Layer 1                                             */
  /* ================================================================ */

  _renderLayer1Fields() {
    this._layer1El.innerHTML = '';
    ANSWER_KEY.fields.forEach((field) => {
      this._renderFieldRow(field, this.scores, this._layer1El);
    });
  }

  /* ================================================================ */
  /*  Rendering — Layer 2                                             */
  /* ================================================================ */

  _renderLayer2() {
    this._layer2El.innerHTML = '';

    // Inherited section
    const inheritedSection = document.createElement('div');
    inheritedSection.className = 'bellman-section';
    inheritedSection.innerHTML = `<h3>Inherited from Layer 1</h3>`;

    const openFields = ANSWER_KEY.fields.filter((f) => f.open);
    openFields.forEach((field) => {
      const row = this._buildInheritedRow(field);
      inheritedSection.appendChild(row);
    });

    const inheritedNote = document.createElement('p');
    inheritedNote.className = 'bellman-inherited-label';
    inheritedNote.textContent = `Inherited null entropy: ${ANSWER_KEY.totalEntropy} bits (invisible to this agent)`;
    inheritedSection.appendChild(inheritedNote);
    this._layer2El.appendChild(inheritedSection);

    // Own assumptions section
    const ownSection = document.createElement('div');
    ownSection.className = 'bellman-section';
    ownSection.innerHTML = `<h3>Layer 2 Own Assumptions</h3>`;
    LAYER2_FIELDS.forEach((field) => {
      this._renderFieldRow(field, this.layer2Scores, ownSection);
    });
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
    row.title = `${field.name}: ${field.omega} interpretations at Layer 1 — invisible to the risk agent`;

    row.innerHTML = `
      <div class="bellman-field-info">
        <span class="bellman-field-name">${field.name}</span>
        <span class="bellman-field-value">${field.value}</span>
        <span class="bellman-field-entropy">${field.entropy.toFixed(2)} bits</span>
      </div>
      <div class="bellman-superposition">
        <div class="bellman-superposition-header">Semantic Superposition:</div>
        <div class="bellman-superposition-code">"${field.value}": ${JSON.stringify(field.interpretations)}</div>
      </div>
    `;
    return row;
  }

  /* ================================================================ */
  /*  Rendering — shared field row                                    */
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

    const code = document.createElement('div');
    code.className = 'bellman-superposition-code';
    code.textContent = `"${field.value}": ${JSON.stringify(field.interpretations)}`;
    superpos.appendChild(code);

    row.appendChild(superpos);

    // Scoring buttons (open fields only)
    if (isOpen) {
      const scoring = document.createElement('div');
      scoring.className = 'bellman-scoring';

      ['A', 'S', 'N'].forEach((g) => {
        const btn = document.createElement('button');
        btn.className = 'bellman-btn';
        if (grade === g) btn.classList.add(`bellman-btn--selected-${g}`);
        btn.dataset.grade = g;
        btn.title = GRADES[g].title;
        btn.textContent = GRADES[g].label;
        btn.addEventListener('click', () =>
          this._handleScore(field.key, g, scoreMap)
        );
        scoring.appendChild(btn);
      });

      row.appendChild(scoring);

      // Grade label
      const label = document.createElement('div');
      label.className = 'bellman-grade-label';
      if (grade) label.textContent = GRADES[grade].fullLabel;
      row.appendChild(label);
    }

    container.appendChild(row);
  }

  /* ================================================================ */
  /*  Scoring                                                         */
  /* ================================================================ */

  _handleScore(fieldKey, grade, scoreMap) {
    const current = scoreMap.get(fieldKey);
    // Toggle: clicking the same grade again unscores
    scoreMap.set(fieldKey, current === grade ? null : grade);

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

  _switchLayer(num) {
    this.activeLayer = num;

    this.panel.querySelectorAll('.bellman-tab').forEach((t) => {
      t.classList.toggle('bellman-tab--active', Number(t.dataset.layer) === num);
    });

    this._layer1El.classList.toggle('bellman-layer--active', num === 1);
    this._layer2El.classList.toggle('bellman-layer--active', num === 2);

    this._renderScoreboard();
  }

  /* ================================================================ */
  /*  Scoreboard                                                      */
  /* ================================================================ */

  _renderScoreboard() {
    const entropyEl = this.panel.querySelector('[data-stat="entropy"]');
    const rotationsEl = this.panel.querySelector('[data-stat="rotations"]');
    const nullsEl = this.panel.querySelector('[data-stat="nulls"]');

    // Update labels
    const entropyLabel = this.panel.querySelector('[data-stat="entropy"]')
      .closest('.bellman-stat')
      .querySelector('.bellman-stat-label');
    const rotationsLabel = rotationsEl
      .closest('.bellman-stat')
      .querySelector('.bellman-stat-label');
    const nullsLabel = nullsEl
      .closest('.bellman-stat')
      .querySelector('.bellman-stat-label');

    if (this.activeLayer === 1) {
      const openFields = ANSWER_KEY.fields.filter((f) => f.open);
      const entropy = this._computeEntropy(this.scores, openFields);
      const rotations = this._countGrades(this.scores, 'A');
      const nulls = this._countGrades(this.scores, 'N');

      entropyLabel.textContent = 'Entropy';
      rotationsLabel.textContent = 'Rotations';
      nullsLabel.textContent = 'Nulls';

      entropyEl.textContent = `${entropy.toFixed(2)} / ${ANSWER_KEY.totalEntropy}`;
      entropyEl.className = 'bellman-stat-value' +
        (entropy === 0 ? ' bellman-stat-value--success' : '');

      rotationsEl.textContent = `${rotations} / ${ANSWER_KEY.minimumRotations}`;
      rotationsEl.className = 'bellman-stat-value' +
        (rotations >= ANSWER_KEY.minimumRotations ? ' bellman-stat-value--success' : '');

      nullsEl.textContent = `${nulls} / ${openFields.length}`;
      nullsEl.className = 'bellman-stat-value' +
        (nulls > 0 ? ' bellman-stat-value--danger' : '');
    } else {
      const ownEntropy = this._computeEntropy(this.layer2Scores, LAYER2_FIELDS);
      const inherited = ANSWER_KEY.totalEntropy;
      const total = ownEntropy + inherited;
      const rotations = this._countGrades(this.layer2Scores, 'A');

      entropyLabel.textContent = 'Total Entropy';
      rotationsLabel.textContent = 'Own Entropy';
      nullsLabel.textContent = 'Status';

      entropyEl.textContent = `${total.toFixed(2)} bits`;
      entropyEl.className = 'bellman-stat-value bellman-stat-value--danger';

      rotationsEl.textContent = `${ownEntropy.toFixed(2)} bits`;
      rotationsEl.className = 'bellman-stat-value';

      const broken = inherited > 0;
      nullsEl.textContent = broken ? 'BROKEN' : 'OK';
      nullsEl.className = 'bellman-stat-value' +
        (broken ? ' bellman-stat-value--danger' : ' bellman-stat-value--success');

      this._updateClosure();
    }
  }

  /* ================================================================ */
  /*  Closure (Layer 2)                                               */
  /* ================================================================ */

  _updateClosure() {
    if (!this._closureEl) return;
    const scored = this._countScored(this.layer2Scores);
    const total = LAYER2_FIELDS.length;
    const inherited = ANSWER_KEY.totalEntropy;
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
    return `
      <h1>Bellman Legend</h1>

      <h2>Scoring Grades</h2>
      <table>
        <thead>
          <tr><th>Grade</th><th>Meaning</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${GRADES.A.color};vertical-align:middle;margin-right:6px"></span><strong>Asked</strong></td>
            <td>${GRADES.A.title}</td>
            <td>The agent requested clarification before proceeding. This is a <em>rotation</em> — a cross-boundary measurement. It costs something, but it closes the boundary.</td>
          </tr>
          <tr>
            <td><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${GRADES.S.color};vertical-align:middle;margin-right:6px"></span><strong>Surfaced</strong></td>
            <td>${GRADES.S.title}</td>
            <td>The agent mentioned the ambiguity but then assumed a default and kept going. It noticed the problem but didn't pay the cost to resolve it.</td>
          </tr>
          <tr>
            <td><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${GRADES.N.color};vertical-align:middle;margin-right:6px"></span><strong>Null</strong></td>
            <td>${GRADES.N.title}</td>
            <td>The agent silently assumed. No mention of ambiguity. No question. No signal that a question existed. This is <em>null uncertainty</em> — the variable doesn't exist in the agent's reasoning.</td>
          </tr>
        </tbody>
      </table>

      <h2>Scoreboard</h2>
      <table>
        <thead>
          <tr><th>Metric</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Entropy</strong></td><td>Remaining information-theoretic uncertainty (in bits). Only <em>Asked</em> grades reduce entropy — Surfaced and Null leave it intact.</td></tr>
          <tr><td><strong>Rotations</strong></td><td>Number of fields graded <em>Asked</em>. These are the cross-boundary measurements that close ambiguity.</td></tr>
          <tr><td><strong>Nulls</strong></td><td>Number of fields graded <em>Null</em>. These represent invisible assumptions the agent never surfaced.</td></tr>
        </tbody>
      </table>
    `;
  }

  /* ================================================================ */
  /*  Math helpers                                                    */
  /* ================================================================ */

  _computeEntropy(scoreMap, fields) {
    let sum = 0;
    for (const f of fields) {
      if (!f.open) continue;
      const grade = scoreMap.get(f.key);
      // Only A (verified) reduces entropy; S and N leave it
      if (grade !== 'A') {
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
