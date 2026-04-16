export class StripComments {
  constructor(mode = 'none') {
    this.mode = mode;
  }

  convert(latex) {
    return latex.split('\n').map(line => {
      const commentIdx = this.#findComment(line);
      if (commentIdx === -1) return line;

      if (commentIdx === 0) {
        return this.#handleComment(line.slice(1).trim());
      }

      const before = line.slice(0, commentIdx).trimEnd();
      const commentText = line.slice(commentIdx + 1).trim();

      if (this.mode === 'none') return before;

      const kept = this.#handleComment(commentText);
      return kept !== null ? `${before} ${kept}` : before;
    }).filter(line => line !== null).join('\n');
  }

  #findComment(line) {
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) {
        return i;
      }
    }
    return -1;
  }

  #handleComment(text) {
    if (this.mode === 'none') return null;

    if (this.mode === 'text') {
      if (/^[=\-*~\s]*$/.test(text)) return null;
      return text;
    }

    try {
      const regex = new RegExp(this.mode);
      return regex.test(text) ? text : null;
    } catch {
      return null;
    }
  }
}
