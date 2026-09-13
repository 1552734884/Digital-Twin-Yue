import * as THREE from 'three';
import { box, cylinder, getBoxGeometry, getCylinderGeometry } from './MaterialLibrary.js';

function trunkAndCrownInstances(mats, items) {
  // items: [{x,z,s}]
  const trunkGeo = getCylinderGeometry(0.25, 0.35, 2.2, 8);
  const crownGeo = new THREE.ConeGeometry(1.4, 3.2, 8);
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.metalDark, items.length);
  const crowns = new THREE.InstancedMesh(crownGeo, mats.tree, items.length);
  trunks.castShadow = false;
  trunks.receiveShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = false;

  const dummy = new THREE.Object3D();
  items.forEach((it, i) => {
    const s = it.s ?? 1;
    dummy.position.set(it.x, 1.1 * s, it.z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(it.x, 3.2 * s, it.z);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  });
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  return [trunks, crowns];
}

function streetLightInstances(mats, items) {
  const poleGeo = getCylinderGeometry(0.12, 0.16, 7, 8);
  const headGeo = getBoxGeometry(0.7, 0.25, 0.4);
  const armGeo = getBoxGeometry(2.2, 0.15, 0.35);
  const poles = new THREE.InstancedMesh(poleGeo, mats.metalDark, items.length);
  const arms = new THREE.InstancedMesh(armGeo, mats.metalDark, items.length);
  const heads = new THREE.InstancedMesh(headGeo, mats.orange, items.length);
  poles.castShadow = false;
  arms.castShadow = false;
  heads.castShadow = false;

  const dummy = new THREE.Object3D();
  items.forEach((p, i) => {
    dummy.position.set(p.x, 3.5, p.z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x + 0.9, 7, p.z);
    dummy.updateMatrix();
    arms.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x + 1.8, 6.85, p.z);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
  });
  poles.instanceMatrix.needsUpdate = true;
  arms.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  return [poles, arms, heads];
}

/** 场景点缀：树、灯、车辆、电缆桥架（实例化重复对象） */
export function createGroundProps(mats) {
  const group = new THREE.Group();
  group.name = 'Props';

  const trees = [];
  for (let i = 0; i < 5; i++) {
    trees.push({ x: -12, z: 64 + i * 0.1, s: 1 });
    trees.push({ x: 12, z: 64 + i * 0.1, s: 1 });
    trees.push({ x: -16 - i * 0.2, z: 70, s: 0.9 });
  }
  for (let i = 0; i < 6; i++) {
    trees.push({ x: -78, z: -10 + i * 12, s: 1.1 });
    trees.push({ x: -72, z: -6 + i * 12, s: 0.85 });
  }
  for (const m of trunkAndCrownInstances(mats, trees)) group.add(m);

  const lights = [];
  for (let i = -4; i <= 5; i++) {
    lights.push({ x: 5.2, z: i * 16 });
    lights.push({ x: -5.2, z: i * 16 + 8 });
  }
  for (const m of streetLightInstances(mats, lights)) group.add(m);

  // 停车场车辆（静态，小体量不投影）
  const carMats = [mats.metal, mats.panelDark, mats.orangeDeep];
  for (let i = 0; i < 5; i++) {
    const car = new THREE.Group();
    car.add(box(1.7, 0.55, 3.6, carMats[i % 3], 0, 0.55, 0, { castShadow: false }));
    car.add(box(1.5, 0.5, 1.8, carMats[i % 3], 0, 1.05, -0.2, { castShadow: false }));
    car.position.set(18 + i * 4, 0, 48);
    group.add(car);
  }

  // 电缆桥架
  group.add(box(0.6, 2.5, 40, mats.metal, -22, 2.5, 5, { castShadow: false }));
  group.add(box(1.4, 0.3, 40, mats.orange, -22, 4, 5, { castShadow: false }));
  for (let i = 0; i < 5; i++) {
    group.add(box(0.5, 2.5, 0.5, mats.metalDark, -22, 1.25, -12 + i * 10, { castShadow: false }));
  }

  return group;
}
