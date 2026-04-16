import { replaceEnvironment, replaceCommand } from './utils.js';

export class StripIllustrations {
  convert(latex) {
    return replaceEnvironment(latex, 'figure', (content) => {
      const parts = [];

      // Extract image filename from \includegraphics[...]{filename}
      const imgMatch = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
      if (imgMatch) {
        parts.push(`[Image: ${imgMatch[1]}]`);
      }

      // Extract caption text
      const captionMatch = content.match(/\\caption\{/);
      if (captionMatch) {
        const captionStart = content.indexOf('\\caption{') + '\\caption{'.length - 1;
        let depth = 1;
        let i = captionStart + 1;
        while (i < content.length && depth > 0) {
          if (content[i] === '{' && content[i - 1] !== '\\') depth++;
          else if (content[i] === '}' && content[i - 1] !== '\\') depth--;
          i++;
        }
        parts.push(content.slice(captionStart + 1, i - 1));
      }

      return parts.join('\n');
    });
  }
}
