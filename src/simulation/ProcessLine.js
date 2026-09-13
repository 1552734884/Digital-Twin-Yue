import * as THREE from 'three';
import { box } from '../models/MaterialLibrary.js';
import { RobotArm } from './equipment/RobotArm.js';
import { ModuleStand, LAYER_LABELS } from './equipment/ModuleStand.js';
import { InspectionStation } from './equipment/InspectionStation.js';

/**
 * 装配工艺剖视区：两台机械臂 + 模组工装 + 检测工位
 * 放在总装工厂南侧，便于总览观察
 */
export class ProcessLine {
  /**
   * @param {object} mats
   * @param {THREE.Vector3} origin 场地原点
   */
  constructor(mats, origin = new THREE.Vector3(0, 0, 32)) {
    this.mats = mats;
    this.root = new THREE.Group();
    this.root.name = 'ProcessLine';
    this.root.position.copy(origin);
    this.root.scale.setScalar(1.2);

    this.#buildFloor(mats);

    // 工位布局（本地坐标）
    const pickA = new THREE.Vector3(-4.2, 0.6, 1.8);
    const placeA = new THREE.Vector3(0, 1.2, 0);
    const pickB = new THREE.Vector3(0, 1.2, 0);
    const placeB = new THREE.Vector3(4.2, 0.9, 1.6);

    this.armA = new RobotArm(mats, {
      id: 'RA-01',
      origin: new THREE.Vector3(-2.2, 0.55, 0),
      pickPos: this.root.localToWorld(pickA.clone()),
      placePos: this.root.localToWorld(placeA.clone()),
      homeYaw: -0.6,
    });
    // arm 本地 pick/place 应相对 arm root，先加进场景再修正
    this.root.add(this.armA.root);
    this.armA.pickLocal = pickA.clone().sub(this.armA.root.position);
    this.armA.placeLocal = placeA.clone().sub(this.armA.root.position);

    this.armB = new RobotArm(mats, {
      id: 'RA-02',
      origin: new THREE.Vector3(2.2, 0.55, 0),
      pickPos: this.root.localToWorld(pickB.clone()),
      placePos: this.root.localToWorld(placeB.clone()),
      homeYaw: 0.6,
      phase: 0.45,
    });
    this.root.add(this.armB.root);
    this.armB.pickLocal = pickB.clone().sub(this.armB.root.position);
    this.armB.placeLocal = placeB.clone().sub(this.armB.root.position);
    // 错开相位：进入 WAIT 中段
    this.armB.fsm.state = 'TRANSPORT';
    this.armB.fsm.stateTime = 0.6;

    // 上料托盘
    const feed = new THREE.Group();
    feed.position.copy(pickA);
    feed.add(box(1.6, 0.25, 1.2, mats.metalDark, 0, -0.35, 0));
    for (let i = 0; i < 3; i++) {
      feed.add(box(0.55, 0.35, 0.9, mats.containerBlue, -0.55 + i * 0.55, 0, 0));
    }
    this.root.add(feed);

    // 模组工装（居中）
    this.module = new ModuleStand(mats, new THREE.Vector3(0, 0.55, 0));
    this.root.add(this.module.root);

    // 检测工位
    this.inspection = new InspectionStation(mats, new THREE.Vector3(6.2, 0.55, 0.8));
    this.root.add(this.inspection.root);

    // 流程线地面标识
    this.root.add(box(16, 0.05, 0.35, mats.orange, 0, 0.53, 3.2));
    this.root.add(box(0.35, 0.05, 6.5, mats.orangeDeep, -5.5, 0.53, 0.5));
  }

  #buildFloor(mats) {
    const floor = new THREE.Group();
    floor.add(box(18, 0.5, 12, mats.groundDark, 0, 0.25, 0));
    floor.add(box(18.4, 0.12, 12.4, mats.metalDark, 0, 0.52, 0));
    // 安全黄线
    floor.add(box(18, 0.06, 0.25, mats.orange, 0, 0.58, 5.6));
    floor.add(box(18, 0.06, 0.25, mats.orange, 0, 0.58, -5.6));
    floor.add(box(0.25, 0.06, 12, mats.orange, 8.6, 0.58, 0));
    floor.add(box(0.25, 0.06, 12, mats.orange, -8.6, 0.58, 0));
    this.root.add(floor);
  }

  update(delta) {
    this.armA.update(delta);
    this.armB.update(delta);
    this.inspection.update(delta);
  }

  /** 供 HUD / 仿真读取的模拟数据 */
  getStatus() {
    return {
      arms: [
        {
          id: this.armA.id,
          state: this.armA.state,
          stateCN: this.armA.stateCN,
          progress: this.armA.progress,
          hasWorkpiece: this.armA.hasWorkpiece,
        },
        {
          id: this.armB.id,
          state: this.armB.state,
          stateCN: this.armB.stateCN,
          progress: this.armB.progress,
          hasWorkpiece: this.armB.hasWorkpiece,
        },
      ],
      module: this.module.getStatus(),
      inspection: this.inspection.getStatus(),
      layerLabels: LAYER_LABELS,
    };
  }

  setExplode(t) {
    this.module.applyExplode(t);
  }

  toggleLayer(key) {
    return this.module.toggleLayer(key);
  }
}
