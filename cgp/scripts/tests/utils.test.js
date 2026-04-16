import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractBraceContent, replaceCommand, replaceEnvironment } from '../utils.js';

describe('extractBraceContent', () => {
  it('extracts simple brace content', () => {
    const { content, endIdx } = extractBraceContent('{hello}', 0);
    assert.equal(content, 'hello');
    assert.equal(endIdx, 7);
  });

  it('handles nested braces', () => {
    const { content } = extractBraceContent('{outer {inner} end}', 0);
    assert.equal(content, 'outer {inner} end');
  });

  it('handles deeply nested braces', () => {
    const { content } = extractBraceContent('{a {b {c} d} e}', 0);
    assert.equal(content, 'a {b {c} d} e');
  });

  it('ignores escaped braces', () => {
    const { content } = extractBraceContent('{hello \\} world}', 0);
    assert.equal(content, 'hello \\} world');
  });

  it('starts from given openIdx', () => {
    const { content } = extractBraceContent('prefix{value}', 6);
    assert.equal(content, 'value');
  });

  it('handles empty braces', () => {
    const { content } = extractBraceContent('{}', 0);
    assert.equal(content, '');
  });
});

describe('replaceCommand', () => {
  it('replaces a command with empty string (removes entirely)', () => {
    assert.equal(replaceCommand('\\textbf{bold}', 'textbf', ''), '');
  });

  it('replaces a command using a function replacer', () => {
    const result = replaceCommand('\\title{My Paper}', 'title', c => `TITLE: ${c}`);
    assert.equal(result, 'TITLE: My Paper');
  });

  it('removes a command entirely with empty string', () => {
    const result = replaceCommand('before \\label{eq1} after', 'label', '');
    assert.equal(result, 'before  after');
  });

  it('replaces multiple occurrences', () => {
    const result = replaceCommand('\\textbf{a} and \\textbf{b}', 'textbf', c => c);
    assert.equal(result, 'a and b');
  });

  it('handles nested braces in command argument', () => {
    const result = replaceCommand('\\textbf{a {nested} b}', 'textbf', c => c);
    assert.equal(result, 'a {nested} b');
  });

  it('leaves unmatched commands alone', () => {
    const input = '\\other{value}';
    assert.equal(replaceCommand(input, 'textbf', ''), input);
  });
});

describe('replaceEnvironment', () => {
  it('replaces a simple environment', () => {
    const input = '\\begin{abstract}Hello world\\end{abstract}';
    const result = replaceEnvironment(input, 'abstract', c => `ABS: ${c}`);
    assert.equal(result, 'ABS: Hello world');
  });

  it('removes an environment entirely', () => {
    const input = 'before\\begin{figure}img\\end{figure}after';
    assert.equal(replaceEnvironment(input, 'figure', ''), 'beforeafter');
  });

  it('extracts optional argument', () => {
    const input = '\\begin{theorem}[Euler]The theorem.\\end{theorem}';
    const result = replaceEnvironment(input, 'theorem', (content, opt) => `${opt}: ${content}`);
    assert.equal(result, 'Euler: The theorem.');
  });

  it('handles environment without optional argument', () => {
    const input = '\\begin{proof}QED\\end{proof}';
    const result = replaceEnvironment(input, 'proof', (content, opt) => `${opt || 'none'}: ${content}`);
    assert.equal(result, 'none: QED');
  });

  it('replaces multiple environments of the same type', () => {
    const input = '\\begin{theorem}A\\end{theorem} \\begin{theorem}B\\end{theorem}';
    const result = replaceEnvironment(input, 'theorem', c => c.trim());
    assert.equal(result, 'A B');
  });

  it('handles missing end tag gracefully', () => {
    const input = '\\begin{broken}no end';
    const result = replaceEnvironment(input, 'broken', '');
    assert.equal(result, input);
  });
});
