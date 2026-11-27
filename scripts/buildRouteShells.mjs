/**
 * Static shells for the catalog routes.
 *
 * The app is a single-page app: every route is served by index.html, so
 * /layouts, /themes and each /themes/<id> all showed the home page's title,
 * description and banner when shared. After `vite build` this script copies
 * the built index.html into per-route folders and swaps in the route's own
 * title, description, canonical, Open Graph card and JSON-LD. React still
 * boots from the same bundle and renders the route as before.
 *
 *   node scripts/buildRouteShells.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = join(root, "dist");
const ORIGIN = "https://www.maparte.com";

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html missing — run vite build first");
  process.exit(1);
}

const base = readFileSync(join(dist, "index.html"), "utf8");
const HOME_TITLE = "MAPARTE | Create Digital Map Art & Phone Wallpapers";
const HOME_DESC =
  "Create digital map art and phone wallpapers with MAPARTE. Explore real map designs, search a place, personalize themes, labels, borders, markers and routes, then preview your design.";

const layouts = JSON.parse(readFileSync(join(root, "src/data/layouts.json"), "utf8"));
const layoutTotal = layouts.categories.reduce((n, c) => n + (c.layouts || []).length, 0);
const themes = {
  ...JSON.parse(readFileSync(join(root, "src/data/themes.json"), "utf8")).themes,
  ...JSON.parse(readFileSync(join(root, "src/data/additional_themes.json"), "utf8")).themes,
};
const themeIds = Object.keys(themes);

const esc = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const replaceAll = (html, from, to) => html.split(from).join(to);

function render({ path, title, description, image, imageAlt, ld }) {
  let html = base;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = replaceAll(html, HOME_TITLE, title);
  html = replaceAll(html, HOME_DESC, description);
  html = html.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${ORIGIN}${path}" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${ORIGIN}${path}" />`);
  html = replaceAll(html, "https://maparte.com/assets/banner.jpg", `${ORIGIN}${image}`);
  html = replaceAll(html, "MAPARTE — digital map art and phone wallpaper creator", imageAlt);
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`,
  );
  const out = join(dist, path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return out;
}

const collectionLd = ({ name, description, path, image, items }) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name,
  description,
  url: `${ORIGIN}${path}`,
  primaryImageOfPage: `${ORIGIN}${image}`,
  isPartOf: { "@type": "WebSite", name: "MAPARTE", url: ORIGIN },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: items.count,
    ...(items.names
      ? { itemListElement: items.names.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: item.url })) }
      : {}),
  },
});

const written = [];

written.push(
  render({
    path: "/layouts",
    title: `Map poster, wallpaper and web layouts — all ${layoutTotal} formats — MAPARTE`,
    description: `Every Maparte layout at real size: ${layoutTotal} formats across print sheets, social crops, phone and desktop wallpapers and web banners, each shown as a real map poster.`,
    image: "/assets/og-layouts.jpg",
    imageAlt: `MAPARTE layout gallery — ${layoutTotal} map poster, wallpaper and web formats`,
    ld: collectionLd({
      name: "Maparte layout gallery",
      description: `${layoutTotal} map poster, wallpaper and web layouts, each rendered as a real map poster.`,
      path: "/layouts",
      image: "/assets/og-layouts.jpg",
      items: { count: layoutTotal },
    }),
  }),
);

written.push(
  render({
    path: "/themes",
    title: `Map colour themes — all ${themeIds.length} palettes — MAPARTE`,
    description: `${themeIds.length} map colour themes, from blueprint and noir to watercolour and neon. See every palette on a real city map and open the editor with it applied.`,
    image: "/assets/og-themes.jpg",
    imageAlt: `MAPARTE colour themes — ${themeIds.length} map palettes`,
    ld: collectionLd({
      name: "Maparte colour themes",
      description: `${themeIds.length} map colour palettes, each shown on the same city map.`,
      path: "/themes",
      image: "/assets/og-themes.jpg",
      items: {
        count: themeIds.length,
        names: themeIds.map((id) => ({ name: themes[id].name, url: `${ORIGIN}/themes/${id}` })),
      },
    }),
  }),
);

for (const id of themeIds) {
  const theme = themes[id];
  const title = `${theme.name} map theme — MAPARTE`;
  const description = `${theme.name}: ${theme.description}. See the full palette on a real city map and start the editor with it applied.`;
  written.push(
    render({
      path: `/themes/${id}`,
      title,
      description,
      image: `/assets/og-themes-${id}.jpg`,
      imageAlt: `MAPARTE ${theme.name} map theme`,
      ld: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url: `${ORIGIN}/themes/${id}`,
        primaryImageOfPage: `${ORIGIN}/assets/og-themes-${id}.jpg`,
        isPartOf: { "@type": "WebSite", name: "MAPARTE", url: ORIGIN },
        about: { "@type": "Thing", name: `${theme.name} map theme` },
      },
    }),
  );
}

console.log(`wrote ${written.length} route shells`);
