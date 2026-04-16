import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripComments } from '../StripComments.js';

describe('StripComments (mode: none)', () => {
  const strip = new StripComments('none');

  it('removes full-line comments', () => {
    assert.equal(strip.convert('% this is a comment'), null + '' === 'null' ? '' : '');
    const result = strip.convert('% this is a comment');
    // Full-line comments where mode=none return null, filtered out
    assert.ok(!result.includes('this is a comment'));
  });

  it('removes inline comments', () => {
    assert.equal(strip.convert('text % comment'), 'text');
  });

  it('preserves escaped percent signs', () => {
    assert.equal(strip.convert('100\\% done'), '100\\% done');
  });

  it('handles multiple lines', () => {
    const input = 'line1 % comment\n% full comment\nline3';
    const result = strip.convert(input);
    assert.ok(result.includes('line1'));
    assert.ok(result.includes('line3'));
    assert.ok(!result.includes('comment'));
  });

  it('handles lines with no comments', () => {
    assert.equal(strip.convert('no comment here'), 'no comment here');
  });
});

describe('StripComments (mode: text)', () => {
  const strip = new StripComments('text');

  it('keeps comment text without % prefix', () => {
    const result = strip.convert('% Important note');
    assert.ok(result.includes('Important note'));
  });

  it('strips decorative comment lines', () => {
    const result = strip.convert('% ========');
    assert.ok(!result.includes('========'));
  });

  it('strips dashes-only comment lines', () => {
    const result = strip.convert('% ------');
    assert.ok(!result.includes('------'));
  });

  it('appends comment text to code lines', () => {
    const result = strip.convert('code % note');
    assert.ok(result.includes('code'));
    assert.ok(result.includes('note'));
  });
});

describe('StripComments (mode: regex)', () => {
  const strip = new StripComments('TODO');

  it('keeps comments matching the regex', () => {
    const result = strip.convert('% TODO: fix this');
    assert.ok(result.includes('TODO: fix this'));
  });

  it('removes comments not matching the regex', () => {
    const result = strip.convert('% just a note');
    assert.ok(!result.includes('just a note'));
  });

  it('handles invalid regex gracefully', () => {
    const badStrip = new StripComments('[invalid');
    const result = badStrip.convert('% some comment');
    assert.ok(!result.includes('some comment'));
  });
});
