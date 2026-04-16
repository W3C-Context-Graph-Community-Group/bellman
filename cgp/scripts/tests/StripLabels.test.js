import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripLabels } from '../StripLabels.js';

const strip = new StripLabels();

describe('StripLabels', () => {
  it('strips \\label{...}', () => {
    assert.equal(strip.convert('\\label{eq:euler}'), '');
  });

  it('strips \\ref{...}', () => {
    assert.equal(strip.convert('see \\ref{eq:euler}'), 'see ');
  });

  it('strips \\cite{...}', () => {
    assert.equal(strip.convert('as shown \\cite{knuth}'), 'as shown ');
  });

  it('converts \\url{...} to plain text', () => {
    assert.equal(strip.convert('\\url{https://example.com}'), 'https://example.com');
  });

  it('strips \\hyperref[...] keeping content', () => {
    const result = strip.convert('\\hyperref[sec:intro]{Introduction}');
    assert.ok(result.includes('{Introduction}'));
    assert.ok(!result.includes('\\hyperref'));
    assert.ok(!result.includes('[sec:intro]'));
  });

  it('handles multiple labels in one line', () => {
    const result = strip.convert('\\label{a} text \\label{b}');
    assert.equal(result, ' text ');
  });
});
