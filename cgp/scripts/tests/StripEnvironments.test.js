import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripEnvironments } from '../StripEnvironments.js';

const strip = new StripEnvironments();

describe('StripEnvironments', () => {
  it('converts theorem environment with title', () => {
    const input = '\\begin{theorem}[Euler]The identity.\\end{theorem}';
    const result = strip.convert(input);
    assert.ok(result.includes('Theorem (Euler):'));
    assert.ok(result.includes('The identity.'));
  });

  it('converts theorem environment without title', () => {
    const input = '\\begin{theorem}Statement.\\end{theorem}';
    const result = strip.convert(input);
    assert.ok(result.includes('Theorem:'));
    assert.ok(result.includes('Statement.'));
  });

  it('converts corollary environment', () => {
    const input = '\\begin{corollary}A consequence.\\end{corollary}';
    const result = strip.convert(input);
    assert.ok(result.includes('Corollary:'));
  });

  it('converts definition environment', () => {
    const input = '\\begin{definition}A set is...\\end{definition}';
    const result = strip.convert(input);
    assert.ok(result.includes('Definition:'));
  });

  it('converts lemma environment', () => {
    const input = '\\begin{lemma}If x...\\end{lemma}';
    const result = strip.convert(input);
    assert.ok(result.includes('Lemma:'));
  });

  it('converts proposition environment', () => {
    const input = '\\begin{proposition}For all n...\\end{proposition}';
    const result = strip.convert(input);
    assert.ok(result.includes('Proposition:'));
  });

  it('converts proof environment', () => {
    const input = '\\begin{proof}By induction.\\end{proof}';
    const result = strip.convert(input);
    assert.ok(result.includes('Proof:'));
    assert.ok(result.includes('By induction.'));
  });

  it('converts abstract environment', () => {
    const input = '\\begin{abstract}This paper...\\end{abstract}';
    const result = strip.convert(input);
    assert.ok(result.includes('Abstract:'));
    assert.ok(result.includes('This paper...'));
  });

  it('unwraps document environment', () => {
    const input = '\\begin{document}Content\\end{document}';
    assert.ok(strip.convert(input).includes('Content'));
  });

  it('unwraps enumerate environment', () => {
    const input = '\\begin{enumerate}\\item A\\item B\\end{enumerate}';
    const result = strip.convert(input);
    assert.ok(/- +A/.test(result));
    assert.ok(/- +B/.test(result));
  });

  it('unwraps itemize environment', () => {
    const input = '\\begin{itemize}\\item X\\end{itemize}';
    const result = strip.convert(input);
    assert.ok(/- +X/.test(result));
  });

  it('unwraps center environment', () => {
    const input = '\\begin{center}centered\\end{center}';
    assert.ok(strip.convert(input).includes('centered'));
  });

  it('converts \\item to "- "', () => {
    assert.ok(/- +First/.test(strip.convert('\\item First')));
  });
});
