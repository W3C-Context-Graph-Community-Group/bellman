import { replaceEnvironment } from './utils.js';

export class StripBibliography {
  convert(latex) {
    return replaceEnvironment(latex, 'thebibliography', '');
  }
}
