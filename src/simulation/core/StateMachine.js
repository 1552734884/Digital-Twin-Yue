/**
 * 轻量有限状态机：按阶段时长驱动，支持循环与一次性流程
 */
export class StateMachine {
  /**
   * @param {object} opts
   * @param {Record<string, number>} opts.durations 阶段时长（秒）
   * @param {string[]} opts.order 阶段顺序
   * @param {string} [opts.initial]
   * @param {boolean} [opts.loop]
   * @param {(from: string, to: string) => void} [opts.onTransition]
   * @param {(state: string, t: number, duration: number) => void} [opts.onUpdate]
   */
  constructor({ durations, order, initial, loop = true, onTransition, onUpdate }) {
    this.durations = durations;
    this.order = order;
    this.loop = loop;
    this.onTransition = onTransition || (() => {});
    this.onUpdate = onUpdate || (() => {});
    this.state = initial || order[0];
    this.stateTime = 0;
    this.finished = false;
    this.cycle = 0;
  }

  get duration() {
    return this.durations[this.state] ?? 1;
  }

  /** 0..1 阶段内进度 */
  get progress() {
    const d = this.duration;
    return d <= 0 ? 1 : Math.min(1, this.stateTime / d);
  }

  reset(state) {
    this.state = state || this.order[0];
    this.stateTime = 0;
    this.finished = false;
  }

  update(delta) {
    if (this.finished || delta <= 0) return;
    this.stateTime += delta;
    this.onUpdate(this.state, this.progress, this.duration);

    if (this.stateTime < this.duration) return;

    const idx = this.order.indexOf(this.state);
    const nextIdx = idx + 1;
    if (nextIdx >= this.order.length) {
      if (this.loop) {
        this.cycle += 1;
        this.#transition(this.order[0]);
      } else {
        this.finished = true;
      }
      return;
    }
    this.#transition(this.order[nextIdx]);
  }

  #transition(next) {
    const from = this.state;
    this.state = next;
    this.stateTime = 0;
    this.onTransition(from, next);
  }
}

/** 缓动工具 */
export function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeInOut(t) {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function easeOut(t) {
  return 1 - Math.pow(1 - clamp01(t), 2);
}
