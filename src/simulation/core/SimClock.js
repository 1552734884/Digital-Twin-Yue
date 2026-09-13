/**
 * 仿真时钟：暂停时保留累计时间，恢复后动作连续（不跳变）
 */
export class SimClock {
  constructor() {
    this.elapsed = 0;
    this.delta = 0;
    this.paused = false;
    this.scale = 1;
  }

  tick(rawDelta) {
    if (this.paused) {
      this.delta = 0;
      return this.delta;
    }
    this.delta = Math.min(rawDelta, 0.05) * this.scale;
    this.elapsed += this.delta;
    return this.delta;
  }

  pause() {
    this.paused = true;
    return this.paused;
  }

  resume() {
    this.paused = false;
    return this.paused;
  }

  toggle() {
    this.paused = !this.paused;
    return this.paused;
  }
}
