import { replaceCommand } from './utils.js';

export class StripSubSections {
  convert(latex) {
    let result = latex;

    // \subsection*{content} → content
    result = result.replace(/\\subsection\*\{/g, '\\subsection{');

    // \subsection{content} → content
    result = replaceCommand(result, 'subsection', content => content);

    return result;
  }
}
