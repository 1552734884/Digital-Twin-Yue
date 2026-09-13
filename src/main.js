import { SceneManager } from './scene/SceneManager.js';
import { createBatteryBase } from './models/BatteryBase.js';
import { SelectionSystem } from './interaction/Selection.js';
import { AutoTour } from './interaction/AutoTour.js';
import { BaseSimulator } from './simulation/Simulator.js';
import { HUD } from './ui/HUD.js';

function bootstrap() {
  const canvas = document.getElementById('viewport');
  const sceneManager = new SceneManager(canvas);
  const { root, mats, pickables } = createBatteryBase();
  sceneManager.add(root);

  let hud;
  let tour;
  let lastUiPush = 0;
  let simState = null;

  const selection = new SelectionSystem({
    scene: sceneManager.scene,
    camera: sceneManager.camera,
    renderer: sceneManager.renderer,
    controls: sceneManager.controls,
    getPickables: () => pickables,
    onSelect: (id) => {
      if (id) {
        hud.showDetail(id);
        tour?.takeover();
      } else {
        hud.hideDetail();
      }
    },
  });

  tour = new AutoTour({
    selection,
    canvas,
    onChange: () => hud?.updateTour(tour),
  });

  const simulator = new BaseSimulator(root, mats);

  hud = new HUD({
    onSelectFacility: (id) => {
      tour.takeover();
      selection.selectById(id, { focus: true });
    },
    onCloseDetail: () => selection.clearSelection(),
    onTogglePause: () => {
      simulator.togglePause();
      if (simState) hud.updateSimView(simulator.update(0));
    },
    onExplode: (t) => simulator.setExplode(t),
    onToggleLayer: (key) => {
      simulator.toggleLayer(key);
      if (simState) hud.updateSimView(simulator.update(0));
    },
    onForceFault: () => simulator.forceFault(),
    onToggleTour: () => tour.toggle(),
    onTourNext: () => tour.next(),
    onTourPrev: () => tour.prev(),
    onTourShot: (id) => {
      tour.takeover();
      tour.goTo(id);
    },
  });

  simState = simulator.update(0);
  hud.updateMetrics(simulator.getGlobalMetrics());
  hud.updateClock(simState.elapsed);
  hud.updateSimView(simState);
  hud.updateTour(tour);

  function frame() {
    const rawDelta = sceneManager.clock.getDelta();

    selection.update(rawDelta);
    tour.update(rawDelta);
    simState = simulator.update(rawDelta);
    sceneManager.update();

    if (rawDelta > 0) {
      const elapsed = performance.now() / 1000;
      if (elapsed - lastUiPush > 0.12 || lastUiPush === 0) {
        hud.updateSimView(simState);
        hud.updateMetrics(simulator.getGlobalMetrics());
        hud.updateClock(simState.elapsed);
        hud.updateTour(tour);
        lastUiPush = elapsed;
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  window.__twin = {
    sceneManager,
    selection,
    tour,
    simulator,
    hud,
    get simState() {
      return simState;
    },
  };
}

bootstrap();
