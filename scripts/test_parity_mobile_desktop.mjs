import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testParity() {
  console.log('Testing Mobile vs Desktop Download UI & Export Parity...');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Test
  console.log('\n--- 1. DESKTOP TEST (1440x900) ---');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true
  });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto('http://127.0.0.1:5173/?city=Paris&country=France&theme=noir&layout=print_a4_portrait', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForFunction(() => typeof window.map !== 'undefined' && typeof window.exportPoster === 'function', { timeout: 30000 });

  // Wait for map idle
  await desktopPage.evaluate(() => {
    return new Promise(resolve => {
      if (window.map && window.map.loaded && window.map.loaded() && !window.map.isMoving()) {
        resolve();
      } else if (window.map) {
        window.map.once('idle', resolve);
        setTimeout(resolve, 2500);
      } else {
        setTimeout(resolve, 1500);
      }
    });
  });

  // Check Download Button presence and visibility on Desktop
  const desktopBtn = desktopPage.locator('.export-fab-trigger-desktop, [data-testid="export-fab-desktop"], .export-fab-trigger');
  const desktopBtnVisible = await desktopBtn.first().isVisible().catch(() => false);
  console.log(`Desktop Download Button Visible: ${desktopBtnVisible}`);

  // Download on Desktop via window.exportPoster
  console.log('Triggering export on Desktop...');
  const [desktopDl] = await Promise.all([
    desktopPage.waitForEvent('download', { timeout: 45000 }),
    desktopPage.evaluate(async () => {
      await window.exportPoster('png', { asPro: true, targetDpi: 300 });
    })
  ]);
  const desktopPath = path.join(process.cwd(), 'scripts', 'test_desktop_dl.png');
  await desktopDl.saveAs(desktopPath);
  const desktopStat = fs.statSync(desktopPath);
  console.log(`Desktop PNG saved: ${desktopPath} (${(desktopStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  // 2. Mobile Test
  console.log('\n--- 2. MOBILE TEST (iPhone 14 / 390x844) ---');
  const iPhone = devices['iPhone 14'];
  const mobileCtx = await browser.newContext({
    ...iPhone,
    acceptDownloads: true
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto('http://127.0.0.1:5173/?city=Paris&country=France&theme=noir&layout=print_a4_portrait', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForFunction(() => typeof window.map !== 'undefined' && typeof window.exportPoster === 'function', { timeout: 30000 });

  await mobilePage.evaluate(() => {
    return new Promise(resolve => {
      if (window.map && window.map.loaded && window.map.loaded() && !window.map.isMoving()) {
        resolve();
      } else if (window.map) {
        window.map.once('idle', resolve);
        setTimeout(resolve, 2500);
      } else {
        setTimeout(resolve, 1500);
      }
    });
  });

  // Check Download Button presence and visibility on Mobile
  const mobileBtn = mobilePage.locator('.mobile-export-fab-trigger, .export-fab-trigger-mobile, .export-fab-trigger');
  const mobileBtnVisible = await mobileBtn.first().isVisible().catch(() => false);
  console.log(`Mobile Download Button Visible: ${mobileBtnVisible}`);

  // Download on Mobile via window.exportPoster
  console.log('Triggering export on Mobile...');
  const [mobileDl] = await Promise.all([
    mobilePage.waitForEvent('download', { timeout: 45000 }),
    mobilePage.evaluate(async () => {
      await window.exportPoster('png', { asPro: true, targetDpi: 300 });
    })
  ]);
  const mobilePath = path.join(process.cwd(), 'scripts', 'test_mobile_dl.png');
  await mobileDl.saveAs(mobilePath);
  const mobileStat = fs.statSync(mobilePath);
  console.log(`Mobile PNG saved: ${mobilePath} (${(mobileStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  await browser.close();

  console.log('\n--- SUMMARY ---');
  console.log(`Desktop size: ${desktopStat.size} bytes`);
  console.log(`Mobile size:  ${mobileStat.size} bytes`);
}

testParity().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
