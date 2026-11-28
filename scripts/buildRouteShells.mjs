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
const layoutGroupCount = layouts.categories.length;

/** The galleries used to paint nothing until React booted. The shells now
    carry the header and hero so the first paint is the real page, and React
    replaces the same markup when the route chunk arrives. */
const collectionHead = (current) => `<header class="cx-head">
  <a class="cx-head__logo" href="/"><span class="cx-head__dot" aria-hidden="true"></span>Maparte</a>
  <nav class="cx-head__nav" aria-label="Collections">
    <a href="/layouts"${current === "layouts" ? ' aria-current="page"' : ""}>Layouts</a>
    <a href="/themes"${current === "themes" ? ' aria-current="page"' : ""}>Themes</a>
    <a href="/blog">Blog</a>
  </nav>
  <a class="cx-head__cta" href="/?editor=true">Create a map <span aria-hidden="true">↗</span></a>
</header>`;

const layoutsHero = `<div class="cx">${collectionHead("layouts")}
<main><section class="cx-hero">
  <p class="cx-kicker"><i aria-hidden="true"></i> 04 — The layout gallery</p>
  <h1 class="cx-title">Every layout,<br>at real size.</h1>
  <p class="cx-lead">${layoutTotal} formats across ${layoutGroupCount} groups: print sheets, social crops, desktop and phone wallpapers, and web banners. Each one opens with five real map posters in its own shape, so you can see how much of a city actually fits before you choose.</p>
  <div class="cx-stats"><span><b>${layoutTotal}</b> layouts</span><span><b>${layoutGroupCount}</b> groups</span><span><b>5</b> maps per layout</span><span><b>300</b> dpi print export</span></div>
</section></main></div>`;

const themesHero = `<div class="cx">${collectionHead("themes")}
<main><section class="cx-hero">
  <p class="cx-kicker"><i aria-hidden="true"></i> 03 — The theme gallery</p>
  <h1 class="cx-title">One city,<br><em>${themeIds.length}</em> moods.</h1>
  <p class="cx-lead">Every palette recolours roads, water, parks and blocks independently, so the same streets can read as a blueprint, a newsprint page, a neon night or a watercolour. Open any theme to see its full palette and start the editor with it already applied.</p>
  <div class="cx-stats"><span><b>${themeIds.length}</b> themes</span><span><b>13</b> colour roles each</span><span><b>0</b> extra cost</span><span><b>CMYK</b>-safe print exports</span></div>
</section></main></div>`;

const esc = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const replaceAll = (html, from, to) => html.split(from).join(to);

function render({ path, title, description, image, imageAlt, ld, hero }) {
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
  if (hero) {
    html = html.replace('<div id="root"></div>', `<div id="root">${hero}</div>`);
  }
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
    hero: layoutsHero,
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
    hero: themesHero,
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
