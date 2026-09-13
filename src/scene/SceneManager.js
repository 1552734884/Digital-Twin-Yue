import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLighting, createEnvironment } from './Lighting.js';
import { palette } from '../config/palette.js';

/**
 * 场景、渲染器、相机、控制器的统一生命周期管理
 */
export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.8,
      420,
    );
    this.camera.position.set(105, 72, 125);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 180;
    this.controls.target.set(0, 4, -12);
    this.controls.update();

    this.lights = createLighting(this.scene);
    this.env = createEnvironment(this.scene);

    this.clock = new THREE.Clock();
    this._onResize = () => this.#resize();
    window.addEventListener('resize', this._onResize);
  }

  add(object) {
    this.scene.add(object);
  }

  getElapsedTime() {
    return this.clock.getElapsedTime();
  }

  update() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.renderer.dispose();
  }

  #resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

export { palette };
