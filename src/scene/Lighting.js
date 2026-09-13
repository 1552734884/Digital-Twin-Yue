import * as THREE from 'three';
import { palette } from '../config/palette.js';

export function createLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc8ced6, 0.9);
  hemi.position.set(0, 80, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(70, 95, 45);
  sun.castShadow = true;
  // 收紧阴影相机范围，提高有效分辨率，减轻闪烁
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95;
  sun.shadow.camera.bottom = -95;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 1.4;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0xffe0c8, 0.32);
  fill.position.set(-50, 40, -30);
  scene.add(fill);

  return { hemi, sun, fill };
}

export function createEnvironment(scene) {
  scene.background = new THREE.Color(palette.paper);
  scene.fog = new THREE.Fog(palette.fog, 130, 340);

  // 网格略抬高，避免与地面共面 z-fighting
  const grid = new THREE.GridHelper(200, 40, 0xc8ced6, 0xdde2e8);
  grid.position.y = 0.06;
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  grid.material.depthWrite = false;
  scene.add(grid);

  return { grid };
}
