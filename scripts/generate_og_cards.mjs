/**
 * Social sharing cards for the catalog pages.
 *
 * Sharing /themes or /themes/noir used to show the generic home banner. Each
 * card is built from the real poster render that the page is about, on the
 * same paper background the site uses, so a link looks like the page.
 *
 *   node scripts/generate_og_cards.mjs
 *
 * Output: public/assets/og-layouts.jpg, og-themes.jpg, og-themes-<id>.jpg
 */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const OUT = join(root, "public/assets");
const PREVIEWS = join(root, "public/layout-previews");
const THEMES = join(root, "public/theme-previews");

const PAPER = "#f5efe2";
const PAPER_DEEP = "#ece3d1";
const INK = "#14110d";
const MUTED = "#7c7264";
const ORANGE = "#e4552a";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Consolas', 'Courier New', monospace";

const themes = {
  ...JSON.parse(readFileSync(join(root, "src/data/themes.json"), "utf8")).themes,
  ...JSON.parse(readFileSync(join(root, "src/data/additional_themes.json"), "utf8")).themes,
};

const escapeXml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Copy on the left, one poster on the right. */
function cardSvg({ kicker, title, lines, footnote }) {
  const titleY = 236;
  const titleHtml = title
    .map(
      (line, index) =>
        `<text x="80" y="${titleY + index * 74}" font-family="${SERIF}" font-size="66" fill="${INK}">${escapeXml(line)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="${PAPER}"/>
    <rect x="700" y="0" width="500" height="630" fill="${PAPER_DEEP}"/>
    <text x="80" y="128" font-family="${MONO}" font-size="18" letter-spacing="4" fill="${MUTED}">${escapeXml(kicker)}</text>
    <rect x="80" y="152" width="46" height="3" fill="${ORANGE}"/>
    ${titleHtml}
    <text x="80" y="${titleY + title.length * 74 - 18}" font-family="${SERIF}" font-size="24" fill="${MUTED}">${escapeXml(lines[0] ?? "")}</text>
    <text x="80" y="${titleY + title.length * 74 + 18}" font-family="${SERIF}" font-size="24" fill="${MUTED}">${escapeXml(lines[1] ?? "")}</text>
    <text x="80" y="566" font-family="${MONO}" font-size="17" letter-spacing="2" fill="${MUTED}">${escapeXml(footnote)}</text>
    <text x="80" y="606" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${MUTED}">MAPARTE.COM</text>
  </svg>`;
}

/** Two serif lines, cut on a word boundary rather than mid-word. */
function wrapLines(text, width = 54) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = word;
      if (lines.length === 2) break;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (lines.length < 2 && line) lines.push(line);
  if (lines.length === 2 && line !== lines[1]) lines[1] = `${lines[1].replace(/[,;:]$/, "")}…`;
  return lines;
}

async function makeCard({ out, preview, ...copy }) {
  const svg = Buffer.from(cardSvg(copy));
  const poster = await sharp(preview)
    .resize({ width: 372, height: 500, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const top = 320 - Math.round(poster.info.height / 2);
  await sharp(svg)
    .composite([{ input: poster.data, left: 800, top }])
    .jpeg({ quality: 86, chromaSubsampling: "4:4:4" })
    .toFile(out);
}

mkdirSync(OUT, { recursive: true });

const jobList = [];

jobList.push(async () => {
  await makeCard({
    out: join(OUT, "og-layouts.jpg"),
    preview: join(PREVIEWS, "print_a2_portrait-0.webp"),
    kicker: "THE LAYOUT GALLERY",
    title: ["Every layout,", "at real size."],
    lines: ["79 formats — print, social, phone, desktop and web,", "each one shown as a real map poster."],
    footnote: "Five real renders per layout",
  });
});

jobList.push(async () => {
  await makeCard({
    out: join(OUT, "og-themes.jpg"),
    preview: join(THEMES, "midnight_blue.webp"),
    kicker: "THE THEME GALLERY",
    title: ["One city,", "22 moods."],
    lines: ["Twenty-two palettes for the same streets,", "from blueprint to neon night."],
    footnote: "Tokyo in Midnight Blue",
  });
});

for (const [id, theme] of Object.entries(themes)) {
  jobList.push(async () => {
    const preview = join(THEMES, `${id}.webp`);
    if (!existsSync(preview)) {
      console.log("skip (no render):", id);
      return;
    }
    const words = theme.name.split(" ");
    await makeCard({
      out: join(OUT, `og-themes-${id}.jpg`),
      preview,
      kicker: `MAP THEME · ${String(Object.keys(themes).indexOf(id) + 1).padStart(2, "0")} OF 22`,
      title: words.length > 1 ? [words[0], words.slice(1).join(" ")] : [theme.name],
      lines: wrapLines(theme.description),
      footnote: `${theme.name} map theme`,
    });
  });
}

for (const job of jobList) await job();
console.log(`wrote ${jobList.length} cards to public/assets`);
