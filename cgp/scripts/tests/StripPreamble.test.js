import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripPreamble } from '../StripPreamble.js';

const strip = new StripPreamble();

describe('StripPreamble', () => {
  it('strips \\geometry{...}', () => {
    const result = strip.convert('\\geometry{margin=1in}');
    assert.equal(result, '');
  });

  it('strips \\newtheorem{...}{...}', () => {
    const result = strip.convert('\\newtheorem{theorem}{Theorem}');
    assert.equal(result, '');
  });

  it('strips \\newtheorem with optional counter', () => {
    const result = strip.convert('\\newtheorem{corollary}[theorem]{Corollary}');
    assert.equal(result, '');
  });

  it('converts \\title{...} to plain text', () => {
    const result = strip.convert('\\title{My Paper}');
    assert.equal(result, 'My Paper');
  });

  it('converts \\author{...} to plain text', () => {
    const result = strip.convert('\\author{Alice \\and Bob}');
    assert.equal(result, 'Alice , Bob');
  });

  it('strips \\thanks{...} from author', () => {
    const result = strip.convert('\\author{Alice\\thanks{MIT}}');
    assert.equal(result, 'Alice');
  });

  it('converts \\date{...} to plain text', () => {
    const result = strip.convert('\\date{2024}');
    assert.equal(result, '2024');
  });

  it('strips \\maketitle', () => {
    const result = strip.convert('before\\maketitle after');
    assert.equal(result, 'before after');
  });
});
