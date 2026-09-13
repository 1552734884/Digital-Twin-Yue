import * as THREE from 'three';
import { box, cylinder } from '../../models/MaterialLibrary.js';
import { StateMachine, lerp, easeInOut, clamp01 } from '../core/StateMachine.js';

const ARM_STATES = ['WAIT', 'GRASP', 'TRANSPORT', 'PLACE', 'RETURN'];
const ARM_DURATIONS = {
  WAIT: 0.9,
  GRASP: 1.2,
  TRANSPORT: 1.5,
  PLACE: 1.0,
  RETURN: 1.2,
};

const STAGE_CN = {
  WAIT: '等待',
  GRASP: '抓取',
  TRANSPORT: '搬运',
  PLACE: '落位',
  RETURN: '回位',
};

/**
 * 工业机械臂：基座回转 + 大臂/小臂俯仰 + 夹爪开合
 * 状态：等待 → 抓取 → 搬运 → 落位 → 回位
 */
export class RobotArm {
  /**
   * @param {object} mats
   * @param {object} opts
   * @param {string} opts.id
   * @param {THREE.Vector3} opts.pickPos 抓取点（世界系）
   * @param {THREE.Vector3} opts.placePos 落位点（世界系）
   * @param {number} [opts.scale]
   * @param {number} [opts.phase] 相位错开多臂
   */
  constructor(mats, opts) {
    this.id = opts.id;
    this.mats = mats;
    this.scale = opts.scale ?? 1;
    this.pickPos = opts.pickPos.clone();
    this.placePos = opts.placePos.clone();
    this.homeYaw = opts.homeYaw ?? 0;

    this.root = new THREE.Group();
    this.root.name = `RobotArm-${opts.id}`;
    this.root.position.copy(opts.origin || new THREE.Vector3());

    this.#buildModel(mats);

    this.workpiece = this.#createWorkpiece(mats);
    this.workpiece.visible = false;
    // 工件挂在末端
    this.workpieceHolder = new THREE.Group();
    this.wrist.add(this.workpieceHolder);
    this.workpieceHolder.add(this.workpiece);
    this.workpiece.position.set(0, 0.15 * this.scale, 0);

    this.gripperOpen = 1;
    this.hasWorkpiece = false;

    // 本地坐标下的抓取/落位（相对 root）
    this.pickLocal = this.pickPos.clone().sub(this.root.position);
    this.placeLocal = this.placePos.clone().sub(this.root.position);

    this.fsm = new StateMachine({
      order: ARM_STATES,
      durations: ARM_DURATIONS,
      loop: true,
      initial: opts.phaseState || 'WAIT',
      onTransition: (from, to) => this.#onTransition(from, to),
      onUpdate: (state, p) => this.#onUpdate(state, p),
    });
    if (opts.phase) {
      this.fsm.stateTime = opts.phase * (ARM_DURATIONS[opts.fsm?.state || 'WAIT'] || 1);
    }

    // 初始姿态
    this.#applyPose(this.#poseFor('WAIT', 0));
  }

  get state() {
    return this.fsm.state;
  }

  get stateCN() {
    return STAGE_CN[this.state] || this.state;
  }

  get progress() {
    return this.fsm.progress;
  }

  update(delta) {
    this.fsm.update(delta);
    // 工件始终挂在夹爪末端，仅在持件时显示，避免脱爪悬浮
    this.workpiece.visible = this.hasWorkpiece;
    if (this.hasWorkpiece) {
      this.workpiece.position.set(0, 0.12 * this.scale, 0);
      this.workpiece.rotation.set(0, 0, 0);
    }
    // 夹爪视觉开合
    const targetOpen = this.fsm.state === 'GRASP'
      ? lerp(1, 0, easeInOut(this.fsm.progress))
      : this.fsm.state === 'PLACE'
        ? lerp(0, 1, easeInOut(this.fsm.progress))
        : this.hasWorkpiece || this.fsm.state === 'TRANSPORT'
          ? 0
          : this.fsm.state === 'RETURN'
            ? 1
            : this.gripperOpen;
    // 平滑
    this.gripperOpen += (targetOpen - this.gripperOpen) * Math.min(1, delta * 8);
    this.#applyGripper(this.gripperOpen);
    this.workpiece.visible = this.hasWorkpiece;
  }

  #buildModel(mats) {
    const s = this.scale;
    // 底座
    this.root.add(cylinder(1.1 * s, 1.3 * s, 0.5 * s, mats.metalDark, 0, 0.25 * s, 0, 16));
    this.root.add(cylinder(0.7 * s, 0.7 * s, 0.4 * s, mats.orange, 0, 0.7 * s, 0, 14));

    // 基座回转组
    this.yawGroup = new THREE.Group();
    this.yawGroup.position.y = 0.9 * s;
    this.root.add(this.yawGroup);

    this.yawGroup.add(box(1.2 * s, 0.6 * s, 1.0 * s, mats.metal, 0, 0.3 * s, 0));
    this.yawGroup.add(box(0.35 * s, 0.5 * s, 0.35 * s, mats.orangeDeep, 0, 0.8 * s, 0));

    // 大臂
    this.shoulder = new THREE.Group();
    this.shoulder.position.set(0, 1.0 * s, 0);
    this.yawGroup.add(this.shoulder);

    this.upperArm = box(0.45 * s, 2.8 * s, 0.5 * s, mats.metal, 0, 1.4 * s, 0);
    this.shoulder.add(this.upperArm);
    this.shoulder.add(box(0.7 * s, 0.5 * s, 0.7 * s, mats.orange, 0, 0.1 * s, 0));

    // 小臂
    this.elbow = new THREE.Group();
    this.elbow.position.set(0, 2.8 * s, 0);
    this.shoulder.add(this.elbow);
    this.elbow.add(box(0.38 * s, 2.2 * s, 0.42 * s, mats.metal, 0, 1.1 * s, 0));
    this.elbow.add(box(0.55 * s, 0.4 * s, 0.55 * s, mats.orangeDeep, 0, 0.05 * s, 0));

    // 腕 + 夹爪
    this.wrist = new THREE.Group();
    this.wrist.position.set(0, 2.2 * s, 0);
    this.elbow.add(this.wrist);
    this.wrist.add(box(0.3 * s, 0.35 * s, 0.3 * s, mats.metalDark, 0, 0.1 * s, 0));

    this.gripL = box(0.12 * s, 0.7 * s, 0.18 * s, mats.metalDark, -0.28 * s, 0.45 * s, 0);
    this.gripR = box(0.12 * s, 0.7 * s, 0.18 * s, mats.metalDark, 0.28 * s, 0.45 * s, 0);
    this.wrist.add(this.gripL);
    this.wrist.add(this.gripR);
    this.wrist.add(box(0.5 * s, 0.15 * s, 0.3 * s, mats.orange, 0, 0.15 * s, 0));
  }

  #createWorkpiece(mats) {
    const g = new THREE.Group();
    // 电芯模组工件
    g.add(box(0.7, 0.45, 0.5, mats.containerBlue || mats.metal, 0, 0, 0));
    g.add(box(0.72, 0.08, 0.52, mats.orange, 0, 0.26, 0));
    g.add(box(0.15, 0.2, 0.52, mats.metalDark, -0.35, 0, 0));
    return g;
  }

  #applyGripper(open01) {
    const s = this.scale;
    const spread = lerp(0.08, 0.32, clamp01(open01)) * s;
    this.gripL.position.x = -spread;
    this.gripR.position.x = spread;
  }

  /** 简化逆运动：根据目标本地点解 yaw + 俯仰链 */
  #poseFor(state, progress) {
    const s = this.scale;
    const pick = this.pickLocal;
    const place = this.placeLocal;
    const home = { yaw: this.homeYaw, shoulder: 0.35, elbow: 0.85, wrist: -0.2 };

    switch (state) {
      case 'WAIT':
        return home;
      case 'GRASP': {
        const t = easeInOut(progress);
        return {
          yaw: lerp(home.yaw, this.#yawTo(pick), t),
          shoulder: lerp(home.shoulder, 0.95, t),
          elbow: lerp(home.elbow, 0.15, t),
          wrist: lerp(home.wrist, -0.55, t),
        };
      }
      case 'TRANSPORT': {
        const t = easeInOut(progress);
        const midShoulder = 0.45;
        return {
          yaw: lerp(this.#yawTo(pick), this.#yawTo(place), t),
          shoulder: lerp(0.95, midShoulder, Math.min(1, t * 1.4)),
          elbow: lerp(0.15, 0.7, t),
          wrist: lerp(-0.55, -0.3, t),
        };
      }
      case 'PLACE': {
        const t = easeInOut(progress);
        return {
          yaw: this.#yawTo(place),
          shoulder: lerp(0.45, 0.9, t),
          elbow: lerp(0.7, 0.2, t),
          wrist: lerp(-0.3, -0.55, t),
        };
      }
      case 'RETURN': {
        const t = easeInOut(progress);
        return {
          yaw: lerp(this.#yawTo(place), home.yaw, t),
          shoulder: lerp(0.9, home.shoulder, t),
          elbow: lerp(0.2, home.elbow, t),
          wrist: lerp(-0.55, home.wrist, t),
        };
      }
      default:
        return home;
    }
  }

  #yawTo(localPoint) {
    return Math.atan2(localPoint.x, localPoint.z);
  }

  #applyPose(pose) {
    this.yawGroup.rotation.y = pose.yaw;
    this.shoulder.rotation.x = pose.shoulder;
    this.elbow.rotation.x = pose.elbow - pose.shoulder * 0.15;
    this.wrist.rotation.x = pose.wrist;
  }

  #onTransition(from, to) {
    // 抓取完成带起工件
    if (from === 'GRASP' && to === 'TRANSPORT') {
      this.hasWorkpiece = true;
      this.workpiece.visible = true;
    }
    // 落位释放
    if (from === 'PLACE' && to === 'RETURN') {
      this.hasWorkpiece = false;
      this.workpiece.visible = false;
    }
    // 进入抓取时准备空爪
    if (to === 'GRASP') {
      this.hasWorkpiece = false;
      this.workpiece.visible = false;
    }
  }

  #onUpdate(state, progress) {
    this.#applyPose(this.#poseFor(state, progress));
  }
}

export { ARM_STATES, STAGE_CN };
