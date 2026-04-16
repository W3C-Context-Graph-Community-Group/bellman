import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { ConvertTables } from '../ConvertTables.js';

const convert = new ConvertTables();

describe('ConvertTables', () => {
  it('converts a simple tabular to markdown', () => {
    const input = `\\begin{tabular}{lcc}
\\toprule
Name & Score & Grade\\\\
\\midrule
Alice & 95 & A\\\\
Bob & 80 & B\\\\
\\bottomrule
\\end{tabular}`;
    const result = convert.convert(input);
    assert.ok(result.includes('| Name | Score | Grade |'));
    assert.ok(result.includes('| --- | --- | --- |'));
    assert.ok(result.includes('| Alice | 95 | A |'));
    assert.ok(result.includes('| Bob | 80 | B |'));
  });

  it('strips \\begin{tabular} and \\end{tabular}', () => {
    const input = `\\begin{tabular}{l}
A\\\\
\\end{tabular}`;
    const result = convert.convert(input);
    assert.ok(!result.includes('\\begin'));
    assert.ok(!result.includes('\\end'));
  });

  it('handles tabular without booktabs rules', () => {
    const input = `\\begin{tabular}{ll}
X & Y\\\\
1 & 2\\\\
\\end{tabular}`;
    const result = convert.convert(input);
    assert.ok(result.includes('| X | Y |'));
    assert.ok(result.includes('| 1 | 2 |'));
  });

  it('preserves surrounding text', () => {
    const input = `before\\begin{tabular}{l}
A\\\\
\\end{tabular}after`;
    const result = convert.convert(input);
    assert.ok(result.startsWith('before'));
    assert.ok(result.endsWith('after'));
  });

  it('handles multiple tables', () => {
    const input = `\\begin{tabular}{l}
A\\\\
\\end{tabular}
\\begin{tabular}{l}
B\\\\
\\end{tabular}`;
    const result = convert.convert(input);
    assert.ok(result.includes('| A |'));
    assert.ok(result.includes('| B |'));
  });
});
