import * as THREE from 'three';
import { createMaterialLibrary, optimizeShadows } from './MaterialLibrary.js';
import { createGround, createRoads } from './Roads.js';
import { createFactory } from './Factory.js';
import {
  createWarehouseA,
  createWarehouseB,
  createControlCenter,
} from './Warehouse.js';
import { createPort } from './Port.js';
import { createGroundProps } from './Props.js';

/**
 * 组装完整基地场景模型根节点
 */
export function createBatteryBase() {
  const mats = createMaterialLibrary();
  const root = new THREE.Group();
  root.name = 'BatteryAssemblyBase';

  root.add(createGround(mats));
  root.add(createRoads(mats));
  root.add(createFactory(mats));
  root.add(createWarehouseA(mats));
  root.add(createWarehouseB(mats));
  root.add(createControlCenter(mats));
  root.add(createPort(mats));
  root.add(createGroundProps(mats));

  // 性能：限制阴影投射数量，关闭过小物件投影
  const shadowCount = optimizeShadows(root, { maxShadowMeshes: 280 });

  const pickables = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.userData?.facilityId) {
      pickables.push(obj);
    }
  });

  return { root, mats, pickables, shadowCount };
}

export { createMaterialLibrary };
