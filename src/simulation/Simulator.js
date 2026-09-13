import * as THREE from 'three';
import { globalMetrics } from '../config/palette.js';
import { SimClock } from './core/SimClock.js';
import { ProcessLine } from './ProcessLine.js';
import { createRoadNetwork } from './traffic/RoadNetwork.js';
import { TrafficSystem } from './traffic/TrafficSystem.js';

/**
 * 基地仿真总控：时钟 + 工艺线 + 交通
 */
export class BaseSimulator {
  constructor(root, mats) {
    this.root = root;
    this.clock = new SimClock();
    this.metrics = { ...globalMetrics };

    this.process = new ProcessLine(mats, new THREE.Vector3(0, 0, 34));
    root.add(this.process.root);

    this.network = createRoadNetwork();
    this.traffic = new TrafficSystem(mats, this.network);
    root.add(this.traffic.root);
  }

  pause() {
    return this.clock.pause();
  }

  resume() {
    return this.clock.resume();
  }

  togglePause() {
    return this.clock.toggle();
  }

  get paused() {
    return this.clock.paused;
  }

  setExplode(t) {
    this.process.setExplode(t);
  }

  toggleLayer(key) {
    return this.process.toggleLayer(key);
  }

  forceFault() {
    return this.traffic.forceFault();
  }

  update(rawDelta) {
    const delta = this.clock.tick(rawDelta);
    if (delta > 0) {
      this.process.update(delta);
      this.traffic.update(delta);
    }

    const process = this.process.getStatus();
    const traffic = this.traffic.getStatus();
    const output = 2400 + Math.sin(this.clock.elapsed * 0.15) * 40;

    this.metrics = {
      online: 5,
      output: `${(output / 1000).toFixed(1)}k`,
      throughput: '486',
      status: traffic.faulted > 0 ? '告警' : this.clock.paused ? '已暂停' : '正常',
    };

    return { process, traffic, paused: this.clock.paused, elapsed: this.clock.elapsed };
  }

  getGlobalMetrics() {
    return this.metrics;
  }
}
