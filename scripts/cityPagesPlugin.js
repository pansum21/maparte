import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Blog pages are static files in public/blog; list them here so the generated sitemap keeps them.
const BLOG_PAGES = [
  { path: '', freq: 'weekly', priority: '0.8' },
  { path: '/map-poster-layouts-and-sizes', freq: 'monthly', priority: '0.7' },
  { path: '/map-poster-themes-colour-palettes', freq: 'monthly', priority: '0.7' },
  { path: '/personalised-map-art-gift-ideas', freq: 'monthly', priority: '0.7' },
  { path: '/how-to-choose-a-custom-map-poster-maker', freq: 'monthly', priority: '0.7' },
  { path: '/how-to-make-a-city-map-poster-online', freq: 'monthly', priority: '0.7' },
  { path: '/city-map-wallpaper-phone-desktop', freq: 'monthly', priority: '0.7' },
  { path: '/where-we-met-map-gift', freq: 'monthly', priority: '0.7' },
  { path: '/first-anniversary-map-gift', freq: 'monthly', priority: '0.7' },
  { path: '/marathon-gpx-route-poster', freq: 'monthly', priority: '0.7' },
];

export function transformHtmlForCity(html, city) {
  const cityTitle = `${escapeAttr(city.city)} Map Poster &amp; Wall Art | MAPARTE`;
  const cityDesc = String(city.description ?? '');
  const cityBodyDescription = escapeAttr(city.description ?? '');
  const cityMetaDesc = escapeAttr(city.metaDescription || city.description);
  const cityUrl = `https://maparte.com/cities/${city.slug}`;
  const cityPhotoUrl = `https://maparte.com/assets/city-photos/${city.slug}.webp`;
  const cityPhotoAlt = `${escapeAttr(city.city)} custom map art poster and wallpaper preview`;

  let result = html;

  // 1. Title
  result = result.replace(/<title>.*?<\/title>/, `<title>${cityTitle}</title>`);

  // 2. Meta description
  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${cityMetaDesc}" />`,
  );
  // 3. Canonical & Open Graph URL
  result = result.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${cityUrl}" />`,
  );
  result = result.replace(
    /property="og:url"\s+content="[^"]*"/,
    `property="og:url" content="${cityUrl}"`,
  );

  // 4. Open Graph & Twitter meta tags (with dynamic city photo)
  result = result.replace(
    /property="og:title"\s+content="[^"]*"/,
    `property="og:title" content="${cityTitle}"`,
  );
  result = result.replace(
    /property="og:description"\s+content="[^"]*"/,
    `property="og:description" content="${cityMetaDesc}"`,
  );
  result = result.replace(/property="og:image:type"\s+content="[^"]*"/, `property="og:image:type" content="image/webp"`);
  result = result.replace(/property="og:image:secure_url"\s+content="[^"]*"/, `property="og:image:secure_url" content="${cityPhotoUrl}"`);
  result = result.replace(/property="og:image"\s+content="[^"]*"/,
    `property="og:image" content="${cityPhotoUrl}"`,
  );
  result = result.replace(
    /property="og:image:alt"\s+content="[^"]*"/,
    `property="og:image:alt" content="${cityPhotoAlt}"`,
  );
  result = result.replace(
    /name="twitter:title"\s+content="[^"]*"/,
    `name="twitter:title" content="${cityTitle}"`,
  );
  result = result.replace(
    /name="twitter:description"\s+content="[^"]*"/,
    `name="twitter:description" content="${cityMetaDesc}"`,
  );
  result = result.replace(
    /name="twitter:image"\s+content="[^"]*"/,
    `name="twitter:image" content="${cityPhotoUrl}"`,
  );
  result = result.replace(
    /name="twitter:image:alt"\s+content="[^"]*"/,
    `name="twitter:image:alt" content="${cityPhotoAlt}"`,
  );

  // 5. Schema JSON-LD injection for the city page and its breadcrumb
  const citySchema = `
    <!-- City page and breadcrumb structured data -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://maparte.com/" },
              { "@type": "ListItem", "position": 2, "name": "Cities", "item": "https://maparte.com/cities" },
              { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(`${city.city} Map Poster`)}, "item": "${cityUrl}" }
            ]
          },
          {
            "@type": "WebPage",
            "name": ${JSON.stringify(`${city.city} Map Poster & Wall Art | MAPARTE`)},
            "url": "${cityUrl}",
            "description": ${JSON.stringify(cityDesc)},
            "about": {
              "@type": "Place",
              "name": ${JSON.stringify(`${city.city}, ${city.country}`)},
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": ${Number(city.lat)},
                "longitude": ${Number(city.lon)}
              }
            }
          }
        ]
      }
    </script>
  </head>`;

  result = result.replace(/<\/head>/, citySchema);

  // 6. Pre-rendered Hero Section replacement for search engines
  const landmarksHtml = (city.landmarks || [])
    .map(
      (lm) =>
        `<span style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 5px 14px; border-radius: 100px; font-size: 0.84rem; color: #e2e8f0;">📍 ${escapeAttr(lm)}</span>`,
    )
    .join(' ');

  const cityHero = `
        <section id="hero" style="margin-bottom: 52px; text-align: center;">
          <nav aria-label="Breadcrumb" style="margin-bottom: 16px; font-size: 0.86rem; color: #94a3b8;">
            <a href="/" style="color: #cbd5e1; text-decoration: none;">Home</a> &rsaquo; 
            <a href="/cities" style="color: #cbd5e1; text-decoration: none;">All cities</a> &rsaquo; 
            <span style="color: #dfba73; font-weight: 600;">${escapeAttr(city.city)} Map Poster</span>
          </nav>
          <h1 style="font-size: 2.3rem; color: #f8fafc; margin-bottom: 12px; font-weight: 700; letter-spacing: -0.01em;">Custom Map Poster of ${escapeAttr(city.city)}, ${escapeAttr(city.country)}</h1>
          <p style="font-size: 1.1rem; color: #dfba73; margin-bottom: 18px; font-weight: 600;">${escapeAttr(city.tagline)}</p>
          <p style="font-size: 1.15rem; color: #94a3b8; max-width: 860px; margin: 0 auto 24px; line-height: 1.65;">
            ${cityBodyDescription}
          </p>
          <div style="display: inline-flex; gap: 14px; flex-wrap: wrap; justify-content: center;">
            <a href="/cities/${city.slug}" style="background: linear-gradient(135deg, #dfba73, #c49d56); color: #0b1722; font-weight: 700; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-size: 1rem; box-shadow: 0 4px 14px rgba(223, 186, 115, 0.35);">🎨 Customize a map of ${escapeAttr(city.city)}</a>
            <a href="/cities" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; padding: 13px 26px; border-radius: 8px; text-decoration: none; font-size: 0.95rem;">Browse All Cities</a>
          </div>
          <div style="margin-top: 24px; font-size: 0.88rem; color: #94a3b8;">
            Map location: <strong>${Number(city.lat).toFixed(4)}, ${Number(city.lon).toFixed(4)}</strong> • Use the editor's Download panel to check current output choices.
          </div>
          <div style="margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
            ${landmarksHtml}
          </div>
        </section>`;

  result = result.replace(
    /<section id="hero"[^>]*>[\s\S]*?<\/section>/,
    cityHero,
  );

  return result;
}

function renderCityDirectoryPage(cities) {
  const sortedCities = [...cities].sort((a, b) =>
    String(a.continent || "Other").localeCompare(String(b.continent || "Other")) ||
    String(a.country || "").localeCompare(String(b.country || "")) ||
    String(a.city || "").localeCompare(String(b.city || "")),
  );
  const groups = new Map();
  for (const city of sortedCities) {
    const region = city.continent || "Other";
    const country = city.country || "Other places";
    const key = region + " — " + country;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(city);
  }
  const sections = [...groups.entries()].map(([label, entries]) =>
    '<section class="country"><h2>' + escapeAttr(label) + '</h2><ul>' +
    entries.map((city) =>
      '<li><a href="/cities/' + escapeAttr(city.slug) + '">' +
      escapeAttr(city.city) + ', ' + escapeAttr(city.country) + '</a></li>',
    ).join("") + '</ul></section>',
  ).join("");

  return [
    '<!doctype html>',
    '<html lang="en"><head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>City Map Posters | Browse ' + cities.length + ' Places | MAPARTE</title>',
    '<meta name="description" content="Browse custom map poster pages for ' + cities.length + ' cities and places. Choose a location, personalize its map, and make a digital map design with MAPARTE." />',
    '<meta name="robots" content="index,follow" />',
    '<link rel="canonical" href="https://maparte.com/cities" />',
    '<style>body{margin:0;background:#f6f4ed;color:#182523;font:16px/1.55 Arial,sans-serif}main{max-width:1180px;margin:0 auto;padding:clamp(24px,5vw,64px) clamp(18px,4vw,48px)}a{color:#148b78}header{max-width:800px;margin-bottom:32px}h1{font-size:clamp(2rem,4vw,3.25rem);line-height:1.08;margin:0 0 14px;letter-spacing:-.04em}header p{color:#60706b;font-size:1.1rem;max-width:65ch}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0 36px}.action{display:inline-flex;padding:11px 16px;border-radius:12px;border:1px solid #d9ded5;background:#fffdf8;font-weight:700;text-decoration:none}.action.primary{background:#173c37;color:white;border-color:#173c37}.country{border-top:1px solid #d9ded5;padding:18px 0}.country h2{font-size:1rem;margin:0 0 12px}ul{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px 18px;margin:0;padding:0}li a{display:block;padding:7px 9px;border-radius:8px;text-decoration:none}li a:hover,li a:focus-visible{background:#e8eee7;text-decoration:underline}footer{margin-top:48px;padding-top:20px;border-top:1px solid #d9ded5;color:#60706b;font-size:.9rem}</style>',
    '</head><body><main><header>',
    '<a href="/" aria-label="MAPARTE home">MAPARTE</a>',
    '<h1>Find a place for your map</h1>',
    '<p>Explore map poster pages by region and city. Open a place to preview its map, adjust the design, and create a personal digital map.</p>',
    '<div class="actions"><a class="action primary" href="/?editor=true">Create a custom map</a><a class="action" href="/">Back to MAPARTE</a></div>',
    '</header>',
    sections,
    '<footer>Showing ' + cities.length + ' place pages. MAPARTE creates digital map designs; printing and shipping are not provided.</footer>',
    '</main></body></html>',
  ].join("\n");
}

export function cityPagesPlugin() {
  let resolvedConfig;
  const citiesPath = path.resolve(__dirname, '../src/data/seoCities.json');

  return {
    name: 'city-pages',
    configResolved(config) {
      resolvedConfig = config;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];

        const occasionSlugs = [
          'where-we-met',
          'where-we-met-map',
          'she-said-yes',
          'our-wedding-day',
          'our-first-home',
          'travel-memories',
          'marathon-race',
          'baby-arrival',
          'hometown-roots',
          'mountain-summit'
        ];
        const trimmed = url.replace(/^\/+|\/+$/g, '');
        if (occasionSlugs.includes(trimmed)) {
          const targetSlug = trimmed === 'where-we-met-map' ? 'where-we-met' : trimmed;
          const staticFile = path.resolve(resolvedConfig.root, 'public', targetSlug, 'index.html');
          if (fs.existsSync(staticFile)) {
            const html = fs.readFileSync(staticFile, 'utf8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(html);
          }
        }

        if (url.startsWith('/cities/')) {
          const rawSlug = url.replace('/cities/', '').replace(/\/$/, '');
          const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
          const city = cities.find(
            (c) => c.slug === rawSlug || c.slug === `${rawSlug}-map-poster`,
          );
          if (city) {
            try {
              let html = fs.readFileSync(
                path.resolve(resolvedConfig.root, 'index.html'),
                'utf8',
              );
              html = await server.transformIndexHtml(req.url, html);
              html = transformHtmlForCity(html, city);
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              return res.end(html);
            } catch (err) {
              console.warn('[city-pages] dev render error:', err);
            }
          }
        }
        next();
      });
    },
    async closeBundle() {
      const outDir = path.resolve(
        resolvedConfig.root,
        resolvedConfig.build.outDir,
      );
      const distIndex = path.join(outDir, 'index.html');
      if (!fs.existsSync(distIndex)) return;

      const baseHtml = fs.readFileSync(distIndex, 'utf8');
      const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));

      let count = 0;
      for (const city of cities) {
        const cityDir = path.join(outDir, 'cities', city.slug);
        fs.mkdirSync(cityDir, { recursive: true });

        const cityHtml = transformHtmlForCity(baseHtml, city);
        fs.writeFileSync(path.join(cityDir, 'index.html'), cityHtml, 'utf8');
        count++;
      }

      // Generate a crawlable city directory while keeping every existing city URL.
      const cityDirectoryDir = path.join(outDir, 'cities');
      fs.mkdirSync(cityDirectoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(cityDirectoryDir, 'index.html'),
        renderCityDirectoryPage(cities),
        'utf8',
      );

      // Generate sitemap.xml for the editor, directory, legal pages, blog pages, and city pages.
      const sitemapEntries = [
        `  <url>\n    <loc>https://maparte.com</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n    <image:image>\n      <image:loc>https://maparte.com/assets/banner.jpg</image:loc>\n      <image:title>MAPARTE Custom Map Poster &amp; Wallpaper Maker</image:title>\n    </image:image>\n  </url>`,
        '  <url>\n    <loc>https://maparte.com/cities</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>',
        ...BLOG_PAGES.map((page) => `  <url>\n    <loc>https://www.maparte.com/blog${page.path}</loc>\n    <lastmod>2026-11-20</lastmod>\n    <changefreq>${page.freq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`),
        `  <url>\n    <loc>https://maparte.com/where-we-met-map</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.95</priority>\n    <image:image>\n      <image:loc>https://maparte.com/assets/banner.jpg</image:loc>\n      <image:title>Where We Met Custom Map Poster &amp; Wall Art | MAPARTE</image:title>\n    </image:image>\n  </url>`,
        `  <url>\n    <loc>https://maparte.com/privacy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
        `  <url>\n    <loc>https://maparte.com/terms</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
        `  <url>\n    <loc>https://maparte.com/refund</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
        `  <url>\n    <loc>https://maparte.com/imprint</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
      ];

      for (const city of cities) {
        sitemapEntries.push(
          `  <url>\n    <loc>https://maparte.com/cities/${city.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n    <image:image>\n      <image:loc>https://maparte.com/assets/city-photos/${city.slug}.webp</image:loc>\n      <image:title>${escapeXml(city.city)} map design by MAPARTE</image:title>\n      <image:caption>City photo preview for the ${escapeXml(city.city)}, ${escapeXml(city.country)} map design page</image:caption>\n    </image:image>\n  </url>`,
        );
      }

      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${sitemapEntries.join(
        '\n',
      )}\n</urlset>\n`;

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml, 'utf8');
      fs.writeFileSync(
        path.resolve(resolvedConfig.root, 'public/sitemap.xml'),
        sitemapXml,
        'utf8',
      );

      console.log(
        `[city-pages] successfully generated ${count} city landing pages and sitemap.xml with ${sitemapEntries.length} URLs (with Google Image metadata)`,
      );
    },
  };
}
