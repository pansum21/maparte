/**
 * Renders the poster art used by the motion lab.
 *
 * The lab has to show what the product actually prints, not one reused photo:
 * a different city, theme and typeface in every frame. This drives the running
 * app through its deep-link parameters and screenshots the poster frame itself,
 * so every still is real MapArte output at tile size.
 *
 *   node scripts/generate_motion_posters.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:5182";
const OUT = path.join(process.cwd(), "public", "assets", "motion");

const SET = [
  { city: "Lisbon", country: "Portugal", lat: 38.7223, lon: -9.1393, theme: "carrara", font: "Playfair Display" },
  { city: "New York", country: "United States", lat: 40.7128, lon: -74.006, theme: "midnight_blue", font: "Cinzel" },
  { city: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964, theme: "carrara", font: "Cormorant Garamond" },
  { city: "Paris", country: "France", lat: 48.8566, lon: 2.3522, theme: "noir", font: "DM Serif Display" },
  { city: "Venice", country: "Italy", lat: 45.4408, lon: 12.3155, theme: "blue_water", font: "Libre Baskerville" },
  { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, theme: "pencil_sketch", font: "Lora" },
  { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041, theme: "crayon_art", font: "Josefin Sans" },
  { city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, theme: "comic_pop", font: "Anton" },
  { city: "Kyoto", country: "Japan", lat: 35.0116, lon: 135.7681, theme: "watercolor_wash", font: "Bebas Neue" },
  { city: "Berlin", country: "Germany", lat: 52.52, lon: 13.405, theme: "chalkboard", font: "IBM Plex Mono" },
  { city: "Zurich", country: "Switzerland", lat: 47.3769, lon: 8.5417, theme: "sage", font: "Inter" },
  { city: "Jaipur", country: "India", lat: 26.9124, lon: 75.7873, theme: "terracotta", font: "Merriweather" },
  { city: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, theme: "sandstone", font: "Oswald" },
  { city: "San Francisco", country: "United States", lat: 37.7749, lon: -122.4194, theme: "blueprint", font: "Spline Sans Mono" },
  { city: "Barcelona", country: "Spain", lat: 41.3851, lon: 2.1734, theme: "ruby", font: "Montserrat" },
  { city: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, theme: "sunset", font: "Outfit" },
  { city: "Vienna", country: "Austria", lat: 48.2082, lon: 16.3738, theme: "blush", font: "Raleway" },
  { city: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729, theme: "ocean", font: "Poppins" },
  { city: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708, theme: "neon", font: "Bebas Neue" },
  { city: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978, theme: "japanese_ink", font: "Noto Sans JP" },
  { city: "Mumbai", country: "India", lat: 18.922, lon: 72.8347, theme: "retro_vintage", font: "Lora" },
];

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });

for (const [index, entry] of SET.entries()) {
  const name = `${String(index + 1).padStart(2, "0")}-${slug(entry.city)}-${entry.theme}.png`;
  const target = path.join(OUT, name);
  const query = new URLSearchParams({
    city: entry.city,
    country: entry.country,
    theme: entry.theme,
    layout: "print_a4_portrait",
    font: entry.font,
    fontSize: "18",
    overlayTop: "true",
    overlayBottom: "true",
    border: "none",
    lat: String(entry.lat),
    lon: String(entry.lon),
    dist: "4800",
  });
  process.stdout.write(`${name} … `);
  try {
    await page.goto(`${BASE}/?${query}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.map !== "undefined", { timeout: 25000 });
    await page.evaluate(() => new Promise((done) => {
      if (!window.map || !window.map.isMoving()) return done();
      window.map.once("idle", done);
      setTimeout(done, 4000);
    }));
    // Fonts and the globe shader settle after the map reports idle.
    await page.waitForTimeout(3200);
    const frame = page.locator(".poster-frame").first();
    await frame.screenshot({ path: target, animations: "disabled" });
    const kb = Math.round(fs.statSync(target).size / 1024);
    console.log(`ok ${kb}kb`);
  } catch (error) {
    console.log(`FAILED ${error.message}`);
  }
}

await browser.close();
console.log(`\n${fs.readdirSync(OUT).length} posters in public/assets/motion`);
