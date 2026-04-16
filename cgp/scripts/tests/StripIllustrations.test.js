import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripIllustrations } from '../StripIllustrations.js';

const strip = new StripIllustrations();

describe('StripIllustrations', () => {
  it('extracts image filename and caption', () => {
    const input = `\\begin{figure}
\\includegraphics[width=0.5\\textwidth]{diagram.png}
\\caption{A diagram}
\\end{figure}`;
    const result = strip.convert(input);
    assert.ok(result.includes('[Image: diagram.png]'));
    assert.ok(result.includes('A diagram'));
  });

  it('handles figure with only image, no caption', () => {
    const input = `\\begin{figure}
\\includegraphics{photo.jpg}
\\end{figure}`;
    const result = strip.convert(input);
    assert.ok(result.includes('[Image: photo.jpg]'));
  });

  it('handles figure with only caption, no image', () => {
    const input = `\\begin{figure}
\\caption{Caption only}
\\end{figure}`;
    const result = strip.convert(input);
    assert.ok(!result.includes('[Image:'));
    assert.ok(result.includes('Caption only'));
  });

  it('handles caption with nested braces', () => {
    const input = `\\begin{figure}
\\caption{A graph of \\textbf{f(x)}}
\\end{figure}`;
    const result = strip.convert(input);
    assert.ok(result.includes('A graph of \\textbf{f(x)}'));
  });

  it('removes figure environment wrapper', () => {
    const input = `before\\begin{figure}
\\includegraphics{img.png}
\\end{figure}after`;
    const result = strip.convert(input);
    assert.ok(!result.includes('\\begin{figure}'));
    assert.ok(!result.includes('\\end{figure}'));
    assert.ok(result.startsWith('before'));
    assert.ok(result.endsWith('after'));
  });
});
