import * as THREE from 'three';
import { box, cylinder } from './MaterialLibrary.js';

/**
 * 总装工厂：长条厂房 + 锯齿屋面 + 排风塔 + 侧翼
 */
export function createFactory(mats) {
  const group = new THREE.Group();
  group.name = 'assembly';
  group.userData.facilityId = 'assembly';

  // 主厂房体
  const main = box(56, 14, 36, mats.wall, 0, 7, 0);
  group.add(main);

  // 檐口橙色饰带
  group.add(box(56.4, 0.5, 36.4, mats.orange, 0, 13.8, 0));
  group.add(box(56.4, 0.35, 0.6, mats.orangeDeep, 0, 1.2, 18.2));

  // 锯齿屋面
  for (let i = 0; i < 5; i++) {
    const x = -20 + i * 10;
    const saw = box(9, 3.2, 36, mats.roof, x, 15.6, 0);
    group.add(saw);
    // 玻璃天窗侧
    group.add(box(0.4, 2.6, 35.6, mats.glass, x + 4.4, 15.6, 0));
  }

  // 屋脊通风
  for (let i = 0; i < 6; i++) {
    const vent = cylinder(1.1, 1.3, 1.8, mats.metal, -22 + i * 9, 18.2, 0, 12);
    group.add(vent);
    group.add(cylinder(0.9, 0.9, 0.4, mats.orange, -22 + i * 9, 19.2, 0, 12));
  }

  // 侧翼办公
  const wing = box(16, 10, 14, mats.wall, 36, 5, -8);
  group.add(wing);
  group.add(box(16.3, 0.4, 14.3, mats.metalDark, 36, 10.1, -8));
  // 玻璃幕墙
  for (let i = 0; i < 3; i++) {
    group.add(box(4.2, 3.2, 0.25, mats.glass, 30 + i * 4.6, 5.5, -15.1));
  }

  // 大门与装卸口
  group.add(box(12, 7, 0.4, mats.panelDark, 0, 3.5, 18.2));
  group.add(box(2.5, 6.5, 0.5, mats.orange, -6.5, 3.25, 18.35));
  group.add(box(2.5, 6.5, 0.5, mats.orange, 6.5, 3.25, 18.35));

  // 装卸平台
  group.add(box(18, 1.1, 4, mats.metalDark, 0, 0.55, 21.5));
  for (let i = 0; i < 4; i++) {
    group.add(box(3.5, 2.8, 0.3, mats.metal, -6.5 + i * 4.4, 1.6, 20.2));
  }

  // 烟囱 / 排气
  group.add(cylinder(0.8, 1, 12, mats.metalDark, -24, 20, -14, 14));
  group.add(cylinder(1.1, 1.1, 0.6, mats.orange, -24, 26.2, -14, 14));

  // 侧墙结构柱节奏
  for (let i = 0; i < 8; i++) {
    group.add(box(0.7, 13.5, 0.5, mats.metal, -26 + i * 7.5, 6.8, 18.15));
  }

  // 地基
  group.add(box(60, 0.4, 40, mats.groundDark, 0, 0.2, 0));

  // 招牌
  group.add(box(14, 1.8, 0.35, mats.panelDark, 0, 9.5, 18.35));
  group.add(box(12.5, 1.2, 0.15, mats.orange, 0, 9.5, 18.55));

  // 交互占位：整体包围
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(62, 28, 42),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.set(0, 10, 0);
  hit.userData.facilityId = 'assembly';
  group.add(hit);

  return group;
}
