/**
 * Minimap-style overlay shared by the live preview and every export path.
 *
 * Everything is described as one SVG string on a 1000 x 1000 grid, so the preview
 * (rendered as an image), the PNG/TIFF compositor (drawn onto the canvas) and the
 * layered SVG export all show exactly the same artwork. Letters are drawn as
 * strokes instead of text so no font has to be loaded for the export.
 */

export const MINIMAP_GRID = 1000;
export const DEFAULT_NAV_MARKER_COLOR = "#2F7BFF";
export const MINIMAP_ROUTE_COLOR = "#E5303A";

/** Width of the compass ring band, in grid units, measured inwards from the rim. */
const RING_BAND = 74;

export interface MinimapOverlayOptions {
  /** circle: ring/ticks/letters apply. square: only route and marker apply. */
  shape: "circle" | "square";
  ring: boolean;
  route: boolean;
  marker: boolean;
  /** 0.5 – 2, 1 = default. */
  markerSize: number;
  markerColor: string;
  /** Ring band fill (usually the poster background). */
  ringBackground: string;
  /** Ticks, letters and rim colour (usually the poster text colour). */
  ringForeground: string;
  /**
   * band: ring drawn inside the map window (original circle layout).
   * poster: the grid is the whole compass slot around the map; the map circle is
   * POSTER_MAP_RADIUS wide and ticks and letters sit outside it.
   */
  ringStyle?: "band" | "poster";
}

/** Poster style: map circle radius on the 1000 grid (matches CIRCLE_POSTER_MAP_FRACTION). */
export const POSTER_MAP_RADIUS = 410;
/** Poster style: where the optional route ends, as a heading and distance from the centre. */
const POSTER_ROUTE_HEADING_DEG = 45;
const POSTER_ROUTE_LENGTH = 335;

type Pt = [number, number];

function clampHex(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function mixHex(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (target - c) * amount);
  };
  const out = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${out.toString(16).padStart(6, "0")}`;
}

const f = (v: number) => Number(v.toFixed(2));
const pts = (list: Pt[]) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");

/** Gentle default route: enters from the lower left edge and ends on the centre. */
export const MINIMAP_ROUTE_POINTS = {
  start: [165, 788] as Pt,
  c1: [260, 735] as Pt,
  c2: [330, 690] as Pt,
  mid: [385, 615] as Pt,
  c3: [440, 540] as Pt,
  end: [500, 500] as Pt,
};

function routePath(): string {
  const r = MINIMAP_ROUTE_POINTS;
  return `M${r.start} C${r.c1} ${r.c2} ${r.mid} S${r.c3} ${r.end}`.replace(/,/g, " ");
}

/** Heading (degrees clockwise from north) of the route at the marker. */
export function getRouteEndHeadingDeg(): number {
  const r = MINIMAP_ROUTE_POINTS;
  const dx = r.end[0] - r.c3[0];
  const dy = r.end[1] - r.c3[1];
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

function rotate(point: Pt, deg: number, cx: number, cy: number): Pt {
  const a = (deg * Math.PI) / 180;
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

function letterPath(letter: "N" | "E" | "S" | "W", cx: number, cy: number, scale = 1): string {
  const w = 15 * scale;
  const h = 21 * scale;
  const p = (x: number, y: number) => `${f(cx + x)} ${f(cy + y)}`;
  switch (letter) {
    case "N":
      return `M${p(-w, h)} L${p(-w, -h)} L${p(w, h)} L${p(w, -h)}`;
    case "E":
      return `M${p(w, -h)} L${p(-w, -h)} L${p(-w, h)} L${p(w, h)} M${p(-w, 0)} L${p(w * 0.7, 0)}`;
    case "S":
      return `M${p(w, -h * 0.72)} C${p(w, -h * 1.15)} ${p(-w, -h * 1.15)} ${p(-w, -h * 0.5)} ` +
        `C${p(-w, -h * 0.05)} ${p(w, h * 0.05)} ${p(w, h * 0.5)} ` +
        `C${p(w, h * 1.15)} ${p(-w, h * 1.15)} ${p(-w, h * 0.72)}`;
    case "W":
    default:
      return `M${p(-w * 1.1, -h)} L${p(-w * 0.55, h)} L${p(0, -h * 0.25)} L${p(w * 0.55, h)} L${p(w * 1.1, -h)}`;
  }
}

function buildRing(fg: string, bg: string): string {
  const c = MINIMAP_GRID / 2;
  const rimR = c - 1.5;
  const bandR = c - RING_BAND / 2;
  const innerR = c - RING_BAND;
  const parts: string[] = [];
  parts.push(
    `<circle cx="${c}" cy="${c}" r="${f(bandR)}" fill="none" stroke="${bg}" stroke-opacity="0.97" stroke-width="${RING_BAND}"/>`,
  );
  parts.push(`<circle cx="${c}" cy="${c}" r="${f(rimR)}" fill="none" stroke="${fg}" stroke-opacity="0.85" stroke-width="3"/>`);
  parts.push(`<circle cx="${c}" cy="${c}" r="${f(innerR)}" fill="none" stroke="${fg}" stroke-opacity="0.55" stroke-width="2"/>`);

  const ticks: string[] = [];
  for (let deg = 0; deg < 360; deg += 6) {
    const major = deg % 30 === 0;
    const isCardinal = deg % 90 === 0;
    if (isCardinal) continue; // cardinal positions carry the letters
    const outer = c - 9;
    const inner = outer - (major ? 18 : 9);
    const a = (deg * Math.PI) / 180;
    const x1 = c + Math.sin(a) * outer;
    const y1 = c - Math.cos(a) * outer;
    const x2 = c + Math.sin(a) * inner;
    const y2 = c - Math.cos(a) * inner;
    ticks.push(
      `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${major ? 4 : 2.2}" stroke-opacity="${major ? 0.95 : 0.6}"/>`,
    );
  }
  parts.push(`<g stroke="${fg}" stroke-linecap="round">${ticks.join("")}</g>`);

  const letterR = c - RING_BAND / 2 - 1;
  const letters: Array<["N" | "E" | "S" | "W", number, number]> = [
    ["N", c, c - letterR],
    ["E", c + letterR, c],
    ["S", c, c + letterR],
    ["W", c - letterR, c],
  ];
  parts.push(
    `<g fill="none" stroke="${fg}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">` +
      letters
        .filter(([l]) => l !== "N")
        .map(([l, x, y]) => `<path d="${letterPath(l, x, y)}"/>`)
        .join("") +
      `</g>`,
  );
  // North stays highlighted in the route colour, like the pointer on a real compass.
  parts.push(
    `<path d="${letterPath("N", letters[0][1], letters[0][2])}" fill="none" stroke="${MINIMAP_ROUTE_COLOR}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  return parts.join("");
}

function buildRoute(): string {
  const d = routePath();
  return (
    `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="0.92" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${MINIMAP_ROUTE_COLOR}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function buildMarker(color: string, size: number, heading: number, centre: Pt = MINIMAP_ROUTE_POINTS.end): string {
  const [cx, cy] = centre;
  const k = 0.58 * Math.max(0.5, Math.min(2, size));
  const base = (list: Pt[]): Pt[] =>
    list.map(([x, y]) => rotate([cx + x * k, cy + y * k], heading, cx, cy));

  const tip: Pt = [0, -60];
  const right: Pt = [42, 48];
  const notch: Pt = [0, 24];
  const left: Pt = [-42, 48];

  const outline = base([tip, right, notch, left]);
  const leftFacet = base([tip, notch, left]);
  const rightFacet = base([tip, right, notch]);

  const dark = mixHex(color, 0, 0.55);
  const mid = mixHex(color, 0, 0.12);
  const light = mixHex(color, 255, 0.32);
  const depth = Math.max(3, Math.round(10 * k));

  // Solid extrusion: stacked copies of the outline pushed straight down on the poster.
  const extrusion: string[] = [];
  for (let i = depth; i >= 1; i -= 1) {
    extrusion.push(
      `<polygon points="${pts(outline.map(([x, y]) => [x, y + i] as Pt))}" fill="${dark}" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>`,
    );
  }

  const shadowBase = outline.map(([x, y]) => [x + 6, y + depth + 10] as Pt);
  return (
    `<defs><filter id="mm-shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${f(7 * k)}"/></filter></defs>` +
    `<polygon points="${pts(shadowBase)}" fill="#000000" fill-opacity="0.38" filter="url(#mm-shadow)"/>` +
    `<polygon points="${pts(outline.map(([x, y]) => [x, y + depth] as Pt))}" fill="none" stroke="#FFFFFF" stroke-width="${f(13 * Math.min(1.4, k))}" stroke-linejoin="round"/>` +
    extrusion.join("") +
    `<polygon points="${pts(outline)}" fill="none" stroke="#FFFFFF" stroke-width="${f(12 * Math.min(1.4, k))}" stroke-linejoin="round"/>` +
    `<polygon points="${pts(leftFacet)}" fill="${light}"/>` +
    `<polygon points="${pts(rightFacet)}" fill="${mid}"/>` +
    `<polyline points="${pts([base([tip])[0], base([notch])[0]])}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>` +
    `<polygon points="${pts(outline)}" fill="none" stroke="#FFFFFF" stroke-width="${f(4.5 * Math.min(1.4, k))}" stroke-linejoin="round"/>`
  );
}

function posterRoutePoints(): { start: Pt; end: Pt } {
  const a = (POSTER_ROUTE_HEADING_DEG * Math.PI) / 180;
  const c = MINIMAP_GRID / 2;
  return { start: [c, c], end: [c + Math.sin(a) * POSTER_ROUTE_LENGTH, c - Math.cos(a) * POSTER_ROUTE_LENGTH] };
}

/** Thin rim, tick ring and N/E/S/W letters outside the map circle. */
function buildPosterRing(fg: string): string {
  const c = MINIMAP_GRID / 2;
  const R = POSTER_MAP_RADIUS;
  const parts: string[] = [];
  parts.push(`<circle cx="${c}" cy="${c}" r="${R + 4}" fill="none" stroke="${fg}" stroke-opacity="0.95" stroke-width="4"/>`);
  const ticks: string[] = [];
  for (let deg = 0; deg < 360; deg += 6) {
    const major = deg % 30 === 0;
    const cardinal = deg % 90 === 0;
    const inner = R + 14;
    const outer = inner + (cardinal ? 16 : major ? 22 : 11);
    const a = (deg * Math.PI) / 180;
    ticks.push(
      `<line x1="${f(c + Math.sin(a) * inner)}" y1="${f(c - Math.cos(a) * inner)}" x2="${f(c + Math.sin(a) * outer)}" y2="${f(c - Math.cos(a) * outer)}" stroke-width="${major || cardinal ? 3.4 : 2.2}" stroke-opacity="${major || cardinal ? 0.95 : 0.6}"/>`,
    );
  }
  parts.push(`<g stroke="${fg}" stroke-linecap="round">${ticks.join("")}</g>`);

  const scale = 1.2;
  const letterR = 470;
  const letters: Array<["N" | "E" | "S" | "W", number, number]> = [
    ["N", c, c - letterR],
    ["E", c + letterR, c],
    ["S", c, c + letterR],
    ["W", c - letterR, c],
  ];
  parts.push(
    `<g fill="none" stroke="${fg}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">` +
      letters.map(([l, x, y]) => `<path d="${letterPath(l, x, y, scale)}"/>`).join("") +
      `</g>`,
  );
  return parts.join("");
}

function buildPosterRoute(): string {
  const { start, end } = posterRoutePoints();
  const d = `M${f(start[0])} ${f(start[1])} L${f(end[0])} ${f(end[1])}`;
  return (
    `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${MINIMAP_ROUTE_COLOR}" stroke-width="3.6" stroke-linecap="round"/>` +
    `<circle cx="${f(end[0])}" cy="${f(end[1])}" r="6.5" fill="${MINIMAP_ROUTE_COLOR}" stroke="#FFFFFF" stroke-width="2"/>`
  );
}

/** Inner markup only (1000 x 1000 grid), for embedding inside another SVG. */
export function buildMinimapOverlayInner(options: MinimapOverlayOptions): string {
  const fg = clampHex(options.ringForeground, "#FFFFFF");
  const bg = clampHex(options.ringBackground, "#101820");
  const color = clampHex(options.markerColor, DEFAULT_NAV_MARKER_COLOR);
  const parts: string[] = [];
  if (options.ringStyle === "poster") {
    if (options.shape === "circle" && options.ring) parts.push(buildPosterRing(fg));
    if (options.marker) {
      parts.push(
        buildMarker(color, options.markerSize, 0, [
          MINIMAP_GRID / 2,
          MINIMAP_GRID / 2,
        ]),
      );
    }
    return parts.join("");
  }
  if (options.shape === "circle" && options.ring) parts.push(buildRing(fg, bg));
  if (options.marker) {
    parts.push(buildMarker(color, options.markerSize, 0));
  }
  return parts.join("");
}

export function hasMinimapContent(options: MinimapOverlayOptions): boolean {
  return options.marker || (options.shape === "circle" && options.ring);
}

/** Standalone SVG document for DOM images and canvas drawing. */
export function buildMinimapOverlaySvg(options: MinimapOverlayOptions, pixelSize = MINIMAP_GRID): string {
  const px = Math.max(1, Math.round(pixelSize));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${MINIMAP_GRID} ${MINIMAP_GRID}">` +
    buildMinimapOverlayInner(options) +
    `</svg>`
  );
}
