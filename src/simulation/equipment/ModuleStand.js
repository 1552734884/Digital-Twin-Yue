import * as THREE from 'three';
import { box } from '../../models/MaterialLibrary.js';
import { lerp, clamp01 } from '../core/StateMachine.js';

/**
 * 电池模组：分层结构 + 拆解偏移 + 零件显隐
 * 层：底托 → 电芯组 → 汇流排 → 绝缘罩 → 顶盖
 */
export class ModuleStand {
  constructor(mats, origin = new THREE.Vector3()) {
    this.mats = mats;
    this.root = new THREE.Group();
    this.root.name = 'ModuleStand';
    this.root.position.copy(origin);

    this.explode = 0; // 0 装配态 → 1 完全拆解
    this.layerVisible = {
      tray: true,
      cells: true,
      busbar: true,
      insulator: true,
      cover: true,
    };

    this.#build(mats);
    this.applyExplode(0);
  }

  #build(mats) {
    // 工装台
    const stand = new THREE.Group();
    stand.add(box(3.2, 0.35, 2.2, mats.metalDark, 0, 0.18, 0));
    stand.add(box(0.35, 1.1, 0.35, mats.metal, -1.3, -0.4, 0.8));
    stand.add(box(0.35, 1.1, 0.35, mats.metal, 1.3, -0.4, 0.8));
    stand.add(box(0.35, 1.1, 0.35, mats.metal, -1.3, -0.4, -0.8));
    stand.add(box(0.35, 1.1, 0.35, mats.metal, 1.3, -0.4, -0.8));
    stand.add(box(3.4, 0.12, 2.4, mats.orange, 0, 0.38, 0));
    this.root.add(stand);

    this.layers = {};

    // 底托
    const tray = new THREE.Group();
    tray.add(box(2.2, 0.18, 1.5, mats.metalDark, 0, 0.1, 0));
    tray.add(box(2.3, 0.1, 0.12, mats.orangeDeep, 0, 0.2, 0.7));
    this.root.add(tray);
    this.layers.tray = { group: tray, baseY: 0.4, explodeY: 0, explodeZ: 0 };

    // 电芯组（4 节）
    const cells = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const x = -0.78 + i * 0.52;
      cells.add(box(0.42, 0.7, 1.15, mats.containerBlue, x, 0.55, 0));
      cells.add(box(0.44, 0.08, 1.18, mats.metal, x, 0.92, 0));
    }
    this.root.add(cells);
    this.layers.cells = { group: cells, baseY: 0.4, explodeY: 0.55, explodeZ: 0.1 };

    // 汇流排
    const busbar = new THREE.Group();
    busbar.add(box(2.05, 0.1, 0.35, mats.orange, 0, 1.0, 0.35));
    busbar.add(box(2.05, 0.1, 0.35, mats.metal, 0, 1.0, -0.35));
    for (let i = 0; i < 4; i++) {
      busbar.add(box(0.12, 0.15, 0.2, mats.orangeDeep, -0.78 + i * 0.52, 1.05, 0));
    }
    this.root.add(busbar);
    this.layers.busbar = { group: busbar, baseY: 0.4, explodeY: 1.05, explodeZ: 0 };

    // 绝缘罩
    const insulator = new THREE.Group();
    insulator.add(box(2.15, 0.12, 1.35, mats.warehouse, 0, 1.15, 0));
    this.root.add(insulator);
    this.layers.insulator = { group: insulator, baseY: 0.4, explodeY: 1.55, explodeZ: -0.05 };

    // 顶盖
    const cover = new THREE.Group();
    cover.add(box(2.3, 0.22, 1.45, mats.wall, 0, 1.3, 0));
    cover.add(box(1.4, 0.12, 0.8, mats.orange, 0, 1.45, 0));
    cover.add(box(0.5, 0.15, 0.3, mats.metalDark, 0.7, 1.45, 0.45));
    this.root.add(cover);
    this.layers.cover = { group: cover, baseY: 0.4, explodeY: 2.1, explodeZ: -0.1 };

    // 模组整体抬升到台面
    this.root.position.y = origin.y;
    // layers groups are children of root; their group.position.y includes baseY offset via explode
  }

  /** 设置拆解程度 0..1 */
  applyExplode(t) {
    this.explode = clamp01(t);
    for (const key of Object.keys(this.layers)) {
      const layer = this.layers[key];
      const visible = this.layerVisible[key];
      layer.group.visible = visible;
      if (!visible) continue;
      const y = lerp(layer.baseY, layer.baseY + layer.explodeY, this.explode);
      const z = lerp(0, layer.explodeZ, this.explode);
      layer.group.position.set(0, y, z);
    }
  }

  setLayerVisible(key, visible) {
    if (!(key in this.layerVisible)) return;
    this.layerVisible[key] = visible;
    this.layers[key].group.visible = visible;
  }

  toggleLayer(key) {
    this.setLayerVisible(key, !this.layerVisible[key]);
    return this.layerVisible[key];
  }

  getStatus() {
    const on = Object.entries(this.layerVisible)
      .filter(([, v]) => v)
      .map(([k]) => k);
    return {
      explode: this.explode,
      visibleLayers: on,
      layerCount: on.length,
    };
  }
}

export const LAYER_LABELS = {
  tray: '底托',
  cells: '电芯组',
  busbar: '汇流排',
  insulator: '绝缘罩',
  cover: '顶盖',
};
