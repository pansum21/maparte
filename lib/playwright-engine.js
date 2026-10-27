import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * MapArte 4K Ultra-Clarity Playwright Engine
 *
 * Implements the 4 essential settings for 100% accurate vector map screenshots:
 * 1. WebGL & GPU Flags: --enable-webgl, --use-gl=angle, --ignore-gpu-blocklist
 * 2. 6-Second Wait: waitForTimeout(6000) for vector tiles and roads to stabilize
 * 3. 4K Ultra Clarity: viewport 1920x1080 with deviceScaleFactor = 2 (3840x2160)
 * 4. Target Container: Screenshots only the poster frame (.poster-frame), excluding UI chrome
 */

export const CHROMIUM_FLAGS = [
  "--enable-webgl",
  "--use-gl=angle",
  "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization",
  "--enable-features=Vulkan,DefaultANGLEVulkan",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  "--mute-audio",
];

export const VIEWPORT_CONFIG = {
  width: 1920,
  height: 1080,
};

export const DEVICE_SCALE_FACTOR = 2; // Renders in 4K UHD Ultra-Clarity

export const POSTER_CONTAINER_SELECTOR = ".poster-frame";

/**
 * Launches Chromium with WebGL and GPU acceleration flags enabled.
 * Automatically utilizes installed Google Chrome or bundled Chromium.
 */
export async function launchPlaywrightEngine(options = {}) {
  const {
    headless = true,
    additionalArgs = [],
    channel = "chrome",
    executablePath = process.env.CHROME_PATH,
  } = options;

  const args = [...CHROMIUM_FLAGS, ...additionalArgs];

  const launchOptions = {
    headless,
    args,
  };

  if (executablePath && fs.existsSync(executablePath)) {
    launchOptions.executablePath = executablePath;
  } else if (channel) {
    launchOptions.channel = channel;
  }

  try {
    const browser = await chromium.launch(launchOptions);
    return browser;
  } catch {
    // Fallback to default bundled chromium if channel fails
    delete launchOptions.channel;
    delete launchOptions.executablePath;
    return await chromium.launch(launchOptions);
  }
}

/**
 * Creates a browser context calibrated for 4K Ultra-Clarity rendering.
 */
export async function createUltraClarityContext(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || VIEWPORT_CONFIG,
    deviceScaleFactor: options.deviceScaleFactor || DEVICE_SCALE_FACTOR,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MapArteBot/1.0",
    ...options,
  });

  return context;
}

/**
 * Dismisses startup modals, consent banners, or dialogs.
 */
export async function dismissStartupModals(page) {
  try {
    await page.evaluate(() => {
      const dismissBtns = Array.from(
        document.querySelectorAll(
          ".startup-modal-dismiss, .modal-close-btn, .startup-location-modal button, button"
        )
      );
      const okBtn = dismissBtns.find(
        (b) =>
          b.textContent &&
          (b.textContent.trim() === "OK" ||
            b.textContent.trim() === "Got it" ||
            b.textContent.trim() === "Dismiss")
      );
      if (okBtn) okBtn.click();
    });
  } catch {}
}

/**
 * Captures a crisp, 4K poster screenshot for a city or custom map URL.
 *
 * @param {Object} params
 * @param {string} params.url - URL of the MapArte app or city page (e.g. http://localhost:5173 or https://maparte.vercel.app/cities/paris)
 * @param {string} [params.cityName] - Optional city to search and select
 * @param {string} params.outputPath - File path where screenshot will be saved (.png or .jpg)
 * @param {number} [params.waitMs=6000] - Stabilization wait timeout (Default: 6000ms)
 * @param {string} [params.selector='.poster-frame'] - Target poster frame selector
 * @param {string} [params.format='png'] - 'png' or 'jpeg'
 * @param {number} [params.quality=95] - Quality (1-100) for jpeg
 */
export async function capturePosterScreenshot({
  url = "http://localhost:5173",
  cityName,
  outputPath,
  waitMs = 6000,
  selector = POSTER_CONTAINER_SELECTOR,
  format = "png",
  quality = 95,
  headless = true,
}) {
  if (!outputPath) {
    throw new Error("capturePosterScreenshot requires an outputPath parameter.");
  }

  const browser = await launchPlaywrightEngine({ headless });

  try {
    const context = await createUltraClarityContext(browser);
    const page = await context.newPage();

    console.log(`[PlaywrightEngine] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

    // Dismiss any initial modals
    await dismissStartupModals(page);

    // If a specific city was requested, search or click popular city pill
    if (cityName) {
      console.log(`[PlaywrightEngine] Selecting city: ${cityName}`);
      const selected = await page.evaluate((name) => {
        // 1. Try finding a popular city pill matching name
        const pills = Array.from(document.querySelectorAll(".popular-city-pill"));
        const pill = pills.find(
          (p) => p.textContent && p.textContent.toLowerCase().includes(name.toLowerCase())
        );
        if (pill) {
          pill.click();
          return { method: "pill", name };
        }

        // 2. Otherwise type into the location search input
        const input = document.querySelector('input[name="location"]');
        if (input) {
          input.focus();
          input.value = name;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          return { method: "input", name };
        }
        return false;
      }, cityName);

      if (selected && selected.method === "input") {
        await page.waitForTimeout(1200);
        await page.evaluate(() => {
          const firstSuggestion = document.querySelector(
            ".location-suggestion-item, .suggestion-item"
          );
          if (firstSuggestion) firstSuggestion.click();
        });
      }
    }

    // Mandatory 6-second wait: Allows map vector tiles, roads, and typography to fully stabilize
    console.log(
      `[PlaywrightEngine] Waiting ${waitMs}ms for WebGL vector tiles, roads, and typography to stabilize...`
    );
    await page.waitForTimeout(waitMs);

    // Ensure MapLibre map is fully idle and all tiles are loaded
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const mapEl = document.querySelector(".maplibregl-map");
        if (mapEl && (mapEl)._map) {
          const map = (mapEl)._map;
          if (map.loaded() && map.areTilesLoaded()) {
            resolve(true);
            return;
          }
          map.once("idle", () => resolve(true));
          setTimeout(resolve, 3000); // safety fallback
        } else {
          resolve(true);
        }
      });
    });

    // Locate the poster container (.poster-frame)
    console.log(`[PlaywrightEngine] Locating target poster element: ${selector}`);
    const posterElement = page.locator(selector).first();

    const isVisible = await posterElement.isVisible().catch(() => false);
    const target = isVisible ? posterElement : page.locator(".poster-viewport, .preview-panel").first();

    // Ensure target output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Capture the 4K Ultra-Clarity screenshot
    console.log(`[PlaywrightEngine] Capturing 4K screenshot to: ${outputPath}`);
    const screenshotOptions = {
      path: outputPath,
      type: format === "jpg" || format === "jpeg" ? "jpeg" : "png",
    };

    if (screenshotOptions.type === "jpeg") {
      screenshotOptions.quality = quality;
    }

    await target.screenshot(screenshotOptions);
    console.log(`[PlaywrightEngine] Successfully saved 4K screenshot: ${outputPath}`);

    await context.close();
    return outputPath;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// CLI Execution Handler
// ---------------------------------------------------------------------------
if (import.meta.main || (process.argv[1] && process.argv[1].includes("playwright-engine.js"))) {
  const args = process.argv.slice(2);
  const cityArg = args.find((a) => a.startsWith("--city="))?.split("=")[1];
  const urlArg = args.find((a) => a.startsWith("--url="))?.split("=")[1] || "http://localhost:5173";
  const outputArg =
    args.find((a) => a.startsWith("--output="))?.split("=")[1] ||
    `./screenshot-${cityArg || "poster"}.png`;
  const waitArg = Number(args.find((a) => a.startsWith("--wait="))?.split("=")[1] || "6000");

  console.log("=== MapArte 4K Playwright Screenshot Engine ===");
  console.log(`City: ${cityArg || "(current default)"}`);
  console.log(`URL: ${urlArg}`);
  console.log(`Output: ${outputArg}`);
  console.log(`Wait: ${waitArg}ms`);

  capturePosterScreenshot({
    url: urlArg,
    cityName: cityArg,
    outputPath: outputArg,
    waitMs: waitArg,
  })
    .then((saved) => {
      console.log(`Done! Screenshot ready at: ${saved}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error capturing poster screenshot:", err);
      process.exit(1);
    });
}
