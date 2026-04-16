import { extractBraceContent, replaceCommand } from './utils.js';

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι',
  kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
  rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
  varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
  Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const OPERATORS = {
  sum: '∑', prod: '∏', int: '∫',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇',
  leq: '≤', geq: '≥', neq: '≠', approx: '≈', equiv: '≡', sim: '∼',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐',
  leftrightarrow: '↔', Leftrightarrow: '⇔', mapsto: '↦',
  infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃',
  times: '×', cdot: '·', circ: '∘', pm: '±', mp: '∓', star: '⋆',
  cap: '∩', cup: '∪', wedge: '∧', vee: '∨', neg: '¬',
  emptyset: '∅', varnothing: '∅',
  ldots: '…', cdots: '⋯', dots: '…', vdots: '⋮',
  langle: '⟨', rangle: '⟩',
  ell: 'ℓ', hbar: 'ℏ', Re: 'ℜ', Im: 'ℑ',
};

const SPACING = {
  quad: '  ', qquad: '    ',
};

const NAMED_FUNCTIONS = [
  'lim', 'log', 'ln', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'exp', 'det', 'dim', 'ker', 'inf', 'sup', 'min', 'max',
  'arg', 'deg', 'gcd', 'hom', 'mod',
];

const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  '*': '⁎',
};

const SUBSCRIPT_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ',
};

export class ToTxtUnicodeMath {
  convert(latex) {
    let result = latex;

    // Remove math delimiters: \[...\] and $...$
    result = result.replace(/\\\[/g, '');
    result = result.replace(/\\\]/g, '');
    result = result.replace(/\$(.*?)\$/g, '$1');

    // Remove \left and \right
    result = result.replace(/\\left(?![a-zA-Z])/g, '');
    result = result.replace(/\\right(?![a-zA-Z])/g, '');

    // \frac{a}{b} → a/b
    result = this.#replaceFractions(result);

    // \binom{n}{k} → C(n,k)
    result = this.#replaceBinomials(result);

    // \sqrt{x} → √(x)
    result = replaceCommand(result, 'sqrt', content => `√(${content})`);

    // \text{...} and \mathrm{...} → content
    result = replaceCommand(result, 'text', content => content);
    result = replaceCommand(result, 'mathrm', content => content);
    result = replaceCommand(result, 'mathbf', content => content);
    result = replaceCommand(result, 'mathit', content => content);
    result = replaceCommand(result, 'mathcal', content => content);
    result = replaceCommand(result, 'mathbb', content => content);

    // Protect math braces: \{ → placeholder, \} → placeholder
    result = result.replace(/\\\{/g, '\uFF5B');
    result = result.replace(/\\\}/g, '\uFF5D');

    // Thousand separator: {,} → ,
    result = result.replace(/\{,\}/g, ',');

    // Superscripts and subscripts BEFORE symbol replacement
    // so that \omega_i, \sum_{k=0}, \log_2 etc. work correctly
    result = this.#convertSuperscripts(result);
    result = this.#convertSubscripts(result);

    // Greek letters BEFORE named functions
    // (prevents \alpha\log from becoming \alphalog)
    for (const [cmd, symbol] of Object.entries(GREEK)) {
      result = result.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g'), symbol);
    }

    // Named functions: \lim → lim, \log → log, etc.
    for (const fn of NAMED_FUNCTIONS) {
      result = result.replace(new RegExp(`\\\\${fn}(?![a-zA-Z])`, 'g'), fn);
    }

    // Operators and symbols
    for (const [cmd, symbol] of Object.entries(OPERATORS)) {
      result = result.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g'), symbol);
    }

    // Spacing commands
    for (const [cmd, space] of Object.entries(SPACING)) {
      result = result.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g'), space);
    }
    result = result.replace(/\\[;,:!]/g, ' ');

    // Remove remaining grouping braces
    result = this.#removeGroupingBraces(result);

    // Restore math braces
    result = result.replace(/\uFF5B/g, '{');
    result = result.replace(/\uFF5D/g, '}');

    // Insert space between Greek letter and multi-letter Latin word
    result = result.replace(/([\u0370-\u03FF])([a-zA-Z]{2,})/g, '$1 $2');

    return result;
  }

  #replaceFractions(str) {
    let result = str;
    const search = '\\frac{';
    let idx;
    while ((idx = result.indexOf(search)) !== -1) {
      const numStart = idx + search.length - 1;
      const { content: numerator, endIdx: afterNum } = extractBraceContent(result, numStart);
      if (result[afterNum] !== '{') break;
      const { content: denominator, endIdx: afterDen } = extractBraceContent(result, afterNum);
      const frac = `(${numerator})/(${denominator})`;
      result = result.slice(0, idx) + frac + result.slice(afterDen);
    }
    return result;
  }

  #replaceBinomials(str) {
    let result = str;
    const search = '\\binom{';
    let idx;
    while ((idx = result.indexOf(search)) !== -1) {
      const nStart = idx + search.length - 1;
      const { content: n, endIdx: afterN } = extractBraceContent(result, nStart);
      if (result[afterN] !== '{') break;
      const { content: k, endIdx: afterK } = extractBraceContent(result, afterN);
      result = result.slice(0, idx) + `C(${n},${k})` + result.slice(afterK);
    }
    return result;
  }

  #convertSuperscripts(str) {
    let result = str;

    // ^{content} — braced superscript
    let idx;
    while ((idx = result.indexOf('^{')) !== -1) {
      const { content, endIdx } = extractBraceContent(result, idx + 1);
      const converted = this.#toSuperscript(content);
      result = result.slice(0, idx) + converted + result.slice(endIdx);
    }

    // ^x — single character superscript
    result = result.replace(/\^([a-zA-Z0-9*+\-])/g, (_, ch) => {
      return SUPERSCRIPT_MAP[ch] || `^${ch}`;
    });

    return result;
  }

  #convertSubscripts(str) {
    let result = str;

    // _{content} — braced subscript
    let idx;
    while ((idx = result.indexOf('_{')) !== -1) {
      const { content, endIdx } = extractBraceContent(result, idx + 1);
      const converted = this.#toSubscript(content);
      result = result.slice(0, idx) + converted + result.slice(endIdx);
    }

    // _x — single character subscript (skip filenames like figure_1.png)
    result = result.replace(/_([a-zA-Z0-9])(?!\.[a-zA-Z])/g, (_, ch) => {
      return SUBSCRIPT_MAP[ch] || `_${ch}`;
    });

    return result;
  }

  #toSuperscript(content) {
    const allMapped = [...content].every(ch => ch in SUPERSCRIPT_MAP);
    if (allMapped && content.length > 0) {
      return [...content].map(ch => SUPERSCRIPT_MAP[ch]).join('');
    }
    return `^(${content})`;
  }

  #toSubscript(content) {
    const allMapped = [...content].every(ch => ch in SUBSCRIPT_MAP);
    if (allMapped && content.length > 0) {
      return [...content].map(ch => SUBSCRIPT_MAP[ch]).join('');
    }
    return `_(${content})`;
  }

  #removeGroupingBraces(str) {
    let result = str;
    let changed = true;
    while (changed) {
      const before = result;
      result = result.replace(/\{([^{}]*)\}/g, '$1');
      changed = result !== before;
    }
    return result;
  }
}
