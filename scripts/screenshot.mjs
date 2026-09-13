import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.URL || 'http://localhost:5173';
await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: 'screenshots/overview.png', fullPage: false });

await page.locator('#facility-items button', { hasText: '总装工厂' }).click();
await page.waitForTimeout(1400);
await page.screenshot({ path: 'screenshots/focus-assembly.png', fullPage: false });

await page.locator('#facility-items button', { hasText: '港区码头' }).click();
await page.waitForTimeout(1400);
await page.screenshot({ path: 'screenshots/focus-port.png', fullPage: false });

const detailVisible = await page.locator('#detail-panel').isVisible();
const detailName = await page.locator('#detail-name').textContent();
const metrics = await page.locator('#global-metrics').innerText();
const webgl = await page.evaluate(() => {
  const c = document.getElementById('viewport');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return Boolean(gl);
});

console.log(JSON.stringify({ errors, detailVisible, detailName, metrics, webgl }, null, 2));
await browser.close();
