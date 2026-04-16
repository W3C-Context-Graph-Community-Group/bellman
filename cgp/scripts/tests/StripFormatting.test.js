import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripFormatting } from '../StripFormatting.js';

const strip = new StripFormatting();

describe('StripFormatting — special characters', () => {
  it('unescapes \\%', () => {
    assert.equal(strip.convert('100\\% done'), '100% done');
  });

  it('unescapes \\$', () => {
    assert.equal(strip.convert('\\$10'), '$10');
  });

  it('unescapes \\#', () => {
    assert.equal(strip.convert('item \\#1'), 'item #1');
  });

  it('unescapes \\&', () => {
    assert.equal(strip.convert('A \\& B'), 'A & B');
  });

  it('unescapes \\_', () => {
    assert.equal(strip.convert('var\\_name'), 'var_name');
  });
});

describe('StripFormatting — formatting commands', () => {
  it('strips \\textbf{...}', () => {
    assert.equal(strip.convert('\\textbf{bold}'), 'bold');
  });

  it('strips \\textit{...}', () => {
    assert.equal(strip.convert('\\textit{italic}'), 'italic');
  });

  it('strips \\emph{...}', () => {
    assert.equal(strip.convert('\\emph{emphasis}'), 'emphasis');
  });

  it('strips \\texttt{...}', () => {
    assert.equal(strip.convert('\\texttt{code}'), 'code');
  });

  it('strips \\textrm{...}', () => {
    assert.equal(strip.convert('\\textrm{roman}'), 'roman');
  });

  it('strips \\textsf{...}', () => {
    assert.equal(strip.convert('\\textsf{sans}'), 'sans');
  });

  it('strips \\textsc{...}', () => {
    assert.equal(strip.convert('\\textsc{small caps}'), 'small caps');
  });

  it('handles nested formatting', () => {
    assert.equal(strip.convert('\\textbf{\\textit{both}}'), 'both');
  });
});

describe('StripFormatting — standalone commands', () => {
  it('strips \\noindent', () => {
    assert.equal(strip.convert('\\noindent Text'), ' Text');
  });

  it('strips \\medskip', () => {
    assert.ok(!strip.convert('\\medskip').includes('medskip'));
  });

  it('strips \\bigskip', () => {
    assert.ok(!strip.convert('\\bigskip').includes('bigskip'));
  });

  it('strips \\smallskip', () => {
    assert.ok(!strip.convert('\\smallskip').includes('smallskip'));
  });

  it('strips \\centering', () => {
    assert.ok(!strip.convert('\\centering').includes('centering'));
  });

  it('strips \\newpage', () => {
    assert.ok(!strip.convert('\\newpage').includes('newpage'));
  });

  it('strips \\clearpage', () => {
    assert.ok(!strip.convert('\\clearpage').includes('clearpage'));
  });

  it('strips \\hfill', () => {
    assert.ok(!strip.convert('\\hfill').includes('hfill'));
  });
});

describe('StripFormatting — whitespace and dashes', () => {
  it('converts \\\\ to newline', () => {
    assert.equal(strip.convert('line1\\\\line2'), 'line1\nline2');
  });

  it('converts ~ to space', () => {
    assert.equal(strip.convert('Fig.~1'), 'Fig. 1');
  });

  it('converts "\\ " to space', () => {
    assert.equal(strip.convert('Dr.\\ Smith'), 'Dr. Smith');
  });

  it('converts --- to em dash', () => {
    assert.equal(strip.convert('a---b'), 'a\u2014b');
  });

  it('converts -- to en dash', () => {
    assert.equal(strip.convert('1--10'), '1\u201310');
  });
});
