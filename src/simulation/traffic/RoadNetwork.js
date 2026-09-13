import * as THREE from 'three';

/**
 * 基地路网：路段 + 路口 + 路径查询
 * 坐标与 Roads.js 道路对齐
 */
export function createRoadNetwork() {
  /** 关键节点 */
  const nodes = {
    gate: { x: 0, z: 62 },
    ring: { x: 0, z: 52 },
    mainN: { x: 0, z: 30 },
    mainC: { x: 0, z: 8 },
    mainS: { x: 0, z: -20 },
    portJ: { x: 0, z: -40 },
    portW: { x: -20, z: -46 },
    portE: { x: 18, z: -46 },
    whA: { x: -52, z: 28 },
    whAJ: { x: -52, z: 8 },
    whB: { x: 48, z: 8 },
    whBE: { x: 48, z: 28 },
    park: { x: 28, z: 48 },
    factoryS: { x: 0, z: 22 },
  };

  /** 有向边（路段） */
  const edges = [
    ['gate', 'ring', 4.5],
    ['ring', 'mainN', 22],
    ['mainN', 'mainC', 22],
    ['mainC', 'mainS', 28],
    ['mainS', 'portJ', 20],
    ['portJ', 'portW', 20],
    ['portJ', 'portE', 18],
    ['mainC', 'whAJ', 52],
    ['whAJ', 'whA', 20],
    ['mainC', 'whB', 48],
    ['whB', 'whBE', 20],
    ['ring', 'park', 28],
    ['mainN', 'factoryS', 8],
  ];

  const segments = [];
  for (const [a, b, len] of edges) {
    const na = nodes[a];
    const nb = nodes[b];
    segments.push({
      id: `${a}->${b}`,
      from: a,
      to: b,
      fromPos: new THREE.Vector3(na.x, 0, na.z),
      toPos: new THREE.Vector3(nb.x, 0, nb.z),
      length: len,
    });
    // 反向车道（略偏移）
    const dir = new THREE.Vector3().subVectors(nb, na).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(2.2);
    segments.push({
      id: `${b}->${a}`,
      from: b,
      to: a,
      fromPos: new THREE.Vector3(nb.x, 0, nb.z).add(side),
      toPos: new THREE.Vector3(na.x, 0, na.z).add(side),
      length: len,
    });
  }

  const byFrom = new Map();
  for (const s of segments) {
    if (!byFrom.has(s.from)) byFrom.set(s.from, []);
    byFrom.get(s.from).push(s);
  }

  /** 简单环线路径（集卡主循环，沿干道） */
  const truckLoop = ['gate', 'ring', 'mainN', 'mainC', 'mainS', 'portJ', 'portW', 'portJ', 'portE', 'portJ', 'mainS', 'mainC', 'mainN', 'ring'];

  const warehouseLoop = ['mainC', 'whAJ', 'whA', 'whAJ', 'mainC', 'whB', 'whBE', 'whB', 'mainC'];

  function pathToSegments(pathIds) {
    const segs = [];
    for (let i = 0; i < pathIds.length - 1; i++) {
      const a = pathIds[i];
      const b = pathIds[i + 1];
      const seg = segments.find((s) => s.from === a && s.to === b);
      if (seg) segs.push(seg);
    }
    return segs;
  }

  return {
    nodes,
    segments,
    byFrom,
    truckLoop: pathToSegments(truckLoop),
    warehouseLoop: pathToSegments(warehouseLoop),
    getNode(id) {
      const n = nodes[id];
      return new THREE.Vector3(n.x, 0, n.z);
    },
  };
}

/**
 * 路口通行控制：简易信号灯 + 占用锁
 */
export class IntersectionController {
  constructor() {
    // 路口：南北绿 / 东西红，周期切换
    this.cycleTime = 12;
    this.t = 0;
    this.phase = 'NS'; // NS | EW
    this.holds = new Map(); // nodeId -> count
  }

  update(delta) {
    this.t += delta;
    if (this.t >= this.cycleTime) {
      this.t = 0;
      this.phase = this.phase === 'NS' ? 'EW' : 'NS';
    }
  }

  canPass(fromId, toId) {
    // 港区联络与主干冲突：主干南北在 NS 相位放行
    const northSouth = new Set(['gate', 'ring', 'mainN', 'mainC', 'mainS', 'portJ']);
    const eastWest = new Set(['whAJ', 'whA', 'whB', 'whBE', 'park', 'whAJ']);
    const isNS = northSouth.has(fromId) && northSouth.has(toId);
    const isEW = eastWest.has(fromId) || eastWest.has(toId) ||
      (fromId === 'mainC' && (toId === 'whAJ' || toId === 'whB')) ||
      (toId === 'mainC' && (fromId === 'whAJ' || fromId === 'whB'));
    if (isNS && !isEW) return this.phase === 'NS';
    if (isEW) return this.phase === 'EW';
    return true;
  }

  acquire(nodeId) {
    this.holds.set(nodeId, (this.holds.get(nodeId) || 0) + 1);
  }

  release(nodeId) {
    const n = (this.holds.get(nodeId) || 0) - 1;
    if (n <= 0) this.holds.delete(nodeId);
    else this.holds.set(nodeId, n);
  }

  isBlocked(nodeId) {
    return (this.holds.get(nodeId) || 0) > 0;
  }

  getStatus() {
    const remain = Math.max(0, this.cycleTime - this.t);
    return {
      phase: this.phase,
      phaseCN: this.phase === 'NS' ? '南北通行' : '东西通行',
      remain: remain.toFixed(1),
    };
  }
}
