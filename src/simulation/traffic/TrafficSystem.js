import * as THREE from 'three';
import { box, getBoxGeometry, getCylinderGeometry } from '../../models/MaterialLibrary.js';
import { IntersectionController } from './RoadNetwork.js';

const VEHICLE_CN = {
  RUN: '行驶',
  FOLLOW: '跟车',
  WAIT_LIGHT: '等灯',
  FAULT: '故障',
  DOCK: '装卸',
};

/** 建筑占用区（避开主干道走廊，仅拦真实建筑体量） */
const BUILDING_AABBS = [
  // 工厂主体避开南北/东西干道（x±5 / z=8±5）
  { minX: -30, maxX: -5.5, minZ: -20, maxZ: 2.5 },
  { minX: 5.5, maxX: 30, minZ: -20, maxZ: 2.5 },
  { minX: -30, maxX: -5.5, minZ: 13.5, maxZ: 20 },
  { minX: 5.5, maxX: 30, minZ: 13.5, maxZ: 20 },
  // 原料仓（保留 x=-52 通道 ±5）
  { minX: -70, maxX: -58, minZ: 6, maxZ: 32 },
  { minX: -46, maxX: -34, minZ: 6, maxZ: 32 },
  // 成品仓（保留 z=8 通道）
  { minX: 36, maxX: 66, minZ: 14, maxZ: 40 },
  // 中控
  { minX: 6, maxX: 28, minZ: 2, maxZ: 6 },
  { minX: 6, maxX: 28, minZ: 16, maxZ: 22 },
  // 工艺区（避开入口环岛前场）
  { minX: -12, maxX: 12, minZ: 30, maxZ: 44 },
  // 港区管理楼
  { minX: -34, maxX: -22, minZ: -44, maxZ: -32 },
];

function inBuilding(x, z, pad = 0) {
  for (const b of BUILDING_AABBS) {
    if (x >= b.minX - pad && x <= b.maxX + pad && z >= b.minZ - pad && z <= b.maxZ + pad) {
      return true;
    }
  }
  return false;
}

/**
 * 路网车辆：跟车、信号、故障、建筑避让、车距防碰撞
 */
export class TrafficSystem {
  constructor(mats, network) {
    this.mats = mats;
    this.network = network;
    this.controller = new IntersectionController();
    this.vehicles = [];
    this.root = new THREE.Group();
    this.root.name = 'TrafficSystem';
    this.alarms = [];
    this.collisions = 0;

    // 共享几何
    this._wheelGeo = getCylinderGeometry(0.4, 0.4, 0.3, 10);
    this._truckCab = getBoxGeometry(2.2, 1.5, 2.0);
    this._truckBox = getBoxGeometry(2.4, 2.0, 5.0);
    this._truckTop = getBoxGeometry(2.3, 0.3, 4.9);
    this._carBody = getBoxGeometry(1.6, 0.5, 3.4);
    this._carCabin = getBoxGeometry(1.4, 0.45, 1.7);
    this._carGlass = getBoxGeometry(1.45, 0.2, 1.2);

    this.#spawnFleet(mats);
  }

  #createTruckMesh(mats, colorMat) {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(this._truckCab, mats.orangeDeep);
    cab.position.set(0, 1.15, 1.8);
    cab.castShadow = true;
    g.add(cab);
    const body = new THREE.Mesh(this._truckBox, colorMat);
    body.position.set(0, 1.5, -1.4);
    body.castShadow = true;
    g.add(body);
    const top = new THREE.Mesh(this._truckTop, mats.metalDark);
    top.position.set(0, 2.55, -1.4);
    top.castShadow = false;
    g.add(top);
    const spots = [
      [-1.05, 0.4, 1.5], [1.05, 0.4, 1.5],
      [-1.05, 0.4, -0.4], [1.05, 0.4, -0.4],
      [-1.05, 0.4, -2.2], [1.05, 0.4, -2.2],
    ];
    for (const [x, y, z] of spots) {
      const w = new THREE.Mesh(this._wheelGeo, mats.panelDark);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      w.castShadow = false;
      g.add(w);
    }
    return g;
  }

  #createCarMesh(mats, mat) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(this._carBody, mat);
    b.position.y = 0.5;
    b.castShadow = true;
    g.add(b);
    const c = new THREE.Mesh(this._carCabin, mat);
    c.position.set(0, 0.95, -0.2);
    c.castShadow = false;
    g.add(c);
    const gl = new THREE.Mesh(this._carGlass, mats.glass);
    gl.position.set(0, 0.9, -0.15);
    gl.castShadow = false;
    g.add(gl);
    return g;
  }

  #spawnFleet(mats) {
    const configs = [
      { path: this.network.truckLoop, offset: 0, type: 'truck' },
      { path: this.network.truckLoop, offset: 0.42, type: 'truck' },
      { path: this.network.warehouseLoop, offset: 0.2, type: 'truck' },
      { path: this.network.truckLoop, offset: 0.18, type: 'car' },
      { path: this.network.truckLoop, offset: 0.62, type: 'car' },
    ];

    let id = 1;
    for (const cfg of configs) {
      if (!cfg.path.length) continue;
      const mesh = cfg.type === 'truck'
        ? this.#createTruckMesh(mats, id % 2 ? mats.warehouse : mats.containerGreen)
        : this.#createCarMesh(mats, id % 2 ? mats.metal : mats.panelDark);
      mesh.userData.vehicleId = `V-${String(id).padStart(2, '0')}`;
      this.root.add(mesh);
      this.vehicles.push({
        id: mesh.userData.vehicleId,
        type: cfg.type,
        mesh,
        path: cfg.path,
        segIndex: Math.floor(cfg.offset * cfg.path.length) % cfg.path.length,
        t: cfg.offset % 1,
        speed: 0,
        maxSpeed: cfg.type === 'truck' ? 6.5 : 9,
        minGap: cfg.type === 'truck' ? 6.2 : 4.2,
        bodyRadius: cfg.type === 'truck' ? 3.4 : 2.2,
        state: 'RUN',
        fault: false,
        faultTimer: 0,
      });
      id++;
    }
  }

  update(delta) {
    if (delta <= 0) return;
    this.controller.update(delta);
    this.alarms = [];

    const bySeg = new Map();
    for (const v of this.vehicles) {
      const key = v.path[v.segIndex]?.id;
      if (!key) continue;
      if (!bySeg.has(key)) bySeg.set(key, []);
      bySeg.get(key).push(v);
    }
    for (const list of bySeg.values()) list.sort((a, b) => b.t - a.t);

    for (const v of this.vehicles) this.#updateVehicle(v, delta, bySeg);
    this.#resolveCollisions();
  }

  #updateVehicle(v, delta, bySeg) {
    if (v.fault) {
      v.faultTimer -= delta;
      v.speed = 0;
      v.state = 'FAULT';
      if (v.faultTimer <= 0) {
        v.fault = false;
        v.state = 'RUN';
      }
      this.alarms.push({
        vehicleId: v.id,
        type: 'FAULT',
        message: `${v.id} 车辆故障停车，已联动告警`,
      });
      this.#placeOnPath(v);
      return;
    }

    const seg = v.path[v.segIndex];
    if (!seg) {
      v.segIndex = 0;
      v.t = 0;
      return;
    }

    let targetSpeed = v.maxSpeed;
    const list = bySeg.get(seg.id) || [];
    const idx = list.indexOf(v);
    const lead = idx >= 0 ? list[idx - 1] : null;
    if (lead) {
      const gapDist = (lead.t - v.t) * seg.length;
      if (gapDist < v.minGap) {
        targetSpeed = 0;
        v.state = 'FOLLOW';
      } else if (gapDist < v.minGap * 2.2) {
        targetSpeed = Math.min(targetSpeed, Math.max(0, lead.speed * 0.55));
        v.state = 'FOLLOW';
      }
    }

    // 预测下一位置是否进楼
    const nextT = v.t + (v.speed * delta) / Math.max(seg.length, 0.01);
    const p = seg.fromPos.clone().lerp(seg.toPos, Math.min(1, nextT));
    if (inBuilding(p.x, p.z, 1.2)) {
      targetSpeed = 0;
      if (v.state === 'RUN') v.state = 'FOLLOW';
    }

    const nextSegs = this.network.byFrom.get(seg.to) || [];
    if (v.t > 0.82 && nextSegs.length > 1) {
      if (!this.controller.canPass(seg.from, seg.to)) {
        targetSpeed = 0;
        v.state = 'WAIT_LIGHT';
      }
    }

    const accel = targetSpeed > v.speed ? 8 : 14;
    const ds = targetSpeed - v.speed;
    v.speed += Math.sign(ds) * Math.min(Math.abs(ds), accel * delta);
    if (v.speed < 0.05) v.speed = 0;

    if (v.speed > 0.05 && v.state !== 'WAIT_LIGHT' && v.state !== 'FOLLOW' && v.state !== 'FAULT') {
      v.state = 'RUN';
    }

    v.t += (v.speed * delta) / Math.max(seg.length, 0.01);
    if (v.t >= 1) {
      v.t -= 1;
      v.segIndex = (v.segIndex + 1) % v.path.length;
      if (v.state === 'WAIT_LIGHT') v.state = 'RUN';
    }

    if (Math.random() < 0.0003) {
      v.fault = true;
      v.faultTimer = 4 + Math.random() * 5;
      v.state = 'FAULT';
    }

    this.#placeOnPath(v);
  }

  #placeOnPath(v) {
    const seg = v.path[v.segIndex];
    if (!seg) return;
    const pos = seg.fromPos.clone().lerp(seg.toPos, v.t);
    // 避免进入建筑：贴回路段
    if (inBuilding(pos.x, pos.z, 0.2)) {
      // 贴回路段中点附近，避免卡进建筑
      pos.lerp(seg.fromPos, 0.15);
      v.t = Math.max(0, v.t - 0.05);
      v.speed = 0;
    }
    v.mesh.position.set(pos.x, 0, pos.z);
    const dir = new THREE.Vector3().subVectors(seg.toPos, seg.fromPos);
    v.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }

  /** 车-车最小间距，防止相撞穿模 */
  #resolveCollisions() {
    const list = this.vehicles;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const minD = a.bodyRadius + b.bodyRadius;
        const dx = a.mesh.position.x - b.mesh.position.x;
        const dz = a.mesh.position.z - b.mesh.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= minD * minD || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (minD - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        a.mesh.position.x += nx * push;
        a.mesh.position.z += nz * push;
        b.mesh.position.x -= nx * push;
        b.mesh.position.z -= nz * push;
        a.speed = Math.min(a.speed, 1);
        b.speed = Math.min(b.speed, 1);
        this.collisions += 1;
      }
    }
  }

  forceFault(vehicleId) {
    const v = this.vehicles.find((x) => x.id === vehicleId) || this.vehicles[0];
    if (!v) return null;
    v.fault = true;
    v.faultTimer = 6;
    v.state = 'FAULT';
    v.speed = 0;
    return v.id;
  }

  getStatus() {
    return {
      signal: this.controller.getStatus(),
      vehicles: this.vehicles.map((v) => ({
        id: v.id,
        type: v.type,
        state: v.state,
        stateCN: VEHICLE_CN[v.state] || v.state,
        speed: Number(v.speed.toFixed(1)),
        fault: v.fault,
        pos: [Number(v.mesh.position.x.toFixed(1)), Number(v.mesh.position.z.toFixed(1))],
      })),
      alarms: this.alarms.slice(),
      running: this.vehicles.filter((v) => v.state === 'RUN' || v.state === 'FOLLOW').length,
      faulted: this.vehicles.filter((v) => v.fault).length,
      collisions: this.collisions,
    };
  }
}

export { VEHICLE_CN, BUILDING_AABBS, inBuilding };
