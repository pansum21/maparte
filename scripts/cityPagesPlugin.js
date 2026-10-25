import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function transformHtmlForCity(html, city) {
  const cityTitle = `${city.city} Custom Map Poster &amp; Wall Art | 500 DPI Print — MAPARTE`;
  const cityDesc = escapeAttr(city.description);
  const cityMetaDesc = escapeAttr(city.metaDescription || city.description);
  const cityUrl = `https://maparte.vercel.app/cities/${city.slug}`;
  const keywords = `${city.city} map poster, ${city.city} city map print, ${city.city} custom map art, ${city.city} street map, ${city.city} wall art, buy ${city.city} map, ${city.city} map wallpaper, free map generator, maparte`;

  let result = html;

  // 1. Title
  result = result.replace(/<title>.*?<\/title>/, `<title>${cityTitle}</title>`);

  // 2. Meta description & keywords
  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${cityMetaDesc}" />`,
  );
  result = result.replace(
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
    `<meta name="keywords" content="${escapeAttr(keywords)}" />`,
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

  // 4. Open Graph & Twitter meta tags
  result = result.replace(
    /property="og:title"\s+content="[^"]*"/,
    `property="og:title" content="${cityTitle}"`,
  );
  result = result.replace(
    /property="og:description"\s+content="[^"]*"/,
    `property="og:description" content="${cityMetaDesc}"`,
  );
  result = result.replace(
    /name="twitter:title"\s+content="[^"]*"/,
    `name="twitter:title" content="${cityTitle}"`,
  );
  result = result.replace(
    /name="twitter:description"\s+content="[^"]*"/,
    `name="twitter:description" content="${cityMetaDesc}"`,
  );

  // 5. Schema JSON-LD injection for Breadcrumb and City Product
  const citySchema = `
    <!-- City Breadcrumbs & Product Structured Data -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://maparte.vercel.app/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Cities",
                "item": "https://maparte.vercel.app/#popular-cities"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "${escapeAttr(city.city)} Map Poster",
                "item": "${cityUrl}"
              }
            ]
          },
          {
            "@type": "Product",
            "name": "${escapeAttr(city.city)} Custom Map Poster",
            "image": "https://maparte.vercel.app/assets/banner.png",
            "description": "${cityDesc}",
            "brand": {
              "@type": "Brand",
              "name": "MAPARTE"
            },
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock",
              "url": "${cityUrl}"
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
            <a href="/#popular-cities" style="color: #cbd5e1; text-decoration: none;">Cities</a> &rsaquo; 
            <span style="color: #dfba73; font-weight: 600;">${escapeAttr(city.city)} Map Poster</span>
          </nav>
          <h1 style="font-size: 2.3rem; color: #f8fafc; margin-bottom: 12px; font-weight: 700; letter-spacing: -0.01em;">Custom Map Poster of ${escapeAttr(city.city)}, ${escapeAttr(city.country)}</h1>
          <p style="font-size: 1.1rem; color: #dfba73; margin-bottom: 18px; font-weight: 600;">${escapeAttr(city.tagline)}</p>
          <p style="font-size: 1.15rem; color: #94a3b8; max-width: 860px; margin: 0 auto 24px; line-height: 1.65;">
            ${city.description}
          </p>
          <div style="display: inline-flex; gap: 14px; flex-wrap: wrap; justify-content: center;">
            <a href="/cities/${city.slug}" style="background: linear-gradient(135deg, #dfba73, #c49d56); color: #0b1722; font-weight: 700; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-size: 1rem; box-shadow: 0 4px 14px rgba(223, 186, 115, 0.35);">🎨 Customize ${escapeAttr(city.city)} Map Poster Live in 500 DPI</a>
            <a href="#popular-cities" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; padding: 13px 26px; border-radius: 8px; text-decoration: none; font-size: 0.95rem;">Browse Other Cities</a>
          </div>
          <div style="margin-top: 24px; font-size: 0.88rem; color: #94a3b8;">
            Geographic Coordinates: <strong>${Number(city.lat).toFixed(4)}° N, ${Number(city.lon).toFixed(4)}° E</strong> • Formats: <strong>500 DPI PNG, Vector PDF &amp; Layered SVG</strong>
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

      // Generate comprehensive sitemap.xml with all 81 cities
      const today = new Date().toISOString().split('T')[0];
      const sitemapEntries = [
        `  <url>\n    <loc>https://maparte.vercel.app</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
        `  <url>\n    <loc>https://maparte.vercel.app/privacy</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
        `  <url>\n    <loc>https://maparte.vercel.app/imprint</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`,
      ];

      for (const city of cities) {
        sitemapEntries.push(
          `  <url>\n    <loc>https://maparte.vercel.app/cities/${city.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
        );
      }

      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join(
        '\n',
      )}\n</urlset>\n`;

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml, 'utf8');
      fs.writeFileSync(
        path.resolve(resolvedConfig.root, 'public/sitemap.xml'),
        sitemapXml,
        'utf8',
      );

      console.log(
        `[city-pages] successfully generated ${count} city landing pages and sitemap.xml with ${sitemapEntries.length} URLs`,
      );
    },
  };
}
