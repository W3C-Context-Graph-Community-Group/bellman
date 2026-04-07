/**
 * ModalManager — reusable full-screen modal.
 *
 * Usage:
 *   import { modalManager } from '/js/ModalManager.js';
 *
 *   // Open with HTML string
 *   modalManager.open('<h1>Hello</h1>');
 *
 *   // Open by fetching a markdown file (rendered via marked.js)
 *   modalManager.openMarkdown('/api/docs/null-uncertainty');
 *
 * A single modal DOM element is shared across the entire page.
 */

class ModalManager {
  constructor() {
    this._built = false;
    this._cache = new Map(); // url → rendered HTML
  }

  _ensureDOM() {
    if (this._built) return;
    this._built = true;

    this._overlay = document.createElement('div');
    this._overlay.className = 'docs-modal hidden';

    this._content = document.createElement('div');
    this._content.className = 'docs-modal-content';

    this._closeBtn = document.createElement('button');
    this._closeBtn.className = 'docs-modal-close';
    this._closeBtn.textContent = '\u2039 BACK';

    this._body = document.createElement('div');
    this._body.className = 'docs-modal-body';

    this._content.appendChild(this._closeBtn);
    this._content.appendChild(this._body);
    this._overlay.appendChild(this._content);
    document.body.appendChild(this._overlay);

    this._closeBtn.addEventListener('click', () => this.close());
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close();
    });
  }

  /** Open the modal with raw HTML content. */
  open(html) {
    this._ensureDOM();
    this._body.innerHTML = html;
    this._overlay.classList.remove('hidden');
  }

  /** Fetch a markdown URL, render it via marked.js, and display it. */
  async openMarkdown(url) {
    this._ensureDOM();
    this._overlay.classList.remove('hidden');

    if (this._cache.has(url)) {
      this._body.innerHTML = this._cache.get(url);
      return;
    }

    this._body.innerHTML = '<p style="color:#9ca3af">Loading…</p>';
    const res = await fetch(url);
    const md = await res.text();
    const html = marked.parse(md);
    this._cache.set(url, html);
    this._body.innerHTML = html;
  }

  close() {
    if (this._overlay) this._overlay.classList.add('hidden');
  }
}

export const modalManager = new ModalManager();
