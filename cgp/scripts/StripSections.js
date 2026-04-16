import { replaceCommand } from './utils.js';

export class StripSections {
  convert(latex) {
    let result = latex;

    // \section*{content} → content
    result = result.replace(/\\section\*\{/g, '\\section{');

    // \section{content} → content
    result = replaceCommand(result, 'section', content => content);

    return result;
  }
}
