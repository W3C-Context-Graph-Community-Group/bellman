import { usePolytopeStore } from '../../store/usePolytopeStore';

export function GuideModal() {
  const showGuide = usePolytopeStore((s) => s.showGuide);
  const setShowGuide = usePolytopeStore((s) => s.setShowGuide);

  if (!showGuide) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowGuide(false)}>
      <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setShowGuide(false)}>
          &times;
        </button>

        <div className="guide-scroll">
          <h2 className="guide-title">Interpretation Space Explorer</h2>
          <p className="guide-subtitle">
            A visual tool for understanding how ambiguous data fields collapse
            into resolved interpretations, modelled as a polytope in
            configuration space.
          </p>

          {/* ── Overview ── */}
          <section className="guide-section">
            <h3>What am I looking at?</h3>
            <p>
              You are viewing an <strong>interpretation polytope</strong> — a
              geometric object where every vertex represents one possible
              &ldquo;world state&rdquo; (a complete assignment of values to
              every ambiguous field). When a CSV row arrives with ambiguous
              fields, multiple interpretations are plausible simultaneously.
              This visualisation shows all of them at once and lets you watch
              them collapse, step by step, until a single resolved state
              remains.
            </p>
            <p>
              Think of it like quantum superposition: the data starts in a
              superposition of many possible meanings, and each resolution
              step &ldquo;measures&rdquo; one field, eliminating
              incompatible interpretations.
            </p>
          </section>

          {/* ── The Grid ── */}
          <section className="guide-section">
            <h3>The Card Grid</h3>
            <p>
              Each <strong>card</strong> in the grid is one vertex of the
              polytope — one complete configuration of field values. The card
              text shows the chosen interpretation for every ambiguous field
              in that configuration.
            </p>
            <div className="guide-detail-grid">
              <div className="guide-detail">
                <span className="guide-swatch" style={{ background: 'var(--green)' }} />
                <div>
                  <strong>Alive (green border)</strong> — still consistent
                  with all resolved fields so far.
                </div>
              </div>
              <div className="guide-detail">
                <span className="guide-swatch" style={{ background: '#ef4444', opacity: 0.5 }} />
                <div>
                  <strong>Eliminated (faded, red border)</strong> —
                  contradicts a resolved field; this interpretation has been
                  ruled out.
                </div>
              </div>
              <div className="guide-detail">
                <span className="guide-swatch" style={{ background: 'var(--purple)', opacity: 0.6 }} />
                <div>
                  <strong>Ghost (purple dashed)</strong> — phantom vertices
                  added by a hallucinated (H-scored) field, representing
                  dimensions that should not exist.
                </div>
              </div>
              <div className="guide-detail">
                <span className="guide-swatch survivor-swatch" />
                <div>
                  <strong>Survivor (green glow)</strong> — the single
                  remaining vertex once all fields are resolved.
                </div>
              </div>
            </div>
            <p>
              Row headers label the <em>row axes</em> (location &times;
              instrument in Layer 1; correlation &times; risk threshold in
              Layer 2). Column headers label the <em>column axes</em> (date
              &times; amount in Layer 1; volatility model &times; hedging
              horizon in Layer 2).
            </p>
          </section>

          {/* ── Layers ── */}
          <section className="guide-section">
            <h3>Layer 1 &amp; Layer 2</h3>
            <p>
              <strong>Layer 1</strong> models the raw input fields: date,
              amount, location, and instrument. Their ambiguity produces
              2 &times; 5 &times; 5 &times; 3 = <strong>150</strong> world
              states. Steps 1&ndash;4 collapse these fields one by one until
              a single JSON output remains (Step 5).
            </p>
            <p>
              <strong>Layer 2</strong> represents a downstream risk agent that
              receives Layer 1&rsquo;s resolved output and adds its own
              ambiguous dimensions: volatility model, correlation assumption,
              hedging horizon, and risk threshold. This re-expands the state
              space to 4 &times; 3 &times; 3 &times; 3 ={' '}
              <strong>108</strong> world states (Step 6). Steps 7&ndash;10
              collapse Layer 2&rsquo;s fields.
            </p>
          </section>

          {/* ── Timeline ── */}
          <section className="guide-section">
            <h3>Timeline &amp; Playback Controls</h3>
            <p>
              The bottom bar contains a <strong>scrubber</strong> with 12
              step markers (0&ndash;11). Each marker corresponds to a
              serialization event — a moment where the system state changes.
            </p>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Control</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>&#x23EE;</td>
                  <td>Reset to Step 0 (initial superposition)</td>
                </tr>
                <tr>
                  <td>&#x23F4; / &#x23F5;</td>
                  <td>Step backward / forward one event</td>
                </tr>
                <tr>
                  <td>&#x25B6; / &#x23F8;</td>
                  <td>
                    Play / Pause — auto-advances every 2.5 seconds
                  </td>
                </tr>
                <tr>
                  <td>&#x23ED;</td>
                  <td>Jump to final step (fully resolved)</td>
                </tr>
                <tr>
                  <td>Slider</td>
                  <td>Drag to scrub to any step instantly</td>
                </tr>
                <tr>
                  <td>Dot markers</td>
                  <td>Click any marker to jump to that step</td>
                </tr>
              </tbody>
            </table>
            <p>
              Purple-bordered markers indicate Layer 2 events. The label
              below each marker shows the field being resolved at that step
              (or &ldquo;start&rdquo;, &ldquo;JSON&rdquo;, &ldquo;L2&rdquo;,
              &ldquo;end&rdquo; for boundary events).
            </p>
          </section>

          {/* ── Header Metrics ── */}
          <section className="guide-section">
            <h3>Header Metrics</h3>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Pill</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>ALIVE</strong></td>
                  <td>
                    Number of vertices still consistent with resolved fields.
                    Starts at 150 (Layer 1) or 108 (Layer 2) and decreases
                    with each collapse.
                  </td>
                </tr>
                <tr>
                  <td><strong>ENTROPY</strong></td>
                  <td>
                    Total Shannon entropy <em>H</em><sub>total</sub> in bits
                    across all unresolved fields (see formula below).
                  </td>
                </tr>
                <tr>
                  <td><strong>STEP</strong></td>
                  <td>Current step / total steps in the timeline.</td>
                </tr>
                <tr>
                  <td><strong>ELIMINATED</strong></td>
                  <td>Cumulative count of ruled-out vertices.</td>
                </tr>
                <tr>
                  <td><strong>GHOSTS</strong></td>
                  <td>
                    Phantom vertices injected by H-scored fields. These
                    inflate the state space artificially.
                  </td>
                </tr>
                <tr>
                  <td><strong>ROTATIONS</strong></td>
                  <td>
                    Number of unresolved fields with |&Omega;| &gt; 1 — the
                    remaining &ldquo;degrees of freedom&rdquo;.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* ── Entropy ── */}
          <section className="guide-section">
            <h3>How Entropy Is Calculated</h3>
            <p>
              Each ambiguous field <em>i</em> has a set of possible
              interpretations &Omega;<sub>i</sub>. Assuming a uniform prior
              (all interpretations equally likely), the Shannon entropy for
              that field is:
            </p>
            <div className="guide-formula">
              H(field<sub>i</sub>) = log<sub>2</sub>(|&Omega;<sub>i</sub>|)
              &nbsp;bits
            </div>
            <p>The total entropy across all unresolved fields is the sum:</p>
            <div className="guide-formula">
              H<sub>total</sub> = &sum; H(field<sub>i</sub>) = &sum;
              log<sub>2</sub>(|&Omega;<sub>i</sub>|)
            </div>
            <p>
              When a field is resolved, it is removed from the sum (its
              entropy drops to zero). The <strong>entropy reduction
              &Delta;H</strong> at each step is the entropy that was
              contributed by the now-resolved field.
            </p>
            <p>Example for Layer 1:</p>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>|&Omega;|</th>
                  <th>H (bits)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>date</td>
                  <td>2</td>
                  <td>log<sub>2</sub>(2) = 1.00</td>
                </tr>
                <tr>
                  <td>amount</td>
                  <td>5</td>
                  <td>log<sub>2</sub>(5) = 2.32</td>
                </tr>
                <tr>
                  <td>location</td>
                  <td>5</td>
                  <td>log<sub>2</sub>(5) = 2.32</td>
                </tr>
                <tr>
                  <td>instrument</td>
                  <td>3</td>
                  <td>log<sub>2</sub>(3) = 1.58</td>
                </tr>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td><strong>7.22 bits</strong></td>
                </tr>
              </tbody>
            </table>
            <p>
              The total state space size is the product: |&Omega;| = 2 &times;
              5 &times; 5 &times; 3 = 150 world states, and
              log<sub>2</sub>(150) = 7.23 bits (matching H<sub>total</sub>
              due to independence).
            </p>
            <p>
              At Layer 2, entropy <em>increases</em> at Step 6 when the risk
              agent adds 4 new dimensions (negative &Delta;H), then decreases
              again as Layer 2 fields are resolved.
            </p>
          </section>

          {/* ── ADUH ── */}
          <section className="guide-section">
            <h3>ADUH Scoring</h3>
            <p>
              Every resolved field receives an <strong>ADUH grade</strong>{' '}
              that classifies <em>how</em> the resolution was sourced:
            </p>
            <div className="guide-detail-grid">
              <div className="guide-detail">
                <span className="guide-badge" style={{ background: '#3b82f6' }}>A</span>
                <div>
                  <strong>Asked</strong> — the system explicitly asked the
                  user and received a verified answer.
                </div>
              </div>
              <div className="guide-detail">
                <span className="guide-badge" style={{ background: '#f59e0b' }}>D</span>
                <div>
                  <strong>Detected</strong> — the system inferred the value
                  from context or pattern matching (assumed correct but
                  unverified).
                </div>
              </div>
              <div className="guide-detail">
                <span className="guide-badge" style={{ background: '#ef4444' }}>U</span>
                <div>
                  <strong>Undetected</strong> — the ambiguity was silently
                  resolved without the user being informed. The system chose
                  a default, but the user may not agree.
                </div>
              </div>
              <div className="guide-detail">
                <span className="guide-badge" style={{ background: '#7c3aed' }}>H</span>
                <div>
                  <strong>Hallucinated</strong> — the system fabricated a
                  resolution that doesn&rsquo;t correspond to real data.
                  H-scored fields inject ghost vertices into the polytope,
                  expanding the state space artificially.
                </div>
              </div>
            </div>
            <p>
              ADUH scores are shown as coloured badges in the Field Status
              panel and in the JSON data structure.
            </p>
          </section>

          {/* ── View Modes ── */}
          <section className="guide-section">
            <h3>View Modes</h3>
            <p>
              <strong>God View</strong> shows all vertices — alive and
              eliminated — so you can see the full polytope and the pattern
              of eliminations.
            </p>
            <p>
              <strong>Layer 2 View</strong> hides eliminated vertices with a
              fade-out transition, leaving only alive (and ghost) vertices
              visible. This simulates the perspective of the Layer 2 agent,
              who cannot &ldquo;see&rdquo; the ruled-out states.
            </p>
          </section>

          {/* ── JSON Viewer ── */}
          <section className="guide-section">
            <h3>JSON Viewer</h3>
            <p>
              Click the <code>{'{}'}</code> button in the timeline bar to
              expand a live JSON panel showing the raw{' '}
              <code>SerializationEvent</code> data structure for the current
              step. This is the same object that would be logged in the
              Bellman serialization pipeline.
            </p>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>id</code></td>
                  <td>Unique event identifier (e.g. &ldquo;evt-3&rdquo;)</td>
                </tr>
                <tr>
                  <td><code>step</code></td>
                  <td>Step index (0&ndash;11)</td>
                </tr>
                <tr>
                  <td><code>fieldId</code></td>
                  <td>
                    Which field is collapsing at this step, or{' '}
                    <code>null</code> for boundary events
                  </td>
                </tr>
                <tr>
                  <td><code>layer</code></td>
                  <td>Which processing layer (1 or 2)</td>
                </tr>
                <tr>
                  <td><code>description</code></td>
                  <td>Human-readable summary of the event</td>
                </tr>
                <tr>
                  <td><code>beforeOmega</code></td>
                  <td>|&Omega;| before this collapse step</td>
                </tr>
                <tr>
                  <td><code>afterOmega</code></td>
                  <td>|&Omega;| after — the surviving world-state count</td>
                </tr>
                <tr>
                  <td><code>resolvedValue</code></td>
                  <td>
                    The chosen interpretation (or <code>null</code> if no
                    field was resolved)
                  </td>
                </tr>
                <tr>
                  <td><code>entropyReduction</code></td>
                  <td>
                    &Delta;H in bits (positive = entropy decreased; negative
                    at Step 6 = entropy increased due to Layer 2 expansion)
                  </td>
                </tr>
                <tr>
                  <td><code>aduhScore</code></td>
                  <td>
                    ADUH grade for this resolution (A/D/U/H or{' '}
                    <code>null</code>)
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* ── Field Status ── */}
          <section className="guide-section">
            <h3>Field Status Panel</h3>
            <p>
              Below the grid, the Field Status table shows each field&rsquo;s
              current state: its raw value, the size of its interpretation
              set |&Omega;|, and whether it has been collapsed (with the
              resolved interpretation and ADUH badge) or remains ambiguous.
            </p>
          </section>

          {/* ── Conceptual Model ── */}
          <section className="guide-section">
            <h3>The Bellman Conceptual Model</h3>
            <p>
              This visualisation implements the{' '}
              <strong>Bellman Serialization Uncertainty Framework</strong>.
              When structured data passes through an LLM pipeline, fields
              that appear unambiguous to machines may carry hidden
              interpretation uncertainty. The framework models this
              uncertainty as a polytope in configuration space, where:
            </p>
            <ul>
              <li>
                Each <strong>axis</strong> corresponds to one ambiguous field
              </li>
              <li>
                Each <strong>position</strong> on an axis is one possible
                interpretation
              </li>
              <li>
                Each <strong>vertex</strong> is a complete world-state (a
                particular combination of all field interpretations)
              </li>
              <li>
                <strong>Collapse</strong> (resolution) eliminates all vertices
                that disagree with the chosen interpretation, analogous to
                wavefunction collapse
              </li>
              <li>
                <strong>ADUH scoring</strong> audits how each resolution was
                sourced, surfacing hidden assumptions
              </li>
            </ul>
            <p>
              The goal is to make serialization decisions transparent and
              auditable — every assumption, every silent default, every
              hallucination becomes visible in the polytope.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
