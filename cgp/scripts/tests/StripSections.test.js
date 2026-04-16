import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripSections } from '../StripSections.js';

const strip = new StripSections();

describe('StripSections', () => {
  it('converts \\section{...} to plain text', () => {
    assert.equal(strip.convert('\\section{Introduction}'), 'Introduction');
  });

  it('converts \\section*{...} to plain text', () => {
    assert.equal(strip.convert('\\section*{Appendix}'), 'Appendix');
  });

  it('handles multiple sections', () => {
    const input = '\\section{A}\ncontent\n\\section{B}';
    const result = strip.convert(input);
    assert.ok(result.includes('A'));
    assert.ok(result.includes('B'));
    assert.ok(!result.includes('\\section'));
  });

  it('preserves surrounding text', () => {
    const result = strip.convert('before \\section{Title} after');
    assert.equal(result, 'before Title after');
  });
});
