import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { StripComments } from '../StripComments.js';
import { StripPreamble } from '../StripPreamble.js';
import { StripLibraries } from '../StripLibraries.js';
import { StripLabels } from '../StripLabels.js';
import { StripBibliography } from '../StripBibliography.js';
import { StripIllustrations } from '../StripIllustrations.js';
import { ConvertTables } from '../ConvertTables.js';
import { StripEnvironments } from '../StripEnvironments.js';
import { StripSections } from '../StripSections.js';
import { StripSubSections } from '../StripSubSections.js';
import { StripFormatting } from '../StripFormatting.js';
import { ToTxtUnicodeMath } from '../ToTxtUnicodeMath.js';
import { LatexConverterManager } from '../LatexConverterManager.js';
import { writeFile, readFile, unlink, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SAMPLE_LATEX = `\\documentclass[12pt]{article}
\\usepackage{amsmath}
\\usepackage[utf8]{inputenc}

\\geometry{margin=1in}
\\newtheorem{theorem}{Theorem}

\\title{A Sample Paper}
\\author{Alice\\thanks{MIT} \\and Bob}
\\date{2024}

\\begin{document}
\\maketitle

% This is a comment
\\section{Introduction}
\\label{sec:intro}

This is the introduction. See~\\ref{sec:methods} and \\cite{knuth}.
We need 100\\% accuracy.

\\subsection{Background}

Some \\textbf{bold} and \\textit{italic} text---with an em dash.

\\begin{theorem}[Euler]
The identity $e^{i\\pi} + 1 = 0$ holds.
\\end{theorem}

\\begin{proof}
By direct computation.
\\end{proof}

\\begin{figure}
\\includegraphics[width=0.8\\textwidth]{euler.png}
\\caption{Euler's identity visualized}
\\end{figure}

\\begin{tabular}{lcc}
\\toprule
Name & Score & Grade\\\\
\\midrule
Alice & 95 & A\\\\
Bob & 80 & B\\\\
\\bottomrule
\\end{tabular}

\\begin{itemize}
\\item First item
\\item Second item
\\end{itemize}

\\noindent
Visit \\url{https://example.com} for more.

\\begin{thebibliography}{99}
\\bibitem{knuth} Knuth, D. The Art of Computer Programming.
\\end{thebibliography}

\\end{document}
`;

describe('Full pipeline integration', () => {
  const pipeline = [
    new StripComments('none'),
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
  ];

  function runPipeline(input) {
    let output = input;
    for (const converter of pipeline) {
      output = converter.convert(output);
    }
    return output;
  }

  it('removes all LaTeX commands and environments', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(!result.includes('\\documentclass'));
    assert.ok(!result.includes('\\usepackage'));
    assert.ok(!result.includes('\\begin{'));
    assert.ok(!result.includes('\\end{'));
    assert.ok(!result.includes('\\section'));
    assert.ok(!result.includes('\\subsection'));
    assert.ok(!result.includes('\\textbf'));
    assert.ok(!result.includes('\\textit'));
    assert.ok(!result.includes('\\label'));
    assert.ok(!result.includes('\\ref'));
    assert.ok(!result.includes('\\cite'));
    assert.ok(!result.includes('\\maketitle'));
    assert.ok(!result.includes('\\noindent'));
  });

  it('preserves meaningful text content', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(result.includes('A Sample Paper'));
    assert.ok(result.includes('Introduction'));
    assert.ok(result.includes('Background'));
    assert.ok(result.includes('This is the introduction'));
    assert.ok(result.includes('bold'));
    assert.ok(result.includes('italic'));
    assert.ok(result.includes('100%'));
  });

  it('converts theorem-like environments to labeled text', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(result.includes('Theorem (Euler):'));
    assert.ok(result.includes('Proof:'));
  });

  it('converts figures to image placeholders', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(result.includes('[Image: euler.png]'));
    assert.ok(result.includes("Euler's identity visualized"));
  });

  it('converts tables to markdown format', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(result.includes('Name'));
    assert.ok(result.includes('Score'));
    assert.ok(result.includes('Alice'));
    assert.ok(result.includes('|'));
  });

  it('converts itemize to bullet points', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(/- +First item/.test(result));
    assert.ok(/- +Second item/.test(result));
  });

  it('strips bibliography', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(!result.includes('Knuth'));
    assert.ok(!result.includes('bibitem'));
  });

  it('strips comments', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(!result.includes('This is a comment'));
  });

  it('preserves URLs from \\url commands', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(result.includes('https://example.com'));
  });

  it('converts dashes correctly', () => {
    const result = runPipeline(SAMPLE_LATEX);
    assert.ok(result.includes('\u2014'));  // em dash
  });

  it('writes output via LatexConverterManager', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'integ-'));
    const src = join(dir, 'test.tex');
    const tgt = join(dir, 'test.txt');

    await writeFile(src, SAMPLE_LATEX);

    const mgr = new LatexConverterManager(pipeline);
    await mgr.run(src, tgt);

    const result = await readFile(tgt, 'utf-8');
    assert.ok(result.includes('A Sample Paper'));
    assert.ok(!result.includes('\\documentclass'));

    await unlink(src);
    await unlink(tgt);
  });
});
