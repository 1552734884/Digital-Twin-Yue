import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.URL || 'http://localhost:5173';
await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);

// 细节镜头
for (const shot of ['workshop', 'arm', 'inspection', 'port']) {
  await page.locator(`.shot-chip[data-id="${shot}"]`).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `screenshots/shot-${shot}.png` });
}

// 开始巡游
await page.locator('#btn-tour').click();
await page.waitForTimeout(500);
const tourOn = await page.locator('#tour-label').textContent();

// 鼠标接管
await page.locator('#viewport').dispatchEvent('pointerdown', { clientX: 640, clientY: 400, button: 0 });
await page.waitForTimeout(300);
const tourAfterTakeover = await page.locator('#tour-label').textContent();

// 车辆与工件状态
const sim = await page.evaluate(() => {
  const s = window.__twin.simState;
  const arm = s.process.arms[0];
  // 采样 3 秒车辆间距
  return {
    tourEnabled: window.__twin.tour.enabled,
    vehicles: s.traffic.vehicles.map((v) => ({
      id: v.id,
      state: v.state,
      pos: v.pos,
      speed: v.speed,
    })),
    collisions: s.traffic.collisions,
    inBuildingHits: s.traffic.vehicles.filter((v) => {
      // rough check already in sim
      return false;
    }).length,
    arm: { state: arm.state, hasWorkpiece: arm.hasWorkpiece },
    shadowCastersHint: window.__twin.sceneManager.renderer.info.render,
  };
});

// 运行几秒后检查是否仍在建筑外、是否相撞
await page.waitForTimeout(2500);
const sim2 = await page.evaluate(() => {
  const s = window.__twin.simState;
  const boxes = [
    { minX: -30, maxX: -5.5, minZ: -20, maxZ: 2.5 },
    { minX: 5.5, maxX: 30, minZ: -20, maxZ: 2.5 },
    { minX: -70, maxX: -58, minZ: 6, maxZ: 32 },
    { minX: 36, maxX: 66, minZ: 14, maxZ: 40 },
    { minX: -12, maxX: 12, minZ: 30, maxZ: 44 },
  ];
  const inB = (x, z) => boxes.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
  const positions = s.traffic.vehicles.map((v) => ({ id: v.id, x: v.pos[0], z: v.pos[1] }));
  let minPair = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i].x - positions[j].x;
      const dz = positions[i].z - positions[j].z;
      minPair = Math.min(minPair, Math.hypot(dx, dz));
    }
  }
  return {
    vehiclesInBuilding: positions.filter((p) => inB(p.x, p.z)),
    minPairDistance: Number(minPair.toFixed(2)),
    collisions: s.traffic.collisions,
    arm: s.process.arms[0],
  };
});

await page.screenshot({ path: 'screenshots/shot-after-tour.png' });

console.log(JSON.stringify({ errors, tourOn, tourAfterTakeover, sim, sim2 }, null, 2));
await browser.close();
