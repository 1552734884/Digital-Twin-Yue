import { detailCameras } from '../config/detailCameras.js';

/**
 * 自动巡游：按镜头序列飞行；鼠标接管立即暂停并交还 OrbitControls
 */
export class AutoTour {
  /**
   * @param {object} opts
   * @param {import('./Selection.js').SelectionSystem} opts.selection
   * @param {HTMLCanvasElement} opts.canvas
   * @param {() => void} [opts.onChange]
   */
  constructor({ selection, canvas, onChange }) {
    this.selection = selection;
    this.canvas = canvas;
    this.onChange = onChange || (() => {});
    this.enabled = false;
    this.index = 0;
    this.dwell = 0;
    this.flying = false;
    this.idleTimeout = 0;
    this.autoResumeAfter = 12; // 秒，鼠标静置后可恢复（不自动强抢）

    this._onPointer = () => this.takeover();
    this._onWheel = () => this.takeover();
    this._onKeyDown = (e) => {
      if (e.key === 'Escape') this.stop();
    };

    canvas.addEventListener('pointerdown', this._onPointer, { passive: true });
    canvas.addEventListener('wheel', this._onWheel, { passive: true });
    window.addEventListener('keydown', this._onKeyDown);
  }

  get current() {
    return detailCameras[this.index] || detailCameras[0];
  }

  get label() {
    return this.enabled ? (this.flying ? `飞往 · ${this.current.label}` : `巡游 · ${this.current.label}`) : '手动视角';
  }

  start(fromIndex = 0) {
    this.enabled = true;
    this.index = fromIndex % detailCameras.length;
    this.dwell = 0;
    this.#flyToCurrent();
    this.onChange();
  }

  stop() {
    this.enabled = false;
    this.flying = false;
    this.selection.clearFocusAnim?.();
    this.onChange();
  }

  toggle() {
    if (this.enabled) this.stop();
    else this.start(this.index);
    return this.enabled;
  }

  next() {
    this.index = (this.index + 1) % detailCameras.length;
    this.dwell = 0;
    if (this.enabled) this.#flyToCurrent();
    else this.selection.focusOn(this.current.position, this.current.target, 1.0);
    this.onChange();
  }

  prev() {
    this.index = (this.index - 1 + detailCameras.length) % detailCameras.length;
    this.dwell = 0;
    if (this.enabled) this.#flyToCurrent();
    else this.selection.focusOn(this.current.position, this.current.target, 1.0);
    this.onChange();
  }

  goTo(id) {
    const i = detailCameras.findIndex((c) => c.id === id);
    if (i < 0) return;
    this.index = i;
    this.dwell = 0;
    if (this.enabled) this.#flyToCurrent();
    else this.selection.focusOn(this.current.position, this.current.target, 1.0);
    this.onChange();
  }

  /** 鼠标接管：立刻停巡游，保留当前视角 */
  takeover() {
    if (!this.enabled) return;
    this.enabled = false;
    this.flying = false;
    this.selection.cancelFocus();
    this.onChange();
  }

  update(delta) {
    if (!this.enabled) return;
    if (this.selection.isFocusing()) {
      this.flying = true;
      this.dwell = 0;
      return;
    }
    if (this.flying) {
      this.flying = false;
      this.dwell = 0;
      this.onChange();
    }
    this.dwell += delta;
    if (this.dwell >= this.current.duration) {
      this.index = (this.index + 1) % detailCameras.length;
      this.#flyToCurrent();
      this.onChange();
    }
  }

  #flyToCurrent() {
    const c = this.current;
    this.selection.focusOn(c.position, c.target, 1.25);
    this.flying = true;
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this._onPointer);
    this.canvas.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('keydown', this._onKeyDown);
  }
}
