export class ResizerManager {
  constructor(container) {
    this.container = container;
    this.panels = [...container.querySelectorAll('[data-panel]')];
    this.resizers = [...container.querySelectorAll('[data-resizer]')];

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    this._activeResizer = null;
    this._startX = 0;
    this._leftWidth = 0;
    this._rightWidth = 0;
    this._leftPanel = null;
    this._rightPanel = null;

    for (const resizer of this.resizers) {
      resizer.addEventListener('pointerdown', this._onPointerDown);
    }
  }

  _onPointerDown(e) {
    const resizer = e.currentTarget;
    const index = this.resizers.indexOf(resizer);

    this._activeResizer = resizer;
    this._leftPanel = this.panels[index];
    this._rightPanel = this.panels[index + 1];
    this._startX = e.clientX;
    this._leftWidth = this._leftPanel.getBoundingClientRect().width;
    this._rightWidth = this._rightPanel.getBoundingClientRect().width;

    resizer.setPointerCapture(e.pointerId);
    resizer.classList.add('active');
    document.body.classList.add('resizing');

    resizer.addEventListener('pointermove', this._onPointerMove);
    resizer.addEventListener('pointerup', this._onPointerUp);
  }

  _onPointerMove(e) {
    const delta = e.clientX - this._startX;
    const minWidth = 100;

    let newLeft = this._leftWidth + delta;
    let newRight = this._rightWidth - delta;

    if (newLeft < minWidth) {
      newLeft = minWidth;
      newRight = this._leftWidth + this._rightWidth - minWidth;
    }

    if (newRight < minWidth) {
      newRight = minWidth;
      newLeft = this._leftWidth + this._rightWidth - minWidth;
    }

    this._leftPanel.style.flexBasis = newLeft + 'px';
    this._rightPanel.style.flexBasis = newRight + 'px';
  }

  _onPointerUp(e) {
    const resizer = this._activeResizer;
    resizer.releasePointerCapture(e.pointerId);
    resizer.classList.remove('active');
    document.body.classList.remove('resizing');

    resizer.removeEventListener('pointermove', this._onPointerMove);
    resizer.removeEventListener('pointerup', this._onPointerUp);

    this._activeResizer = null;
  }

  destroy() {
    for (const resizer of this.resizers) {
      resizer.removeEventListener('pointerdown', this._onPointerDown);
      resizer.removeEventListener('pointermove', this._onPointerMove);
      resizer.removeEventListener('pointerup', this._onPointerUp);
    }
  }
}
