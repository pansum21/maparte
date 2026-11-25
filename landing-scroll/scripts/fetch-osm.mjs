/**
 * Bakes real OpenStreetMap geometry into the poster files.
 *
 * Source: OpenFreeMap vector tiles (Protomaps basemap schema, OSM data, ODbL).
 * Every place is cropped to a square, clipped per tile so no street is drawn
 * twice at a seam, simplified, quantised and written as compact SVG path data
 * in a 1200 × 1200 viewBox.
 *
 *   bun scripts/fetch-osm.mjs            # all places
 *   bun scripts/fetch-osm.mjs lisbon     # one place
 */
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const UA = "maparte-poster/1.0 (build script; +https://maparte.studio)";
const FALLBACK_PLANET = "https://tiles.openfreemap.org/planet/20261122_124456_pt";

/** Resolve the current planet build so a retired snapshot doesn't break the bake. */
async function planetBase() {
  if (process.env.PLANET_URL) return process.env.PLANET_URL;
  try {
    const res = await fetch("https://tiles.openfreemap.org/planet", {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    const template = json?.tiles?.[0];
    if (typeof template === "string") {
      return template.replace(/\/\{z\}\/\{x\}\/\{y\}\.pbf$/, "");
    }
  } catch {
    // fall through to the pinned build
  }
  return FALLBACK_PLANET;
}

const PLANET = await planetBase();
const Z = 14;
const EXTENT = 4096;
const SIZE = 1200;
const ROOT = path.resolve(import.meta.dir, "..");
const TILE_CACHE = path.join(ROOT, ".cache", "osm-tiles");
const OUT_DIR = path.join(ROOT, "src", "landing", "osm");

const PLACES = [
  { slug: "jaipur", name: "Jaipur", lat: 26.9124, lon: 75.7873, span: 2300 },
  { slug: "kyoto", name: "Kyoto", lat: 35.0116, lon: 135.7681, span: 2300 },
  { slug: "lisbon", name: "Lisbon", lat: 38.713, lon: -9.138, span: 2600 },
  { slug: "portland", name: "Portland", lat: 45.5152, lon: -122.6784, span: 2400 },
  { slug: "reykjavik", name: "Reykjavík", lat: 64.1466, lon: -21.9426, span: 2400 },
  { slug: "buenos-aires", name: "Buenos Aires", lat: -34.6037, lon: -58.3816, span: 2400 },
  { slug: "nairobi", name: "Nairobi", lat: -1.2921, lon: 36.8219, span: 2400 },
  { slug: "osaka", name: "Osaka", lat: 34.6937, lon: 135.5023, span: 2400 },
  { slug: "tbilisi", name: "Tbilisi", lat: 41.7151, lon: 44.8271, span: 2200 },
  { slug: "valparaiso", name: "Valparaíso", lat: -33.0472, lon: -71.6127, span: 2200 },
  { slug: "hanoi", name: "Hanoi", lat: 21.0278, lon: 105.8342, span: 2200 },
  { slug: "marrakesh", name: "Marrakesh", lat: 31.6295, lon: -7.9811, span: 2000 },
  { slug: "montreal", name: "Montréal", lat: 45.5019, lon: -73.5674, span: 2400 },
  { slug: "seoul", name: "Seoul", lat: 37.5665, lon: 126.978, span: 2400 },
  { slug: "bristol", name: "Bristol", lat: 51.4545, lon: -2.5879, span: 2200 },
  { slug: "istanbul", name: "Istanbul", lat: 41.0082, lon: 28.9784, span: 2400 },
  { slug: "mexico-city", name: "Mexico City", lat: 19.4326, lon: -99.1332, span: 2400 },
  { slug: "copenhagen", name: "Copenhagen", lat: 55.6761, lon: 12.5683, span: 2200 },
  { slug: "cape-town", name: "Cape Town", lat: -33.915, lon: 18.42, span: 2600 },
  { slug: "sydney", name: "Sydney", lat: -33.8688, lon: 151.2093, span: 2600 },
];

/* ------------------------------------------------------------- geometry */

const mercY = (lat) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

const TOLERANCE = 0.75;
const MIN_SEGMENT = 3.2;
const MIN_AREA = 6;

const dist2 = (p, a, b) => {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
};

/** Ramer–Douglas–Peucker on a polyline of [x, y] pairs. */
function simplify(points, tolerance = TOLERANCE) {
  if (points.length < 3) return points;
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [0, points.length - 1];

  while (stack.length) {
    const last = stack.pop();
    const first = stack.pop();
    let index = -1;
    let best = sq;
    for (let i = first + 1; i < last; i++) {
      const d = dist2(points[i], points[first], points[last]);
      if (d > best) {
        best = d;
        index = i;
      }
    }
    if (index > 0) {
      keep[index] = 1;
      stack.push(first, index, index, last);
    }
  }

  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

const round = (p) => [Math.round(p[0]), Math.round(p[1])];

const length = (pts) => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
};

const area = (pts) => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(a) / 2;
};

/** Clip a polyline against an axis-aligned rect; returns zero or more pieces. */
function clipLine(pts, rect) {
  const pieces = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = clipSegment(a, b, rect);
    if (seg) pieces.push(seg);
  }

  // stitch pieces that share an endpoint
  const out = [];
  const used = new Array(pieces.length).fill(false);
  const same = (p, q) => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01;
  for (let i = 0; i < pieces.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let chain = pieces[i].slice();
    let grew = true;
    while (grew) {
      grew = false;
      for (let j = 0; j < pieces.length; j++) {
        if (used[j]) continue;
        const s = pieces[j];
        if (same(chain[chain.length - 1], s[0])) {
          chain = chain.concat(s.slice(1));
        } else if (same(chain[chain.length - 1], s[1])) {
          chain = chain.concat(s.slice(1).reverse());
        } else if (same(chain[0], s[1])) {
          chain = s.slice(0, -1).concat(chain);
        } else if (same(chain[0], s[0])) {
          chain = s.slice(1).reverse().concat(chain);
        } else continue;
        used[j] = true;
        grew = true;
      }
    }
    out.push(chain);
  }

  const seen = new Set();
  return out.filter((piece) => {
    if (piece.length < 2) return false;
    const key = `${piece[0][0]},${piece[0][1]},${piece[piece.length - 1][0]},${piece[piece.length - 1][1]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Liang–Barsky segment clip. */
function clipSegment(a, b, rect) {
  const [x0, y0, x1, y1] = rect;
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];

  const edges = [
    [-dx, a[0] - x0],
    [dx, x1 - a[0]],
    [-dy, a[1] - y0],
    [dy, y1 - a[1]],
  ];

  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }

  return [
    [a[0] + t0 * dx, a[1] + t0 * dy],
    [a[0] + t1 * dx, a[1] + t1 * dy],
  ];
}

/** Sutherland–Hodgman clip of a closed ring. */
function clipRing(ring, rect) {
  const [x0, y0, x1, y1] = rect;
  const edges = [
    { inside: (p) => p[0] >= x0, cut: (a, b) => cutX(a, b, x0) },
    { inside: (p) => p[0] <= x1, cut: (a, b) => cutX(a, b, x1) },
    { inside: (p) => p[1] >= y0, cut: (a, b) => cutY(a, b, y0) },
    { inside: (p) => p[1] <= y1, cut: (a, b) => cutY(a, b, y1) },
  ];

  let output = ring;
  for (const edge of edges) {
    if (!output.length) return [];
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      const currentIn = edge.inside(current);
      const previousIn = edge.inside(previous);
      if (currentIn) {
        if (!previousIn) output.push(edge.cut(previous, current));
        output.push(current);
      } else if (previousIn) {
        output.push(edge.cut(previous, current));
      }
    }
  }
  return output;
}

const cutX = (a, b, x) => {
  const t = (x - a[0]) / (b[0] - a[0] || 1e-9);
  return [x, a[1] + t * (b[1] - a[1])];
};
const cutY = (a, b, y) => {
  const t = (y - a[1]) / (b[1] - a[1] || 1e-9);
  return [a[0] + t * (b[0] - a[0]), y];
};

/* ------------------------------------------------------------ path data */

const sep = (n) => (n < 0 ? "" : " ");

function linePath(pieces) {
  let d = "";
  for (const pts of pieces) {
    if (pts.length < 2) continue;
    const q = pts.map(round);
    d += `M${q[0][0]} ${q[0][1]}`;
    for (let i = 1; i < q.length; i++) {
      const dx = q[i][0] - q[i - 1][0];
      const dy = q[i][1] - q[i - 1][1];
      if (!dx && !dy) continue;
      d += `l${dx}${sep(dy)}${dy}`;
    }
  }
  return d;
}

function fillPath(rings) {
  let d = "";
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const q = ring.map(round);
    d += `M${q[0][0]} ${q[0][1]}`;
    for (let i = 1; i < q.length; i++) {
      const dx = q[i][0] - q[i - 1][0];
      const dy = q[i][1] - q[i - 1][1];
      if (!dx && !dy) continue;
      d += `l${dx}${sep(dy)}${dy}`;
    }
    d += "z";
  }
  return d;
}

/* --------------------------------------------------------------- tiles */

const cachePath = (x, y) => path.join(TILE_CACHE, `${Z}-${x}-${y}.pbf`);

async function tileBytes(x, y) {
  const file = cachePath(x, y);
  try {
    return await readFile(file);
  } catch {
    // not cached yet
  }
  const url = `${PLANET}/${Z}/${x}/${y}.pbf`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      await mkdir(TILE_CACHE, { recursive: true });
      await writeFile(file, buf);
      return Buffer.from(buf);
    } catch (error) {
      if (attempt === 3) throw new Error(`${url}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }
  return Buffer.alloc(0);
}

const ROAD_CLASSES = {
  motorway: "trunk",
  motorway_link: "trunk",
  trunk: "trunk",
  trunk_link: "trunk",
  primary: "major",
  primary_link: "major",
  secondary: "major",
  secondary_link: "major",
  tertiary: "major",
  tertiary_link: "major",
  minor: "minor",
  service: "minor",
  living_street: "minor",
  unclassified: "minor",
  residential: "minor",
  rail: "rail",
  transit: "rail",
};

const PARK_CLASSES = new Set([
  "park",
  "forest",
  "wood",
  "grass",
  "garden",
  "playground",
  "pitch",
  "recreation_ground",
  "golf_course",
  "nature_reserve",
  "cemetery",
  "national_park",
  "protected_area",
  "common",
]);

function classify(layer, props) {
  const cls = props.class ?? props.subclass ?? "";
  if (layer === "transportation") return ROAD_CLASSES[cls] ?? null;
  if (layer === "water") return "water";
  if (layer === "waterway") return "waterline";
  if (layer === "building") return "building";
  if (layer === "landuse" || layer === "landcover" || layer === "park") {
    return PARK_CLASSES.has(cls) ? "park" : null;
  }
  return null;
}

async function bake(place) {
  const dLat = place.span / 2 / 111320;
  const dLon = place.span / 2 / (111320 * Math.cos((place.lat * Math.PI) / 180));
  const north = place.lat + dLat;
  const south = place.lat - dLat;
  const west = place.lon - dLon;
  const east = place.lon + dLon;

  const wx0 = (west + 180) / 360;
  const wx1 = (east + 180) / 360;
  const wy0 = mercY(north);
  const wy1 = mercY(south);
  const sx = SIZE / (wx1 - wx0);
  const sy = SIZE / (wy1 - wy0);

  const n = 2 ** Z;
  const tx0 = Math.floor(wx0 * n);
  const tx1 = Math.floor(wx1 * n);
  const ty0 = Math.floor(wy0 * n);
  const ty1 = Math.floor(wy1 * n);

  const buckets = {
    water: [],
    waterline: [],
    park: [],
    building: [],
    minor: [],
    major: [],
    trunk: [],
    rail: [],
  };

  const toView = (tx, ty) => (x, y) => [
    ((tx + x / EXTENT) / n - wx0) * sx,
    ((ty + y / EXTENT) / n - wy0) * sy,
  ];

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || ty < 0 || tx >= n || ty >= n) continue;
      const bytes = await tileBytes(tx, ty);
      if (!bytes.length) continue;
      const tile = new VectorTile(new PbfReader(new Uint8Array(bytes)));

      const rect = [
        Math.max(0, ((tx / n - wx0) * sx)),
        Math.max(0, ((ty / n - wy0) * sy)),
        Math.min(SIZE, (((tx + 1) / n - wx0) * sx)),
        Math.min(SIZE, (((ty + 1) / n - wy0) * sy)),
      ];
      if (rect[2] - rect[0] <= 0 || rect[3] - rect[1] <= 0) continue;

      for (const layerName of Object.keys(tile.layers)) {
        const layer = tile.layers[layerName];
        for (let i = 0; i < layer.length; i++) {
          const feature = layer.feature(i);
          const kind = classify(layerName, feature.properties);
          if (!kind) continue;

          const project = toView(tx, ty);
          const geometry = feature.loadGeometry();
          const isFill = kind === "water" || kind === "park" || kind === "building";

          if (isFill) {
            for (const ring of geometry) {
              const projected = ring.map((p) => project(p.x, p.y));
              const clipped = clipRing(projected, rect);
              if (clipped.length < 3) continue;
              const simple = simplify(clipped, kind === "building" ? 1.1 : TOLERANCE);
              const size2 = area(simple);
              if (simple.length < 3 || size2 < MIN_AREA) continue;
              buckets[kind].push({ pts: simple, area: size2 });
            }
          } else {
            for (const line of geometry) {
              if (line.length < 2) continue;
              const projected = line.map((p) => project(p.x, p.y));
              for (const piece of clipLine(projected, rect)) {
                const simple = simplify(piece);
                const span = length(simple);
                if (simple.length < 2 || span < MIN_SEGMENT) continue;
                buckets[kind].push({ pts: simple, area: span });
              }
            }
          }
        }
      }
    }
  }

  const data = {
    slug: place.slug,
    name: place.name,
    center: [place.lat, place.lon],
    span: place.span,
    size: SIZE,
    credit: "© OpenStreetMap contributors",
  };

  // Keep the layers that read at poster size: the biggest footprints and
  // green patches, not every garden shed. Everything below is still real OSM.
  const LIMITS = {
    building: { min: 22, max: 1500 },
    park: { min: 40, max: 800 },
    water: { min: 8, max: 4000 },
  };

  for (const kind of Object.keys(buckets)) {
    let items = buckets[kind];
    if (!items.length) continue;
    const limit = LIMITS[kind];
    if (limit) {
      items = items
        .filter((item) => item.area >= limit.min)
        .sort((a, b) => b.area - a.area)
        .slice(0, limit.max);
    }
    if (!items.length) continue;
    data[kind] =
      kind === "water" || kind === "park" || kind === "building"
        ? fillPath(items.map((i) => i.pts))
        : linePath(items.map((i) => i.pts));
    buckets[kind] = items;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const json = JSON.stringify(data);
  const ts = `import type { OsmCity } from "../osmTypes";\n\nconst city: OsmCity = ${JSON.stringify(data, null, 2)};\n\nexport default city;\n`;
  await writeFile(path.join(OUT_DIR, `${place.slug}.ts`), ts);

  const counts = Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, v.length])
  );
  console.log(
    `${place.slug.padEnd(14)} ${(json.length / 1024).toFixed(0).padStart(4)} kB  ${JSON.stringify(counts)}`
  );
  return data;
}

const only = process.argv.slice(2);
const queue = only.length
  ? PLACES.filter((p) => only.includes(p.slug))
  : PLACES;

const results = [];
for (const place of queue) {
  results.push(await bake(place));
  await new Promise((r) => setTimeout(r, 250));
}

if (!only.length) {
  const index = `import type { OsmCity } from "../osmTypes";\n\n${results
    .map((r) => `import ${ident(r.slug)} from "./${r.slug}";`)
    .join("\n")}\n\nexport const OSM: Record<string, OsmCity> = {\n${results
    .map((r) => `  "${r.slug}": ${ident(r.slug)},`)
    .join("\n")}\n};\n\nexport const getOsm = (slug: string): OsmCity => {\n  const city = OSM[slug];\n  if (!city) throw new Error(\`No baked OSM data for "\${slug}"\`);\n  return city;\n};\n`;
  await writeFile(path.join(OUT_DIR, "index.ts"), index);
  console.log(`\nwrote ${results.length} cities + index.ts`);
}

function ident(slug) {
  return slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
