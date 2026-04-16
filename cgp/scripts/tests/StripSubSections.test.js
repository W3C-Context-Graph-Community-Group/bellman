import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripSubSections } from '../StripSubSections.js';

const strip = new StripSubSections();

describe('StripSubSections', () => {
  it('converts \\subsection{...} to plain text', () => {
    assert.equal(strip.convert('\\subsection{Details}'), 'Details');
  });

  it('converts \\subsection*{...} to plain text', () => {
    assert.equal(strip.convert('\\subsection*{Notes}'), 'Notes');
  });

  it('handles multiple subsections', () => {
    const input = '\\subsection{A}\ntext\n\\subsection{B}';
    const result = strip.convert(input);
    assert.ok(result.includes('A'));
    assert.ok(result.includes('B'));
    assert.ok(!result.includes('\\subsection'));
  });
});
