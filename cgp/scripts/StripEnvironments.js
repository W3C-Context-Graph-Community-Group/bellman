import { replaceEnvironment } from './utils.js';

const THEOREM_LIKE = ['theorem', 'corollary', 'definition', 'lemma', 'proposition'];

export class StripEnvironments {
  convert(latex) {
    let result = latex;

    // Theorem-like environments → "Theorem (title):" + content
    for (const env of THEOREM_LIKE) {
      const label = env.charAt(0).toUpperCase() + env.slice(1);
      result = replaceEnvironment(result, env, (content, optArg) => {
        const heading = optArg ? `${label} (${optArg}):` : `${label}:`;
        return `${heading}\n${content}`;
      });
    }

    // Proof → "Proof:" + content
    result = replaceEnvironment(result, 'proof', (content) => {
      return `Proof:\n${content}`;
    });

    // Abstract → "Abstract:" + content
    result = replaceEnvironment(result, 'abstract', (content) => {
      return `Abstract:\n${content}`;
    });

    // Structural environments — just keep content
    const structural = ['document', 'enumerate', 'itemize', 'center', 'cases'];
    for (const env of structural) {
      result = replaceEnvironment(result, env, (content) => content);
    }

    // \item → "- "
    result = result.replace(/\\item\b/g, '- ');

    return result;
  }
}
