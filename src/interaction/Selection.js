import * as THREE from 'three';
import { facilities } from '../config/palette.js';

/**
 * Raycaster 点击选中 + 镜头平滑聚焦
 */
export class SelectionSystem {
  /**
   * @param {object} opts
   * @param {THREE.Scene} opts.scene
   * @param {import('three').Camera} opts.camera
   * @param {import('three').WebGLRenderer} opts.renderer
   * @param {import('three').OrbitControls} opts.controls
   * @param {() => THREE.Object3D[]} opts.getPickables
   * @param {(facilityId: string|null) => void} [opts.onSelect]
   */
  constructor({ scene, camera, renderer, controls, getPickables, onSelect }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.getPickables = getPickables;
    this.onSelect = onSelect || (() => {});

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selectedId = null;
    this.highlight = null;
    this.highlightRing = null;
    this.focusAnim = null;

    this._pointerDown = null;
    this._onPointerDown = (e) => {
      this._pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    this._onPointerUp = (e) => {
      if (!this._pointerDown) return;
      const dx = e.clientX - this._pointerDown.x;
      const dy = e.clientY - this._pointerDown.y;
      const dt = performance.now() - this._pointerDown.t;
      this._pointerDown = null;
      if (dx * dx + dy * dy > 36 || dt > 400) return;
      this.#handleClick(e);
    };

    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this._onPointerUp);
  }

  selectById(id, { focus = true } = {}) {
    const facility = facilities.find((f) => f.id === id);
    if (!facility) {
      this.clearSelection();
      return;
    }
    this.selectedId = id;
    this.#applyHighlight(id);
    this.onSelect(id);
    if (focus) this.focusOn(facility.camera.position, facility.camera.target);
  }

  clearSelection() {
    this.selectedId = null;
    this.#removeHighlight();
    this.onSelect(null);
  }

  /** 平滑飞行到目标视角 */
  focusOn(position, target, duration = 1.1) {
    this.focusAnim = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPos: new THREE.Vector3(...position),
      toTarget: new THREE.Vector3(...target),
      t: 0,
      duration,
    };
  }

  isFocusing() {
    return Boolean(this.focusAnim);
  }

  cancelFocus() {
    this.focusAnim = null;
  }

  update(delta) {
    if (!this.focusAnim) return;
    const a = this.focusAnim;
    a.t = Math.min(1, a.t + delta / a.duration);
    const k = easeInOutCubic(a.t);
    this.camera.position.lerpVectors(a.fromPos, a.toPos, k);
    this.controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
    this.controls.update();
    if (a.t >= 1) this.focusAnim = null;
  }

  dispose() {
    this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.#removeHighlight();
  }

  #handleClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const pickables = this.getPickables().filter(
      (m) => m.visible && m.userData?.facilityId,
    );
    const hits = this.raycaster.intersectObjects(pickables, false);
    if (!hits.length) {
      if (this.selectedId) {
        this.selectedId = null;
        this.#removeHighlight();
        this.onSelect(null);
      }
      return;
    }

    const id = hits[0].object.userData.facilityId;
    this.selectById(id, { focus: true });
  }

  #applyHighlight(id) {
    this.#removeHighlight();
    const target = this.getPickables().find((m) => m.userData?.facilityId === id);
    if (!target) return;

    const box = new THREE.Box3().setFromObject(target);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const geo = new THREE.BoxGeometry(size.x + 0.6, size.y + 0.6, size.z + 0.6);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: 0xff6b1a,
        transparent: true,
        opacity: 0.95,
      }),
    );
    line.position.copy(center);
    line.renderOrder = 20;
    this.scene.add(line);
    this.highlight = line;

    const radius = Math.max(size.x, size.z) * 0.45;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + 0.8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xff6b1a,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x, Math.max(box.min.y + 0.08, 0.1), center.z);
    this.scene.add(ring);
    this.highlightRing = ring;
  }

  #removeHighlight() {
    if (this.highlight) {
      this.scene.remove(this.highlight);
      this.highlight.geometry.dispose();
      this.highlight.material.dispose();
    }
    if (this.highlightRing) {
      this.scene.remove(this.highlightRing);
      this.highlightRing.geometry.dispose();
      this.highlightRing.material.dispose();
    }
    this.highlight = null;
    this.highlightRing = null;
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
