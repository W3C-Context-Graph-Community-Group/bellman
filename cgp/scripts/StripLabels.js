import { replaceCommand } from './utils.js';

export class StripLabels {
  convert(latex) {
    let result = latex;

    // Strip \label{...} entirely
    result = replaceCommand(result, 'label', '');

    // Strip \ref{...} entirely
    result = replaceCommand(result, 'ref', '');

    // Strip \cite{...} entirely
    result = replaceCommand(result, 'cite', '');

    // Convert \url{content} → content (keep the URL text)
    result = replaceCommand(result, 'url', content => content);

    // Strip \hyperref[...]{content} → content
    result = result.replace(/\\hyperref\[[^\]]*\]/g, '');

    return result;
  }
}
