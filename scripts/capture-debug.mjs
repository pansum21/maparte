import { chromium } from "playwright";
import path from "path";

const artifactDir = "C:/Users/supri/.gemini/antigravity/brain/19982f29-f192-4491-bd83-e895589765cd";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Close startup modal
  const okBtn = page.locator('button:has-text("OK")').first();
  if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await okBtn.click();
    await page.waitForTimeout(500);
  }

  // 1. Open Location modal
  const locNavBtn = page.locator('button[aria-label="Location"]').first();
  if (await locNavBtn.isVisible()) {
    await locNavBtn.click();
    await page.waitForTimeout(800);
    // Click South Asia
    const southAsiaBtn = page.locator('.all-cities-continent-pill:has-text("South Asia")').first();
    if (await southAsiaBtn.isVisible()) {
      await southAsiaBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(artifactDir, "debug_location_modal.png") });
    console.log("Captured debug_location_modal.png");
    // Close location modal
    const closeBtn = page.locator('.all-cities-close-btn').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 2. Open Edit Map (Rotation)
  const editMapNavBtn = page.locator('button[aria-label="Edit Map"]').first();
  if (await editMapNavBtn.isVisible()) {
    await editMapNavBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, "debug_rotation_panel.png") });
    console.log("Captured debug_rotation_panel.png");
    // Close edit map
    await editMapNavBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Open Theme panel
  const themeNavBtn = page.locator('button[aria-label="Theme"], button[title*="Theme"]').first();
  if (await themeNavBtn.isVisible()) {
    await themeNavBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, "debug_theme_panel.png") });
    console.log("Captured debug_theme_panel.png");
    // Close theme panel
    await themeNavBtn.click();
    await page.waitForTimeout(500);
  }

  // 4. Open Wall Mockup modal (Solid tab)
  const wallNavBtn = page.locator('button[aria-label="Wall color"], .desktop-nav-row--wall button').first();
  if (await wallNavBtn.isVisible()) {
    await wallNavBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, "debug_wall_modal_solid.png") });
    console.log("Captured debug_wall_modal_solid.png");

    // 5. Switch to Gradient tab
    const gradientTabBtn = page.locator('.backdrop-nav-tab:has-text("Gradient Wall")').first();
    if (await gradientTabBtn.isVisible()) {
      await gradientTabBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, "debug_wall_modal_gradient.png") });
      console.log("Captured debug_wall_modal_gradient.png");
    }
  }

  await browser.close();
  console.log("Done!");
}

main().catch(console.error);
