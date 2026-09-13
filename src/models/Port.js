import * as THREE from 'three';
import { box, cylinder } from './MaterialLibrary.js';

function container(mats, x, y, z, mat, rotY = 0) {
  const g = new THREE.Group();
  g.add(box(3.2, 2.6, 8, mat, 0, 1.3, 0));
  // 竖肋
  for (let i = 0; i < 4; i++) {
    g.add(box(0.12, 2.4, 0.12, mats.metalDark, -1.4, 1.3, -3 + i * 2));
    g.add(box(0.12, 2.4, 0.12, mats.metalDark, 1.4, 1.3, -3 + i * 2));
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.castShadow = true;
  return g;
}

/** 门式起重机（岸桥简化） */
function createQuayCrane(mats, x, z) {
  const g = new THREE.Group();

  // 支腿
  g.add(box(1.2, 18, 1.2, mats.crane, -5, 9, 0));
  g.add(box(1.2, 18, 1.2, mats.crane, 5, 9, 0));
  // 横梁
  g.add(box(12, 1.1, 1.2, mats.crane, 0, 18.2, 0));
  // 悬臂
  g.add(box(18, 0.8, 1, mats.crane, 8, 17.4, 0));
  g.add(box(6, 0.8, 1, mats.crane, -7, 17.4, 0));
  // 小车
  g.add(box(1.6, 1, 1.4, mats.metalDark, 3, 16.6, 0));
  g.add(cylinder(0.08, 0.08, 6, mats.metalDark, 3, 13.5, 0, 6));
  g.add(box(1.2, 0.6, 1.2, mats.orange, 3, 10.3, 0));
  // 斜撑
  const braceGeo = new THREE.BoxGeometry(0.35, 14, 0.35);
  const b1 = new THREE.Mesh(braceGeo, mats.crane);
  b1.position.set(-5, 9, 0);
  b1.rotation.z = 0.35;
  g.add(b1);
  const b2 = new THREE.Mesh(braceGeo, mats.crane);
  b2.position.set(5, 9, 0);
  b2.rotation.z = -0.35;
  g.add(b2);

  g.position.set(x, 0, z);
  g.castShadow = true;
  return g;
}

/**
 * 港区码头：岸线、岸桥、堆场集装箱、门机
 */
export function createPort(mats) {
  const group = new THREE.Group();
  group.name = 'port';
  group.userData.facilityId = 'port';

  // 码头面
  group.add(box(70, 0.5, 18, mats.quay, 0, 0.25, -46));

  // 护舷
  for (let i = 0; i < 10; i++) {
    group.add(box(1.2, 1.4, 0.8, mats.orangeDeep, -32 + i * 7, 0.7, -36.8));
  }

  // 系缆桩
  for (let i = 0; i < 6; i++) {
    group.add(cylinder(0.35, 0.4, 0.8, mats.metalDark, -28 + i * 11, 0.9, -38.5, 10));
  }

  // 岸桥
  group.add(createQuayCrane(mats, -12, -44));
  group.add(createQuayCrane(mats, 16, -44));

  // 堆场集装箱（实例化）
  const matsC = [mats.containerBlue, mats.containerGreen, mats.containerOrange];
  const boxGeo = new THREE.BoxGeometry(3.2, 2.6, 8);
  const transforms = [[], [], []];
  let n = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const x = -24 + col * 7;
      const z = -28 - row * 5.5;
      transforms[n % 3].push([x, 1.8, z]);
      if ((row + col) % 2 === 0) {
        transforms[(n + 1) % 3].push([x, 4.4, z]);
      }
      n++;
    }
  }
  const dummy = new THREE.Object3D();
  transforms.forEach((list, mi) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(boxGeo, matsC[mi], list.length);
    im.castShadow = true;
    im.receiveShadow = true;
    list.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  });

  // 龙门吊（堆场）
  const gantry = new THREE.Group();
  gantry.add(box(1, 10, 1, mats.metal, -8, 5, 0));
  gantry.add(box(1, 10, 1, mats.metal, 8, 5, 0));
  gantry.add(box(18, 0.8, 1, mats.crane, 0, 10.3, 0));
  gantry.add(box(2, 1.2, 1.5, mats.orange, 2, 9.5, 0));
  gantry.position.set(20, 0.5, -30);
  group.add(gantry);

  // 泊位标线
  for (let i = 0; i < 3; i++) {
    group.add(box(2, 0.05, 2, mats.orange, -20 + i * 20, 0.55, -39));
  }

  // 港区管理楼
  group.add(box(12, 6, 8, mats.wall, -28, 3, -38));
  group.add(box(12.3, 0.35, 8.3, mats.metalDark, -28, 6.2, -38));
  group.add(box(3, 1.6, 0.2, mats.glass, -28, 3.5, -33.9));
  group.add(box(8, 0.5, 0.3, mats.orange, -28, 5.2, -33.9));

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(74, 24, 30),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.set(0, 8, -42);
  hit.userData.facilityId = 'port';
  group.add(hit);

  return group;
}
