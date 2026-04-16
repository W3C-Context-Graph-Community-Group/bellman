import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripBibliography } from '../StripBibliography.js';

const strip = new StripBibliography();

describe('StripBibliography', () => {
  it('strips thebibliography environment', () => {
    const input = 'text\\begin{thebibliography}{99}\n\\bibitem{k} Knuth\n\\end{thebibliography}end';
    assert.equal(strip.convert(input), 'textend');
  });

  it('returns input unchanged when no bibliography present', () => {
    const input = 'no bibliography here';
    assert.equal(strip.convert(input), input);
  });
});
