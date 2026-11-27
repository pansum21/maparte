/**
 * Renders real poster previews for every layout in the catalog.
 *
 * The layout gallery used to show crops of the theme cards, so a 9:16 story
 * layout and a 2:3 print looked like the same photo in different frames. This
 * script drives the actual editor: one browser page per theme, a state
 * dispatch per layout, and the app's own poster export at a DPI chosen to give
 * roughly 900 px on the long edge. The result is the real composition: map,
 * text, border and credits in that layout's own shape.
 *
 *   node scripts/generate_layout_previews.cjs            # all 79 x 5
 *   node scripts/generate_layout_previews.cjs --limit 3  # smoke test
 *   node scripts/generate_layout_previews.cjs --theme bold_night --single
 *
 * Output: public/layout-previews/<layoutId>-<step>.webp (step 0..4)
 */
const { chromium } = require("playwright");
const sharp = require("sharp");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = process.env.PORT || 5199;
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT_DIR = path.join(__dirname, "../public/layout-previews");
const THEME_OUT = path.join(__dirname, "../public/theme-previews");
const BLOG_OUT = path.join(__dirname, "../public/blog/img");

/** One city per layout, so the gallery is not 79 versions of Paris. The order is
    fixed: the same layout always renders the same city, and the gallery's alt
    text uses the same list. */
const CITIES = [
  { city: "Paris", country: "France", lat: 48.8566, lon: 2.3522, distance: "4900" },
  { city: "Tokyo", country: "Japan", lat: 35.6812, lon: 139.7671, distance: "7000" },
  { city: "Lisbon", country: "Portugal", lat: 38.7223, lon: -9.1393, distance: "4200" },
  { city: "New York", country: "United States", lat: 40.7128, lon: -74.006, distance: "6000" },
  { city: "Copenhagen", country: "Denmark", lat: 55.6761, lon: 12.5683, distance: "3800" },
  { city: "Barcelona", country: "Spain", lat: 41.3874, lon: 2.1686, distance: "4500" },
  { city: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784, distance: "6500" },
  { city: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332, distance: "7000" },
  { city: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241, distance: "6000" },
  { city: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978, distance: "6500" },
  { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041, distance: "4000" },
  { city: "Stockholm", country: "Sweden", lat: 59.3293, lon: 18.0686, distance: "4200" },
];
const cityFor = (index) => CITIES[index % CITIES.length];
const DISTANCE = "4900";

// Must match POSTER_SLIDES in src/home/LayoutsPage.tsx.
const POSTER_SLIDES = [
  "blueprint",
  "terracotta",
  "noir",
  "sage",
  "neon",
  "watercolor_wash",
  "retro_vintage",
  "carrara",
  "blush",
  "japanese_ink",
  "midnight_blue",
  "sunset",
];

const slidesFor = (index) =>
  Array.from({ length: 5 }, (_, step) => POSTER_SLIDES[(index + step) % POSTER_SLIDES.length]);

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/layouts.json"), "utf8"));
const layouts = [];
for (const category of manifest.categories) {
  const options = (category.layouts || []).map((l) => ({
    id: String(l.id),
    widthCm: Number(l.posterWidthCm || l.width),
    heightCm: Number(l.posterHeightCm || l.height),
  }));
  options.sort((a, b) => Number(a.id.includes("maparte_")) - Number(b.id.includes("maparte_")));
  layouts.push(...options);
}

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : 0;
const onlyThemeArg = args.indexOf("--theme");
const ONLY_THEME = onlyThemeArg >= 0 ? args[onlyThemeArg + 1] : null;
const onlyArg = args.indexOf("--only");
const ONLY = onlyArg >= 0 ? args[onlyArg + 1].split(",").map((v) => v.trim()) : null;
const SINGLE = args.includes("--single");
const FORCE = args.includes("--force");

async function setCity(page, city) {
  await page.evaluate(
    ({ city, distance }) => {
      window.posterDispatch({
        type: "SELECT_LOCATION",
        location: {
          id: `city:${city.city.toLowerCase()}`,
          label: `${city.city}, ${city.country}`,
          lat: city.lat,
          lon: city.lon,
          city: city.city,
          country: city.country,
          continent: "Europe",
        },
      });
      window.posterDispatch({
        type: "SET_FORM_FIELDS",
        fields: {
          distance,
          latitude: String(city.lat),
          longitude: String(city.lon),
          displayCity: city.city,
          displayCountry: city.country,
          location: `${city.city}, ${city.country}`,
        },
      });
    },
    { city, distance: city.distance || DISTANCE },
  );
  const deadline = Date.now() + 20000;
  let current = "";
  while (Date.now() < deadline) {
    current = await page.evaluate(() => window.posterState?.form?.displayCity ?? "");
    if (current === city.city) break;
    await page.waitForTimeout(250);
  }
  if (current !== city.city) console.log(`city did not settle on ${city.city} (state says "${current}")`);
  await page.waitForTimeout(800);
}

async function openEditor(page, theme, city = CITIES[0]) {
  await page.goto(`${BASE}?layout=print_a4_portrait&theme=${theme}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".poster-frame");
  await page.waitForFunction(
    () => window.posterDispatch && window.map && typeof window.exportPoster === "function",
    { timeout: 30000 },
  );
  await page.waitForTimeout(1000);
  await setCity(page, city);
}

async function exportPng(page, dpi) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120000 }),
    page.evaluate((value) => window.exportPoster("png", { asPro: true, targetDpi: value }), dpi),
  ]);
  const file = path.join(os.tmpdir(), `maparte-preview-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  await download.saveAs(file);
  const buffer = fs.readFileSync(file);
  fs.unlinkSync(file);
  return buffer;
}

const dpiFor = (layout, longEdge = 950) => {
  const inches = Math.max(layout.widthCm, layout.heightCm) / 2.54;
  return Math.max(8, Math.min(300, Math.round(longEdge / inches)));
};

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("PAGEERROR", String(err).slice(0, 200)));

  // ---- one-off: complete the missing theme preview + the guide's Paris poster
  if (SINGLE) {
    const theme = ONLY_THEME || "bold_night";
    await openEditor(page, theme);
    const png = await exportPng(page, 205);
    await sharp(png)
      .resize({ width: 1697, height: 2400, fit: "cover" })
      .webp({ quality: 80 })
      .toFile(path.join(BLOG_OUT, `theme-${theme.replace(/_/g, "-")}-paris.webp`));
    const themePath = path.join(THEME_OUT, `${theme}.webp`);
    if (!fs.existsSync(themePath)) {
      await sharp(png)
        .resize({ width: 396, height: 495, fit: "cover" })
        .webp({ quality: 82 })
        .toFile(themePath);
    }
    await sharp(png)
      .resize({ width: 849 })
      .webp({ quality: 80 })
      .toFile(path.join(BLOG_OUT, `theme-${theme.replace(/_/g, "-")}-paris-1200.webp`));
    console.log("wrote theme preview + blog poster for", theme);
    await browser.close();
    return;
  }

  // ---- group by theme + city so one page load covers many layouts without
  //      walking the map between cities for every single render
  const jobsByKey = new Map();
  layouts.forEach((layout, index) => {
    const slides = slidesFor(index);
    const city = cityFor(index);
    if (ONLY_THEME && !slides.includes(ONLY_THEME)) return;
    slides.forEach((theme, step) => {
      if (ONLY_THEME && theme !== ONLY_THEME) return;
      if (ONLY && !ONLY.includes(layout.id)) return;
      const key = `${theme}|${city.city}`;
      if (!jobsByKey.has(key)) jobsByKey.set(key, { theme, city, jobs: [] });
      jobsByKey.get(key).jobs.push({ layout, step });
    });
  });

  let rendered = 0;
  let skipped = 0;
  const started = Date.now();

  for (const { theme, city, jobs } of jobsByKey.values()) {
    const queue = LIMIT ? jobs.slice(0, LIMIT) : jobs;
    const pending = FORCE
      ? queue
      : queue.filter(({ layout, step }) => {
          const out = path.join(OUT_DIR, `${layout.id}-${step}.webp`);
          return !(fs.existsSync(out) && fs.statSync(out).size > 2000);
        });
    skipped += queue.length - pending.length;
    if (pending.length === 0) continue;
    await openEditor(page, theme, city);

    for (const { layout, step } of pending) {
      const out = path.join(OUT_DIR, `${layout.id}-${step}.webp`);
      await page.evaluate(
        ({ id, widthCm, heightCm }) => {
          window.posterDispatch({ type: "SET_LAYOUT", layoutId: id, widthCm, heightCm });
        },
        { id: layout.id, widthCm: layout.widthCm, heightCm: layout.heightCm },
      );
      await page.waitForTimeout(900);
      await page.evaluate(({ lon, lat }) => {
        if (window.map) window.map.jumpTo({ center: [lon, lat], zoom: 11.4 });
      }, city);
      await page.waitForTimeout(700);
      const png = await exportPng(page, dpiFor(layout));
      await sharp(png)
        .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(out);
      rendered += 1;
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`[${secs}s] ${theme} ${layout.id} step ${step} (${rendered} done, ${skipped} skipped)`);
    }
  }

  console.log(`finished: ${rendered} rendered, ${skipped} skipped in ${((Date.now() - started) / 60000).toFixed(1)} min`);
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
