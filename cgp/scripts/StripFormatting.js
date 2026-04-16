import { replaceCommand } from './utils.js';

export class StripFormatting {
  convert(latex) {
    let result = latex;

    // Unescape LaTeX special characters first
    result = result.replace(/\\%/g, '%');
    result = result.replace(/\\\$/g, '$');
    result = result.replace(/\\#/g, '#');
    result = result.replace(/\\&/g, '&');
    result = result.replace(/\\_/g, '_');

    // Strip standalone commands BEFORE formatting commands
    // so \noindent\textbf{} doesn't become \noindentContent
    result = result.replace(/\\noindent\b/g, '');
    result = result.replace(/\\medskip\b/g, '');
    result = result.replace(/\\bigskip\b/g, '');
    result = result.replace(/\\smallskip\b/g, '');
    result = result.replace(/\\centering\b/g, '');
    result = result.replace(/\\newpage\b/g, '');
    result = result.replace(/\\clearpage\b/g, '');
    result = result.replace(/\\pagebreak\b/g, '');
    result = result.replace(/\\hfill\b/g, '');

    // Strip formatting commands, keep content
    for (const cmd of ['textbf', 'textit', 'emph', 'texttt', 'textrm', 'textsf', 'textsc']) {
      result = replaceCommand(result, cmd, content => content);
    }

    // Line breaks: \\ → newline
    result = result.replace(/\\\\/g, '\n');

    // Non-breaking space: ~ → space
    result = result.replace(/~/g, ' ');

    // Explicit space: '\ ' → space
    result = result.replace(/\\ /g, ' ');

    // Em dash and en dash
    result = result.replace(/---/g, '\u2014');
    result = result.replace(/--/g, '\u2013');

    // LaTeX double quotes: `` → ", '' → "
    result = result.replace(/``/g, '"');
    result = result.replace(/''/g, '"');

    return result;
  }
}
