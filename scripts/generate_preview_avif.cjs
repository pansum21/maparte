/**
 * AVIF companions for the gallery previews.
 *
 * Every layout card and theme card ships a WebP today. AVIF is roughly half
 * the bytes at the same quality, and the cards now offer it through <picture>
 * with the WebP kept as the fallback. Layout previews also get a 360 px wide
 * AVIF so a phone does not download the 720 px render for a 160 px card.
 *
 *   node scripts/generate_preview_avif.cjs            # layouts + themes
 *   node scripts/generate_preview_avif.cjs --force    # redo existing files
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const FORCE = process.argv.includes("--force");
const LAYOUT_DIR = path.join(__dirname, "../public/layout-previews");
const THEME_DIR = path.join(__dirname, "../public/theme-previews");

const exists = (file, source) => {
  if (FORCE) return false;
  if (!fs.existsSync(file) || fs.statSync(file).size <= 500) return false;
  // A re-render makes the WebP newer, so its AVIF has to be rebuilt too.
  return !source || fs.statSync(file).mtimeMs >= fs.statSync(source).mtimeMs;
};

async function convertLayouts() {
  const files = fs.readdirSync(LAYOUT_DIR).filter((name) => name.endsWith(".webp"));
  let written = 0;
  for (const name of files) {
    const input = path.join(LAYOUT_DIR, name);
    const stem = name.replace(/\.webp$/, "");
    const full = path.join(LAYOUT_DIR, `${stem}.avif`);
    const small = path.join(LAYOUT_DIR, `${stem}-360.avif`);
    if (exists(full, input) && exists(small, input)) continue;
    const image = sharp(input);
    if (!exists(full, input)) {
      await image.clone().avif({ quality: 52, effort: 4 }).toFile(full);
    }
    if (!exists(small, input)) {
      await image
        .clone()
        .resize({ width: 360, withoutEnlargement: true })
        .avif({ quality: 48, effort: 4 })
        .toFile(small);
    }
    written += 1;
    if (written % 25 === 0) console.log(`${written} layouts converted`);
  }
  console.log(`layouts: ${written} new, ${files.length} webp in total`);
}

async function convertThemes() {
  if (!fs.existsSync(THEME_DIR)) return;
  const files = fs.readdirSync(THEME_DIR).filter((name) => name.endsWith(".webp"));
  let written = 0;
  for (const name of files) {
    const input = path.join(THEME_DIR, name);
    const out = input.replace(/\.webp$/, ".avif");
    if (exists(out, input)) continue;
    await sharp(input).avif({ quality: 52, effort: 4 }).toFile(out);
    written += 1;
  }
  console.log(`themes: ${written} new, ${files.length} webp in total`);
}

(async () => {
  await convertLayouts();
  await convertThemes();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
