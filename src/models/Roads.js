import * as THREE from 'three';
import { box, plane } from './MaterialLibrary.js';

/** 基地道路网络：主干道 + 支路 + 标线 */
export function createRoads(mats) {
  const group = new THREE.Group();
  group.name = 'Roads';

  const roadY = 0.04;
  const roads = [
    // 南北主干
    { w: 8, l: 180, x: 0, z: 0 },
    // 东西主干
    { w: 180, l: 8, x: 0, z: 8 },
    // 工厂西侧支路
    { w: 6, l: 70, x: -24, z: -20 },
    // 仓储连接
    { w: 6, l: 50, x: -52, z: 28 },
    // 港区联络
    { w: 7, l: 40, x: 0, z: -40 },
  ];

  for (const r of roads) {
    const isNS = r.l > r.w;
    const road = isNS
      ? box(r.w, 0.08, r.l, mats.road, r.x, roadY, r.z)
      : box(r.w, 0.08, r.l, mats.road, r.x, roadY, r.z);
    road.castShadow = false;
    group.add(road);

    // 中线（抬高避免与路面共面闪烁）
    if (isNS) {
      for (let z = -r.l / 2 + 4; z < r.l / 2 - 4; z += 8) {
        const m = box(0.25, 0.02, 3, mats.roadMark, r.x, roadY + 0.07, r.z + z, {
          castShadow: false,
        });
        group.add(m);
      }
    } else {
      for (let x = -r.w / 2 + 4; x < r.w / 2 - 4; x += 8) {
        const m = box(3, 0.02, 0.25, mats.roadMark, r.x + x, roadY + 0.07, r.z, {
          castShadow: false,
        });
        group.add(m);
      }
    }
  }

  // 入口环岛
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6, 9, 40),
    mats.road,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, roadY + 0.02, 52);
  ring.receiveShadow = true;
  ring.castShadow = false;
  group.add(ring);

  // 环岛内圆
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 32), mats.grass);
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, roadY + 0.035, 52);
  disc.receiveShadow = true;
  disc.castShadow = false;
  group.add(disc);

  // 入口门柱
  group.add(box(1.2, 5, 1.2, mats.metalDark, -6.5, 2.5, 62));
  group.add(box(1.2, 5, 1.2, mats.metalDark, 6.5, 2.5, 62));
  group.add(box(14.2, 0.8, 1.2, mats.orange, 0, 5.2, 62));
  group.add(box(4, 1.6, 0.3, mats.panelDark, 0, 4.2, 61.8));

  return group;
}

/** 地面与分区底板 */
export function createGround(mats) {
  const group = new THREE.Group();
  group.name = 'Ground';

  group.add(plane(240, 200, mats.ground, 0, 0, 0));

  // 港区水面
  const water = plane(240, 55, mats.water, 0, 0.02, -78);
  water.position.y = 0.02;
  group.add(water);

  // 码头岸线
  group.add(box(240, 0.35, 3, mats.quay, 0, 0.18, -52));

  // 草地带
  group.add(plane(18, 70, mats.grass, -78, 0.01, 10));
  group.add(plane(14, 40, mats.grass, 78, 0.01, 20));
  group.add(plane(30, 12, mats.grass, 0, 0.01, 70));

  // 停车场
  const lot = box(28, 0.06, 16, mats.road, 28, 0.03, 48);
  lot.castShadow = false;
  group.add(lot);
  for (let i = 0; i < 7; i++) {
    group.add(box(0.2, 0.02, 4, mats.roadMark, 16 + i * 4, 0.07, 48));
  }

  return group;
}
