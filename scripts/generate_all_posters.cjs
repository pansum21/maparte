const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Target Directories
const primaryDesktop = 'C:\\Users\\supri\\Desktop\\MapArte_Posters';
const fallbackDesktop = 'C:\\Users\\supri\\OneDrive - Graphic Era University\\Desktop\\MapArte_Posters';

const subfolders = ['', 'Borders', 'Theme_Layout_Border'];
for (const sub of subfolders) {
  fs.mkdirSync(path.join(primaryDesktop, sub), { recursive: true });
  fs.mkdirSync(path.join(fallbackDesktop, sub), { recursive: true });
}

// 1. Part 1: All 20 Themes Posters
const THEME_POSTERS = [
  { theme: 'midnight_blue', city: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060, dist: 5500, filename: '01_Theme_Midnight_Blue_New_York.png' },
  { theme: 'carrara', city: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964, dist: 4500, filename: '02_Theme_Carrara_Rome.png' },
  { theme: 'noir', city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, dist: 4900, filename: '03_Theme_Noir_Paris.png' },
  { theme: 'blue_water', city: 'Venice', country: 'Italy', lat: 45.4408, lon: 12.3155, dist: 3500, filename: '04_Theme_Blue_Water_Venice.png' },
  { theme: 'pencil_sketch', city: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, dist: 5200, filename: '05_Theme_Pencil_Sketch_London.png' },
  { theme: 'crayon_art', city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, dist: 4000, filename: '06_Theme_Crayon_Art_Amsterdam.png' },
  { theme: 'comic_pop', city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, dist: 6000, filename: '07_Theme_Comic_Pop_Tokyo.png' },
  { theme: 'watercolor_wash', city: 'Kyoto', country: 'Japan', lat: 35.0116, lon: 135.7681, dist: 4800, filename: '08_Theme_Watercolor_Wash_Kyoto.png' },
  { theme: 'chalkboard', city: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, dist: 5000, filename: '09_Theme_Chalkboard_Berlin.png' },
  { theme: 'sage', city: 'Zurich', country: 'Switzerland', lat: 47.3769, lon: 8.5417, dist: 4200, filename: '10_Theme_Sage_Zurich.png' },
  { theme: 'terracotta', city: 'Jaipur', country: 'India', lat: 26.9124, lon: 75.7873, dist: 4600, filename: '11_Theme_Terracotta_Jaipur.png' },
  { theme: 'sandstone', city: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, dist: 5500, filename: '12_Theme_Sandstone_Cairo.png' },
  { theme: 'blueprint', city: 'San Francisco', country: 'United States', lat: 37.7749, lon: -122.4194, dist: 5800, filename: '13_Theme_Blueprint_San_Francisco.png' },
  { theme: 'ruby', city: 'Barcelona', country: 'Spain', lat: 41.3851, lon: 2.1734, dist: 4800, filename: '14_Theme_Ruby_Barcelona.png' },
  { theme: 'sunset', city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, dist: 5600, filename: '15_Theme_Sunset_Sydney.png' },
  { theme: 'blush', city: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738, dist: 4400, filename: '16_Theme_Blush_Vienna.png' },
  { theme: 'ocean', city: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lon: -43.1729, dist: 5500, filename: '17_Theme_Ocean_Rio_de_Janeiro.png' },
  { theme: 'neon', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708, dist: 6000, filename: '18_Theme_Neon_Dubai.png' },
  { theme: 'japanese_ink', city: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780, dist: 5400, filename: '19_Theme_Japanese_Ink_Seoul.png' },
  { theme: 'retro_vintage', city: 'Mumbai', country: 'India', lat: 18.9220, lon: 72.8347, dist: 5000, filename: '20_Theme_Retro_Vintage_Mumbai.png' }
];

// 2. Part 2: All 13 Available Borders
const BORDER_POSTERS = [
  { borderId: 'neatline-single', name: 'Single_Line', theme: 'noir', city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, dist: 4900 },
  { borderId: 'neatline-double', name: 'Double_Line', theme: 'carrara', city: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964, dist: 4500 },
  { borderId: 'neatline-thick-thin', name: 'Thick_Thin', theme: 'midnight_blue', city: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, dist: 5200 },
  { borderId: 'neatline-thin-thick', name: 'Thin_Thick', theme: 'comic_pop', city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, dist: 6000 },
  { borderId: 'neatline-dashed', name: 'Modern_Dashed', theme: 'chalkboard', city: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, dist: 5000 },
  { borderId: 'neatline-dotted', name: 'Fine_Dotted', theme: 'watercolor_wash', city: 'Kyoto', country: 'Japan', lat: 35.0116, lon: 135.7681, dist: 4800 },
  { borderId: 'neatline-dash-dot', name: 'Dash_Dot', theme: 'blue_water', city: 'Venice', country: 'Italy', lat: 45.4408, lon: 12.3155, dist: 3500 },
  { borderId: 'neatline-corner-crosshairs', name: 'Corner_Crosshairs', theme: 'blueprint', city: 'San Francisco', country: 'United States', lat: 37.7749, lon: -122.4194, dist: 5800 },
  { borderId: 'neatline-wide-gallery', name: 'Wide_Gallery', theme: 'terracotta', city: 'Jaipur', country: 'India', lat: 26.9124, lon: 75.7873, dist: 4600 },
  { borderId: 'neatline-triple', name: 'Triple_Line', theme: 'crayon_art', city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, dist: 4000 },
  { borderId: 'neatline-triple-sandwich', name: 'Thin_Thick_Thin', theme: 'sandstone', city: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, dist: 5500 },
  { borderId: 'neatline-line-dash-dot', name: 'Line_Dash_Dot', theme: 'sunset', city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, dist: 5600 },
  { borderId: 'neatline-dot-dash-line', name: 'Dot_Dash_Line', theme: 'ruby', city: 'Barcelona', country: 'Spain', lat: 41.3851, lon: 2.1734, dist: 4800 }
];

// 3. Part 3: All 42 Layouts with Double Line Border, divided half in Carrara and half in Noir
const layoutsManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/layouts.json'), 'utf8'));
const ALL_LAYOUTS = [];
layoutsManifest.categories.forEach(cat => {
  cat.layouts.forEach(l => {
    ALL_LAYOUTS.push({
      id: l.id,
      name: l.name.replace(/[^a-zA-Z0-9_-]/g, '_'),
      widthCm: l.posterWidthCm || l.width,
      heightCm: l.posterHeightCm || l.height,
      category: cat.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    });
  });
});

// 21 Carrara cities (Italian & European classic art capitals)
const CARRARA_CITIES = [
  { city: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  { city: 'Florence', country: 'Italy', lat: 43.7696, lon: 11.2558 },
  { city: 'Venice', country: 'Italy', lat: 45.4408, lon: 12.3155 },
  { city: 'Milan', country: 'Italy', lat: 45.4642, lon: 9.1900 },
  { city: 'Naples', country: 'Italy', lat: 40.8518, lon: 14.2681 },
  { city: 'Turin', country: 'Italy', lat: 45.0703, lon: 7.6869 },
  { city: 'Bologna', country: 'Italy', lat: 44.4949, lon: 11.3426 },
  { city: 'Verona', country: 'Italy', lat: 45.4384, lon: 10.9916 },
  { city: 'Genoa', country: 'Italy', lat: 44.4056, lon: 8.9463 },
  { city: 'Palermo', country: 'Italy', lat: 38.1157, lon: 13.3615 },
  { city: 'Pisa', country: 'Italy', lat: 43.7228, lon: 10.4017 },
  { city: 'Siena', country: 'Italy', lat: 43.3188, lon: 11.3308 },
  { city: 'Bari', country: 'Italy', lat: 41.1171, lon: 16.8719 },
  { city: 'Catania', country: 'Italy', lat: 37.5079, lon: 15.0830 },
  { city: 'Lucca', country: 'Italy', lat: 43.8430, lon: 10.5080 },
  { city: 'Zurich', country: 'Switzerland', lat: 47.3769, lon: 8.5417 },
  { city: 'Geneva', country: 'Switzerland', lat: 46.2044, lon: 6.1432 },
  { city: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738 },
  { city: 'Prague', country: 'Czechia', lat: 50.0755, lon: 14.4378 },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041 },
  { city: 'Copenhagen', country: 'Denmark', lat: 55.6761, lon: 12.5683 }
];

// 21 Noir cities (Iconic French, global cinema and dramatic noir cities)
const NOIR_CITIES = [
  { city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { city: 'Lyon', country: 'France', lat: 45.7640, lon: 4.8357 },
  { city: 'Marseille', country: 'France', lat: 43.2965, lon: 5.3698 },
  { city: 'Bordeaux', country: 'France', lat: 44.8378, lon: -0.5792 },
  { city: 'Toulouse', country: 'France', lat: 43.6047, lon: 1.4442 },
  { city: 'Nice', country: 'France', lat: 43.7102, lon: 7.2620 },
  { city: 'Strasbourg', country: 'France', lat: 48.5734, lon: 7.7521 },
  { city: 'Lille', country: 'France', lat: 50.6292, lon: 3.0573 },
  { city: 'Nantes', country: 'France', lat: 47.2184, lon: -1.5536 },
  { city: 'Cannes', country: 'France', lat: 43.5528, lon: 7.0174 },
  { city: 'Monaco', country: 'Monaco', lat: 43.7384, lon: 7.4246 },
  { city: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { city: 'Edinburgh', country: 'United Kingdom', lat: 55.9533, lon: -3.1883 },
  { city: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
  { city: 'Munich', country: 'Germany', lat: 48.1351, lon: 11.5820 },
  { city: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { city: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298 },
  { city: 'San Francisco', country: 'United States', lat: 37.7749, lon: -122.4194 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { city: 'Kyoto', country: 'Japan', lat: 35.0116, lon: 135.7681 },
  { city: 'Barcelona', country: 'Spain', lat: 41.3851, lon: 2.1734 }
];

async function run() {
  console.log('======================================================');
  console.log('MAPARTE MASTER GALLERY POSTER GENERATOR');
  console.log('- Overlays (Top/Bottom): OFF');
  console.log('- Font Family: Times New Roman');
  console.log('- Font Size: 18');
  console.log('- MapArte Credit: 18pt High Legibility, Exactly 0.2mm Clearance');
  console.log('- Dark Theme Border: Pure White (#FFFFFF)');
  console.log('- Light Theme Border: Crisp Dark (#111111)');
  console.log('======================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  async function renderAndSave(opts, targetSubfolder, finalFilename) {
    const { city, country, lat, lon, dist, theme, layoutId, widthCm, heightCm, borderId } = opts;
    process.stdout.write(`Generating [${targetSubfolder || 'Root'}] ${finalFilename}... `);

    // Determine contrast border color: Dark themes get White (#FFFFFF), light themes get Dark (#111111)
    const darkThemes = ['noir', 'midnight_blue', 'chalkboard', 'blueprint', 'ruby', 'neon'];
    const isDark = darkThemes.includes(theme);
    const borderColor = isDark ? '#FFFFFF' : '#111111';

    // Direct URL navigation ensures MapLibre instantiates the exact theme tiles, geometry & style
    const targetUrl = `http://localhost:5173/?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&theme=${theme}&layout=${layoutId || 'print_a4_portrait'}&font=Times+New+Roman&fontSize=18&overlayTop=false&overlayBottom=false&border=${borderId || 'none'}&borderColor=${encodeURIComponent(borderColor)}&lat=${lat}&lon=${lon}&dist=${dist || 4800}`;

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.map !== 'undefined' && typeof window.exportPoster === 'function', { timeout: 20000 });

    // Sync neatline state & ensure map is idle
    await page.evaluate(({ borderId, borderColor, widthCm, heightCm, layoutId }) => {
      const sel = {
        lineId: borderId || 'none',
        cornerId: 'none',
        frameId: 'none',
        cornerPosition: 'all',
        thicknesses: {},
        lineVariant: 'plain',
        cornerVariant: 'plain',
        mapGapCm: 0.1,
        colorMode: 'single',
        singleColor: borderColor,
        gradientFrom: '#000000',
        gradientTo: '#475569',
        designScale: 1.0,
        showWhiteMat: false
      };
      localStorage.setItem('maparte_neatline_layers', JSON.stringify(sel));
      localStorage.setItem('maparte:neatline-selection-v3', JSON.stringify(sel));
      window.dispatchEvent(new CustomEvent('maparte:neatline:change', { detail: sel }));
      if (typeof window.enablePosterLayout === 'function') {
        window.enablePosterLayout();
      }
    }, { borderId, borderColor, widthCm, heightCm, layoutId });

    // Wait for map tiles to finish rendering
    await page.evaluate(() => {
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

    // Export 300 DPI PNG
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45000 }),
      page.evaluate(async () => {
        await window.exportPoster('png', { asPro: true, targetDpi: 300 });
      })
    ]);

    const tempFile = path.join(os.tmpdir(), `maparte_dl_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    await download.saveAs(tempFile);

    const primaryDest = path.join(primaryDesktop, targetSubfolder || '', finalFilename);
    const fallbackDest = path.join(fallbackDesktop, targetSubfolder || '', finalFilename);

    fs.copyFileSync(tempFile, primaryDest);
    try {
      fs.copyFileSync(tempFile, fallbackDest);
    } catch (_) {}
    try {
      fs.unlinkSync(tempFile);
    } catch (_) {}

    const sizeMb = (fs.statSync(primaryDest).size / (1024 * 1024)).toFixed(2);
    console.log(`✓ (${sizeMb} MB)`);
  }

  // --- PART 1: 20 THEMES POSTERS ---
  console.log('--- PART 1: GENERATING 20 THEMES POSTERS (TIMES NEW ROMAN, OVERLAYS OFF, 0.2mm WATERMARK) ---');
  for (const item of THEME_POSTERS) {
    await renderAndSave({
      city: item.city,
      country: item.country,
      lat: item.lat,
      lon: item.lon,
      dist: item.dist,
      theme: item.theme,
      layoutId: 'print_a4_portrait',
      widthCm: 21,
      heightCm: 29.7,
      borderId: 'none'
    }, '', item.filename);
  }

  // --- PART 2: 13 BORDER POSTERS ---
  console.log('\n--- PART 2: GENERATING 13 BORDER POSTERS (HIGH-CONTRAST BORDERS, 0.2mm WATERMARK) ---');
  for (let i = 0; i < BORDER_POSTERS.length; i++) {
    const item = BORDER_POSTERS[i];
    const prefix = String(i + 1).padStart(2, '0');
    const filename = `${prefix}_Border_${item.name}_${item.theme}_${item.city.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    await renderAndSave({
      city: item.city,
      country: item.country,
      lat: item.lat,
      lon: item.lon,
      dist: item.dist,
      theme: item.theme,
      layoutId: 'print_a4_portrait',
      widthCm: 21,
      heightCm: 29.7,
      borderId: item.borderId
    }, 'Borders', filename);
  }

  // --- PART 3: 42 LAYOUT POSTERS WITH DOUBLE LINE BORDER ---
  console.log('\n--- PART 3: GENERATING 42 LAYOUT POSTERS (DOUBLE LINE BORDER, 21 CARRARA / 21 NOIR) ---');
  const maxLayouts = Math.min(ALL_LAYOUTS.length, CARRARA_CITIES.length + NOIR_CITIES.length);
  for (let i = 0; i < maxLayouts; i++) {
    const layout = ALL_LAYOUTS[i];
    const prefix = String(i + 1).padStart(2, '0');

    // First 21 layouts in Carrara, next 21 layouts in Noir
    const isCarrara = i < 21;
    const theme = isCarrara ? 'carrara' : 'noir';
    const cityObj = isCarrara ? CARRARA_CITIES[i] : NOIR_CITIES[i - 21];

    const filename = `${prefix}_Layout_${layout.name}_${theme}_${cityObj.city.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    await renderAndSave({
      city: cityObj.city,
      country: cityObj.country,
      lat: cityObj.lat,
      lon: cityObj.lon,
      dist: 4800,
      theme: theme,
      layoutId: layout.id,
      widthCm: layout.widthCm,
      heightCm: layout.heightCm,
      borderId: 'neatline-double'
    }, 'Theme_Layout_Border', filename);
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('ALL 75 GALLERY POSTERS SUCCESSFULLY GENERATED!');
  console.log(`Directory: ${primaryDesktop}`);
  console.log('======================================================');
}

run().catch(err => {
  console.error('Master generator error:', err);
  process.exit(1);
});
