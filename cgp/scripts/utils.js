export function extractBraceContent(str, openIdx) {
  let depth = 1;
  let i = openIdx + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === '{' && str[i - 1] !== '\\') depth++;
    else if (str[i] === '}' && str[i - 1] !== '\\') depth--;
    i++;
  }
  return { content: str.slice(openIdx + 1, i - 1), endIdx: i };
}

export function replaceCommand(str, command, replacer) {
  let result = str;
  const search = '\\' + command + '{';
  let idx;
  while ((idx = result.indexOf(search)) !== -1) {
    const braceStart = idx + search.length - 1;
    const { content, endIdx } = extractBraceContent(result, braceStart);
    const replacement = typeof replacer === 'function' ? replacer(content) : replacer;
    result = result.slice(0, idx) + replacement + result.slice(endIdx);
  }
  return result;
}

export function replaceEnvironment(str, envName, replacer) {
  const beginTag = `\\begin{${envName}}`;
  const endTag = `\\end{${envName}}`;
  let result = str;
  let idx;
  while ((idx = result.indexOf(beginTag)) !== -1) {
    const endIdx = result.indexOf(endTag, idx);
    if (endIdx === -1) break;
    const fullEnd = endIdx + endTag.length;
    const afterBegin = idx + beginTag.length;

    let optArg = '';
    let contentStart = afterBegin;
    if (result[contentStart] === '[') {
      const closeBracket = result.indexOf(']', contentStart);
      if (closeBracket !== -1) {
        optArg = result.slice(contentStart + 1, closeBracket);
        contentStart = closeBracket + 1;
      }
    }

    const content = result.slice(contentStart, endIdx);
    const replacement = typeof replacer === 'function' ? replacer(content, optArg) : replacer;
    result = result.slice(0, idx) + replacement + result.slice(fullEnd);
  }
  return result;
}
