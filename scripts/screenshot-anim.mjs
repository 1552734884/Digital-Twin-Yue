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
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'screenshots/anim-overview.png' });

// 聚焦总装工厂（含工艺剖视区）
await page.locator('#facility-items button', { hasText: '总装工厂' }).click();
await page.waitForTimeout(1400);
await page.screenshot({ path: 'screenshots/anim-assembly.png' });

// 模组拆解
await page.locator('#explode-range').fill('70');
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/anim-explode.png' });

// 关闭一层零件
await page.locator('.layer-chip[data-key="cover"]').click();
await page.waitForTimeout(400);

// 触发车辆故障
await page.locator('#btn-fault').click();
await page.waitForTimeout(800);
await page.screenshot({ path: 'screenshots/anim-fault.png' });

// 暂停
await page.locator('#btn-pause').click();
await page.waitForTimeout(400);
const pausedLabel = await page.locator('#btn-pause').textContent();
await page.screenshot({ path: 'screenshots/anim-paused.png' });

// 恢复
await page.locator('#btn-pause').click();
await page.waitForTimeout(400);
const resumedLabel = await page.locator('#btn-pause').textContent();

const sim = await page.evaluate(() => {
  const s = window.__twin?.simState;
  if (!s) return null;
  return {
    paused: s.paused,
    arm0: s.process.arms[0],
    arm1: s.process.arms[1],
    inspection: s.process.inspection,
    module: s.process.module,
    signal: s.traffic.signal,
    vehicle0: s.traffic.vehicles[0],
    faulted: s.traffic.faulted,
    alarms: s.traffic.alarms.length,
  };
});

console.log(JSON.stringify({ errors, pausedLabel, resumedLabel, sim }, null, 2));
await browser.close();
