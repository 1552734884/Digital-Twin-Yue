import * as THREE from 'three';
import { box, cylinder } from './MaterialLibrary.js';

/**
 * 通用仓储建筑
 */
function createWarehouse(mats, options) {
  const {
    id,
    name,
    width = 30,
    depth = 18,
    height = 8,
    colorMat = mats.warehouse,
    docks = 4,
    accent = mats.orange,
  } = options;

  const group = new THREE.Group();
  group.name = id;
  group.userData.facilityId = id;
  group.userData.label = name;

  // 主体
  group.add(box(width, height, depth, colorMat, 0, height / 2, 0));

  // 双坡屋面
  const roof = box(width + 0.6, 0.5, depth + 0.6, mats.roof, 0, height + 0.25, 0);
  group.add(roof);

  // 屋脊线
  group.add(box(width + 0.8, 0.15, 0.8, accent, 0, height + 0.55, 0));

  // 侧墙竖缝
  const cols = Math.floor(width / 4);
  for (let i = 0; i <= cols; i++) {
    const x = -width / 2 + i * (width / cols);
    group.add(box(0.25, height - 0.4, 0.3, mats.metal, x, height / 2, depth / 2 - 0.05));
  }

  // 装卸月台
  const dockW = width / docks;
  for (let i = 0; i < docks; i++) {
    const x = -width / 2 + dockW * (i + 0.5);
    group.add(box(dockW * 0.55, 3.6, 0.35, mats.panelDark, x, 1.9, depth / 2 + 0.1));
    group.add(box(dockW * 0.65, 0.9, 2.2, mats.metalDark, x, 0.45, depth / 2 + 1.2));
    group.add(box(0.35, 3.2, 0.35, accent, x - dockW * 0.35, 1.6, depth / 2 + 0.15));
    group.add(box(0.35, 3.2, 0.35, accent, x + dockW * 0.35, 1.6, depth / 2 + 0.15));
  }

  // 办公附楼
  group.add(box(8, 5.5, depth * 0.55, mats.wall, width / 2 + 3.5, 2.75, -depth * 0.15));
  group.add(box(8.3, 0.35, depth * 0.55 + 0.3, mats.metalDark, width / 2 + 3.5, 5.7, -depth * 0.15));
  group.add(box(3.2, 2.2, 0.2, mats.glass, width / 2 + 3.5, 3.2, -depth * 0.15 + depth * 0.28));

  // 屋顶设备
  for (let i = 0; i < 3; i++) {
    group.add(box(2.2, 0.8, 2.2, mats.metal, -width / 4 + i * 5, height + 0.9, 0));
  }

  // 地基
  group.add(box(width + 4, 0.35, depth + 5, mats.groundDark, 0, 0.18, 1));

  // 停车划线（门前）
  for (let i = 0; i < 3; i++) {
    group.add(box(0.15, 0.02, 3, mats.roadMark, -4 + i * 3, 0.08, depth / 2 + 5));
  }

  // 命中盒
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(width + 8, height + 4, depth + 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.set(1, height / 2, 1);
  hit.userData.facilityId = id;
  group.add(hit);

  return group;
}

export function createWarehouseA(mats) {
  const g = createWarehouse(mats, {
    id: 'warehouse-a',
    name: '原料仓储 A',
    width: 32,
    depth: 20,
    height: 9,
    docks: 4,
  });
  g.position.set(-52, 0, 18);
  return g;
}

export function createWarehouseB(mats) {
  const g = createWarehouse(mats, {
    id: 'warehouse-b',
    name: '成品仓储 B',
    width: 28,
    depth: 16,
    height: 8,
    docks: 3,
  });
  g.position.set(48, 0, 28);
  g.rotation.y = Math.PI / 2;
  return g;
}

/** 中控中心 */
export function createControlCenter(mats) {
  const group = new THREE.Group();
  group.name = 'control';
  group.userData.facilityId = 'control';

  // 主楼
  group.add(box(18, 12, 12, mats.wall, 0, 6, 0));
  // 玻璃带
  group.add(box(17.2, 3.5, 0.3, mats.glass, 0, 7.5, 6.1));
  group.add(box(0.3, 3.5, 11.2, mats.glass, 9.1, 7.5, 0));
  // 顶冠
  group.add(box(18.6, 0.6, 12.6, mats.metalDark, 0, 12.3, 0));
  group.add(box(6, 2.2, 6, mats.panelDark, 0, 13.7, 0));
  group.add(box(5.2, 0.4, 0.3, mats.orange, 0, 13.7, 3.15));

  // 雷达 / 天线
  group.add(cylinder(0.25, 0.35, 4, mats.metal, 4, 16, 0, 10));
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    mats.metal,
  );
  dish.position.set(4, 18, 0);
  dish.rotation.x = -0.6;
  dish.castShadow = true;
  group.add(dish);

  // 入口雨棚
  group.add(box(10, 0.4, 3.5, mats.metalDark, 0, 4.2, 7.5));
  group.add(box(0.4, 4.2, 0.4, mats.metal, -4.5, 2.1, 8.8));
  group.add(box(0.4, 4.2, 0.4, mats.metal, 4.5, 2.1, 8.8));

  // 地基
  group.add(box(22, 0.4, 16, mats.groundDark, 0, 0.2, 1));

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(22, 22, 16),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.set(0, 10, 0);
  hit.userData.facilityId = 'control';
  group.add(hit);

  group.position.set(16, 0, 12);
  return group;
}
