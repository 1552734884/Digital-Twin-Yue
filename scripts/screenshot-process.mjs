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

// 聚焦工艺剖视区
await page.locator('#facility-items button', { hasText: '总装工厂' }).click();
await page.waitForTimeout(1600);
await page.screenshot({ path: 'screenshots/process-line.png' });

// 拆解
await page.locator('#explode-range').fill('85');
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/process-explode.png' });

// 隐藏顶盖
await page.locator('.layer-chip[data-key="cover"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/process-layers.png' });

// 故障 + 告警
await page.locator('#btn-fault').click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/process-fault.png' });

// 暂停保持连续
const before = await page.evaluate(() => {
  const a = window.__twin.simState.process.arms[0];
  return { state: a.state, progress: Number(a.progress.toFixed(3)) };
});
await page.locator('#btn-pause').click();
await page.waitForTimeout(1200);
const during = await page.evaluate(() => {
  const a = window.__twin.simState.process.arms[0];
  return {
    state: a.state,
    progress: Number(a.progress.toFixed(3)),
    paused: window.__twin.simState.paused,
  };
});
await page.screenshot({ path: 'screenshots/process-paused.png' });
await page.locator('#btn-pause').click();
await page.waitForTimeout(300);

const after = await page.evaluate(() => {
  const a = window.__twin.simState.process.arms[0];
  return { state: a.state, progress: Number(a.progress.toFixed(3)) };
});

const sim = await page.evaluate(() => {
  const s = window.__twin.simState;
  return {
    arm0: s.process.arms[0],
    arm1: s.process.arms[1],
    insp: s.process.inspection,
    module: s.process.module,
    faulted: s.traffic.faulted,
    paused: s.paused,
  };
});

console.log(JSON.stringify({ errors, before, during, after, sim }, null, 2));
await browser.close();
