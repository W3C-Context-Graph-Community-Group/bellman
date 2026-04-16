#!/usr/bin/env node

import { LatexConverterManager } from './LatexConverterManager.js';
import { StripComments } from './StripComments.js';
import { StripPreamble } from './StripPreamble.js';
import { StripLibraries } from './StripLibraries.js';
import { StripLabels } from './StripLabels.js';
import { StripBibliography } from './StripBibliography.js';
import { StripIllustrations } from './StripIllustrations.js';
import { ConvertTables } from './ConvertTables.js';
import { StripEnvironments } from './StripEnvironments.js';
import { StripSections } from './StripSections.js';
import { StripSubSections } from './StripSubSections.js';
import { StripFormatting } from './StripFormatting.js';
import { ToTxtUnicodeMath } from './ToTxtUnicodeMath.js';

const args = process.argv.slice(2);

const HELP = `
Usage: node convert_latex_to_txt_unicode_math_symbols.js <source-file> <target-file> [options]

Arguments:
  source-file              Path to the input LaTeX (.tex) file
  target-file              Path to the output text file

Options:
  --help                   Show this help message
  --comments <mode>        How to handle LaTeX comments (default: none)
                             none    Remove all comments entirely
                             text    Strip the % prefix, keep the text content
                             <regex> Keep comments matching the pattern (as plain text),
                                     remove the rest

Examples:
  node convert_latex_to_txt_unicode_math_symbols.js paper.tex paper.txt
  node convert_latex_to_txt_unicode_math_symbols.js paper.tex paper.txt --comments text
  node convert_latex_to_txt_unicode_math_symbols.js paper.tex paper.txt --comments "References|TODO"
`;

if (args.includes('--help')) {
  console.log(HELP.trim());
  process.exit(0);
}

if (args.length < 2) {
  console.error('Usage: node convert_latex_to_txt_unicode_math_symbols.js <source-file> <target-file> [options]');
  console.error('Run with --help for full options.');
  process.exit(1);
}

const [sourceFile, targetFile] = args;

let commentsMode = 'none';
const commentsIdx = args.indexOf('--comments');
if (commentsIdx !== -1 && args[commentsIdx + 1]) {
  commentsMode = args[commentsIdx + 1];
}

const manager = new LatexConverterManager([
  new StripComments(commentsMode),
  new StripPreamble(),
  new StripLibraries(),
  new StripLabels(),
  new StripBibliography(),
  new StripIllustrations(),
  new ConvertTables(),
  new StripEnvironments(),
  new StripSections(),
  new StripSubSections(),
  new StripFormatting(),
  new ToTxtUnicodeMath(),
]);

await manager.run(sourceFile, targetFile);
