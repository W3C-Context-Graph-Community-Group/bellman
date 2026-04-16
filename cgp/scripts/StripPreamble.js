import { replaceCommand } from './utils.js';

export class StripPreamble {
  convert(latex) {
    let result = latex;

    // Strip \geometry{...}
    result = replaceCommand(result, 'geometry', '');

    // Strip \newtheorem{...}{...} and \newtheorem{...}[...]{...}
    result = result.replace(/\\newtheorem\{[^}]*\}(\[[^\]]*\])?\{[^}]*\}/g, '');

    // Convert \title{content} → content on its own line
    result = replaceCommand(result, 'title', content => content);

    // Convert \author{content} → content, stripping \thanks{} and \and
    result = replaceCommand(result, 'author', content => {
      let author = content;
      author = author.replace(/\\thanks\{[^}]*\}/g, '');
      author = author.replace(/\\and/g, ',');
      return author.replace(/\s+/g, ' ').trim();
    });

    // Convert \date{content} → content
    result = replaceCommand(result, 'date', content => content);

    // Strip \maketitle
    result = result.replace(/\\maketitle/g, '');

    return result;
  }
}
