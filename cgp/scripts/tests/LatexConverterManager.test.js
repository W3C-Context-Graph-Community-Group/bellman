import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { LatexConverterManager } from '../LatexConverterManager.js';
import { writeFile, readFile, unlink, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('LatexConverterManager', () => {
  it('accepts a single converter', () => {
    const mgr = new LatexConverterManager({ convert: s => s.toUpperCase() });
    assert.equal(mgr.converters.length, 1);
  });

  it('accepts an array of converters', () => {
    const mgr = new LatexConverterManager([
      { convert: s => s + '1' },
      { convert: s => s + '2' },
    ]);
    assert.equal(mgr.converters.length, 2);
  });

  it('runs converters in pipeline order', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lcm-'));
    const src = join(dir, 'in.tex');
    const tgt = join(dir, 'out.txt');

    await writeFile(src, 'hello');

    const mgr = new LatexConverterManager([
      { convert: s => s.toUpperCase() },
      { convert: s => s + ' WORLD' },
    ]);

    await mgr.run(src, tgt);

    const result = (await readFile(tgt, 'utf-8')).trim();
    assert.equal(result, 'HELLO WORLD');

    await unlink(src);
    await unlink(tgt);
  });
});
