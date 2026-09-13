import * as THREE from 'three';
import { box, cylinder } from '../../models/MaterialLibrary.js';
import { StateMachine, lerp, easeInOut } from '../core/StateMachine.js';

const INSP_STATES = ['WAIT', 'CLAMP', 'PROBE', 'DETECT', 'RESULT'];
const INSP_DURATIONS = {
  WAIT: 0.8,
  CLAMP: 0.9,
  PROBE: 1.1,
  DETECT: 2.2,
  RESULT: 1.6,
};
const INSP_CN = {
  WAIT: '待机',
  CLAMP: '夹紧',
  PROBE: '探针接触',
  DETECT: '检测中',
  RESULT: '结果反馈',
};

/**
 * 检测工位：夹具夹紧 → 探针下压接触 → 检测扫描 → 通过/失败反馈
 */
export class InspectionStation {
  constructor(mats, origin = new THREE.Vector3()) {
    this.mats = mats;
    this.root = new THREE.Group();
    this.root.name = 'InspectionStation';
    this.root.position.copy(origin);

    this.result = 'PASS';
    this.lastResultAt = 0;
    this.alarm = false;

    this.#build(mats);

    this.fsm = new StateMachine({
      order: INSP_STATES,
      durations: INSP_DURATIONS,
      loop: true,
      onTransition: (from, to) => this.#onTransition(from, to),
      onUpdate: (state, p) => this.#onUpdate(state, p),
    });
  }

  get state() {
    return this.fsm.state;
  }

  get stateCN() {
    return INSP_CN[this.state] || this.state;
  }

  get progress() {
    return this.fsm.progress;
  }

  update(delta) {
    this.fsm.update(delta);
    // 扫描环旋转
    if (this.state === 'DETECT') {
      this.scanRing.rotation.y += delta * 6;
      this.scanRing.visible = true;
    } else {
      this.scanRing.visible = false;
    }
  }

  #build(mats) {
    // 台架
    this.root.add(box(3.6, 0.4, 2.4, mats.metalDark, 0, 0.2, 0));
    this.root.add(box(3.8, 0.12, 2.6, mats.orange, 0, 0.45, 0));

    // 被测模组
    this.dut = new THREE.Group();
    this.dut.add(box(1.8, 0.55, 1.2, mats.containerBlue, 0, 0.85, 0));
    this.dut.add(box(1.85, 0.1, 1.25, mats.orange, 0, 1.15, 0));
    this.root.add(this.dut);

    // 左右夹钳
    this.clampL = new THREE.Group();
    this.clampR = new THREE.Group();
    this.clampL.add(box(0.28, 0.7, 1.0, mats.metal, 0, 0.85, 0));
    this.clampR.add(box(0.28, 0.7, 1.0, mats.metal, 0, 0.85, 0));
    this.clampL.add(box(0.12, 0.75, 1.05, mats.orangeDeep, 0.18, 0.85, 0));
    this.clampR.add(box(0.12, 0.75, 1.05, mats.orangeDeep, -0.18, 0.85, 0));
    this.root.add(this.clampL);
    this.root.add(this.clampR);

    // 探针模组（三探针）
    this.probeHead = new THREE.Group();
    this.probeHead.position.set(0, 2.6, 0);
    this.probeHead.add(box(2.2, 0.25, 0.8, mats.metalDark, 0, 0, 0));
    for (let i = 0; i < 3; i++) {
      const x = -0.6 + i * 0.6;
      this.probeHead.add(cylinder(0.06, 0.08, 0.9, mats.metal, x, -0.5, 0, 8));
      this.probeHead.add(cylinder(0.1, 0.1, 0.12, mats.orange, x, -0.98, 0, 8));
    }
    // 龙门
    this.root.add(box(0.35, 2.8, 0.35, mats.metalDark, -1.6, 1.4, 0));
    this.root.add(box(0.35, 2.8, 0.35, mats.metalDark, 1.6, 1.4, 0));
    this.root.add(box(3.5, 0.3, 0.5, mats.metalDark, 0, 2.7, 0));
    this.root.add(this.probeHead);

    // 扫描环
    this.scanRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85 }),
    );
    this.scanRing.rotation.x = Math.PI / 2;
    this.scanRing.position.set(0, 1.35, 0);
    this.scanRing.visible = false;
    this.root.add(this.scanRing);

    // 状态灯
    this.statusLight = cylinder(0.18, 0.18, 0.35, mats.orange, 1.5, 2.95, 0, 12);
    this.root.add(this.statusLight);

    // 结果指示牌
    this.resultPanel = new THREE.Group();
    this.resultPanel.position.set(0, 1.7, 1.15);
    this.resultPanel.add(box(1.2, 0.55, 0.1, mats.panelDark, 0, 0, 0));
    this.resultFace = box(1.0, 0.4, 0.06, mats.orange, 0, 0, 0.08);
    this.resultPanel.add(this.resultFace);
    this.root.add(this.resultPanel);
  }

  #onTransition(from, to) {
    if (to === 'RESULT') {
      // 模拟数据：约 85% 通过
      this.result = Math.random() < 0.85 ? 'PASS' : 'FAIL';
      this.alarm = this.result === 'FAIL';
      this.lastResultAt = performance.now();
    }
    if (to === 'WAIT') {
      this.alarm = false;
    }
  }

  #onUpdate(state, p) {
    const ease = easeInOut(p);
    // 夹紧
    if (state === 'CLAMP') {
      const gap = lerp(1.15, 0.95, ease);
      this.clampL.position.x = -gap;
      this.clampR.position.x = gap;
    } else if (state === 'WAIT') {
      this.clampL.position.x = -1.15;
      this.clampR.position.x = 1.15;
    } else {
      this.clampL.position.x = -0.95;
      this.clampR.position.x = 0.95;
    }

    // 探针
    if (state === 'PROBE') {
      this.probeHead.position.y = lerp(2.6, 1.55, ease);
    } else if (state === 'DETECT') {
      this.probeHead.position.y = 1.55;
    } else if (state === 'RESULT') {
      this.probeHead.position.y = lerp(1.55, 2.6, ease);
    } else {
      this.probeHead.position.y = 2.6;
    }

    // 状态灯 / 结果面板颜色
    if (state === 'DETECT') {
      this.resultFace.material = this.mats.orange;
    } else if (state === 'RESULT') {
      this.resultFace.material = this.result === 'PASS' ? this.#passMat() : this.#failMat();
    } else if (state === 'WAIT') {
      this.resultFace.material = this.mats.metalDark;
    }
  }

  #passMat() {
    if (!this._passMat) {
      this._passMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      });
    }
    return this._passMat;
  }

  #failMat() {
    if (!this._failMat) {
      this._failMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.4,
        roughness: 0.4,
      });
    }
    return this._failMat;
  }

  getStatus() {
    return {
      state: this.state,
      stateCN: this.stateCN,
      progress: this.progress,
      result: this.state === 'RESULT' || this.state === 'WAIT' ? this.result : null,
      alarm: this.alarm,
    };
  }
}

export { INSP_STATES, INSP_CN };
