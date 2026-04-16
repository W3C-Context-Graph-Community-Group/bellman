export class StripLibraries {
  convert(latex) {
    let result = latex;

    // Strip \documentclass[...]{...} and \documentclass{...}
    result = result.replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/g, '');

    // Strip \usepackage[...]{...} and \usepackage{...}
    result = result.replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, '');

    // Strip \RequirePackage[...]{...} and \RequirePackage{...}
    result = result.replace(/\\RequirePackage(\[[^\]]*\])?\{[^}]*\}/g, '');

    return result;
  }
}
