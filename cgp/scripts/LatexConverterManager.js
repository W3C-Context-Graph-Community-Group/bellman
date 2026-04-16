import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export class LatexConverterManager {
  constructor(converters) {
    this.converters = Array.isArray(converters) ? converters : [converters];
  }

  async run(sourceFile, targetFile) {
    const srcPath = resolve(sourceFile);
    const tgtPath = resolve(targetFile);

    const input = await readFile(srcPath, 'utf-8');

    let output = input;
    for (const converter of this.converters) {
      output = converter.convert(output);
    }

    // Collapse 3+ consecutive blank lines into 2
    output = output.replace(/\n{3,}/g, '\n\n');
    // Trim leading/trailing whitespace
    output = output.trim() + '\n';

    await writeFile(tgtPath, output, 'utf-8');
    console.log(`Converted: ${srcPath} -> ${tgtPath}`);
  }
}
