import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripLibraries } from '../StripLibraries.js';

const strip = new StripLibraries();

describe('StripLibraries', () => {
  it('strips \\documentclass{article}', () => {
    assert.equal(strip.convert('\\documentclass{article}'), '');
  });

  it('strips \\documentclass with options', () => {
    assert.equal(strip.convert('\\documentclass[12pt,a4paper]{article}'), '');
  });

  it('strips \\usepackage{amsmath}', () => {
    assert.equal(strip.convert('\\usepackage{amsmath}'), '');
  });

  it('strips \\usepackage with options', () => {
    assert.equal(strip.convert('\\usepackage[utf8]{inputenc}'), '');
  });

  it('strips \\RequirePackage{...}', () => {
    assert.equal(strip.convert('\\RequirePackage{etoolbox}'), '');
  });

  it('strips \\RequirePackage with options', () => {
    assert.equal(strip.convert('\\RequirePackage[final]{graphicx}'), '');
  });

  it('strips multiple package declarations', () => {
    const input = '\\usepackage{amsmath}\n\\usepackage[T1]{fontenc}\n\\usepackage{graphicx}';
    const result = strip.convert(input);
    assert.ok(!result.includes('usepackage'));
  });

  it('preserves non-library content', () => {
    const input = '\\usepackage{amsmath}\nHello world';
    assert.ok(strip.convert(input).includes('Hello world'));
  });
});
