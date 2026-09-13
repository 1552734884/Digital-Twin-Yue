import * as THREE from 'three';
import { palette } from '../config/palette.js';

/** 几何缓存：按 key 复用 Box/Cylinder/Plane */
const geoCache = new Map();

export function getBoxGeometry(w, h, d) {
  const key = `box:${w}:${h}:${d}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(key);
}

export function getCylinderGeometry(rt, rb, h, seg = 16) {
  const key = `cyl:${rt}:${rb}:${h}:${seg}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.CylinderGeometry(rt, rb, h, seg));
  return geoCache.get(key);
}

export function getPlaneGeometry(w, h) {
  const key = `plane:${w}:${h}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.PlaneGeometry(w, h));
  return geoCache.get(key);
}

export function createMaterialLibrary() {
  const mat = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.72,
      metalness: opts.metalness ?? 0.08,
      ...opts,
    });

  return {
    ground: mat(palette.ground, { roughness: 0.95, metalness: 0 }),
    groundDark: mat(palette.groundDark, { roughness: 0.95, metalness: 0 }),
    road: mat(palette.road, { roughness: 0.88, metalness: 0.05 }),
    roadMark: mat(palette.roadMark, { roughness: 0.7, metalness: 0 }),
    wall: mat(palette.factory, { roughness: 0.8, metalness: 0.05 }),
    warehouse: mat(palette.warehouse, { roughness: 0.78, metalness: 0.06 }),
    roof: mat(palette.roof, { roughness: 0.7, metalness: 0.12 }),
    metal: mat(palette.metal, { roughness: 0.45, metalness: 0.55 }),
    metalDark: mat(palette.metalDark, { roughness: 0.5, metalness: 0.45 }),
    glass: mat(palette.glass, {
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.55,
    }),
    orange: mat(palette.orange, { roughness: 0.45, metalness: 0.25 }),
    orangeDeep: mat(palette.orangeDeep, { roughness: 0.5, metalness: 0.2 }),
    water: mat(palette.water, {
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
    }),
    quay: mat(palette.quay, { roughness: 0.9, metalness: 0.05 }),
    crane: mat(palette.crane, { roughness: 0.45, metalness: 0.3 }),
    containerBlue: mat(palette.containerBlue, { roughness: 0.7, metalness: 0.15 }),
    containerGreen: mat(palette.containerGreen, { roughness: 0.7, metalness: 0.15 }),
    containerOrange: mat(palette.containerOrange, { roughness: 0.7, metalness: 0.15 }),
    grass: mat(palette.grass, { roughness: 0.95, metalness: 0 }),
    tree: mat(palette.tree, { roughness: 0.9, metalness: 0 }),
    highlight: mat(palette.highlight, {
      roughness: 0.35,
      metalness: 0.2,
      emissive: palette.highlight,
      emissiveIntensity: 0.25,
    }),
    panelDark: mat(0x2a2f36, { roughness: 0.65, metalness: 0.2 }),
  };
}

/**
 * 盒体；castShadow 默认 true，小装饰可关闭以降阴影开销
 */
export function box(w, h, d, material, x = 0, y = 0, z = 0, opts = {}) {
  const mesh = new THREE.Mesh(getBoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  return mesh;
}

export function cylinder(rTop, rBottom, h, material, x = 0, y = 0, z = 0, segments = 16, opts = {}) {
  const mesh = new THREE.Mesh(getCylinderGeometry(rTop, rBottom, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  return mesh;
}

export function plane(w, h, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(getPlaneGeometry(w, h), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

/** 后处理：整树关闭小物件投影（性能） */
export function optimizeShadows(root, { maxShadowMeshes = 400 } = {}) {
  let shadowCasters = 0;
  const meshes = [];
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    meshes.push(obj);
  });
  // 优先保留大体块投影
  meshes.sort((a, b) => {
    const sa = a.geometry?.parameters ? Object.values(a.geometry.parameters).reduce((m, v) => Math.max(m, Math.abs(v || 0)), 0) : 0;
    const sb = b.geometry?.parameters ? Object.values(b.geometry.parameters).reduce((m, v) => Math.max(m, Math.abs(v || 0)), 0) : 0;
    return sb - sa;
  });
  for (const m of meshes) {
    if (shadowCasters < maxShadowMeshes && m.castShadow) {
      shadowCasters += 1;
    } else {
      m.castShadow = false;
    }
  }
  return shadowCasters;
}
