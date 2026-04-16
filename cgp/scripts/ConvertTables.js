import { extractBraceContent } from './utils.js';

export class ConvertTables {
  convert(latex) {
    let result = latex;
    const beginTag = '\\begin{tabular}';
    const endTag = '\\end{tabular}';

    let idx;
    while ((idx = result.indexOf(beginTag)) !== -1) {
      const afterBegin = idx + beginTag.length;

      // Skip column spec {colspec} which may contain nested braces
      let contentStart = afterBegin;
      if (result[contentStart] === '{') {
        const { endIdx } = extractBraceContent(result, contentStart);
        contentStart = endIdx;
      }

      const endIdx = result.indexOf(endTag, contentStart);
      if (endIdx === -1) break;

      const content = result.slice(contentStart, endIdx);
      const mdTable = this.#convertToMarkdown(content);

      result = result.slice(0, idx) + mdTable + result.slice(endIdx + endTag.length);
    }

    return result;
  }

  #convertToMarkdown(tabularContent) {
    const lines = tabularContent.split('\n').map(l => l.trim()).filter(Boolean);
    const rows = [];
    let addSeparatorNext = false;

    for (const line of lines) {
      if (/^\\toprule/.test(line) || /^\\bottomrule/.test(line)) continue;

      if (/^\\midrule/.test(line)) {
        addSeparatorNext = true;
        continue;
      }

      let rowText = line.replace(/\\\\$/, '').trim();
      if (!rowText) continue;

      const cells = rowText.split('&').map(c => c.trim());

      if (addSeparatorNext && rows.length > 0) {
        const colCount = rows[rows.length - 1].length;
        rows.push(Array(colCount).fill('---'));
        addSeparatorNext = false;
      }

      rows.push(cells);
    }

    return rows.map(row => '| ' + row.join(' | ') + ' |').join('\n');
  }
}
