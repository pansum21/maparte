/**
 * SVG → PDF.
 *
 * `layeredSvgExporter` already produces the poster as one self-contained SVG:
 * map paths, rules, labels and overlays, all in page units. Instead of
 * screenshotting the canvas and wrapping the JPEG in a PDF, this walks that SVG
 * and writes the same geometry straight into a PDF content stream:
 *
 *   - paths, rects, circles, lines, polygons → PDF path operators, with
 *     transforms, clips, dashes, joins and fills preserved
 *   - text → real glyph outlines taken from the shipped woff files, so the
 *     printer needs no fonts installed and nothing is re-rasterised
 *   - gradients → a small lossless tile, so fades stay smooth instead of
 *     picking up JPEG blocks
 *   - <image> (marker icons, WebGL fallback) → Lossless RGB + soft mask
 *
 * The page carries MediaBox/BleedBox for the full sheet and TrimBox/ArtBox for
 * the finished size, which is what a print shop reads for the cut line.
 */

import { PdfWriter, cmToPt, fmt, splitRgba } from "./pdfWriter";
import { baselineShiftFor, layoutText, resolveFont } from "./textOutlines";
import type { OutlineFont, PathCommand } from "./woffFont";

export type VectorPdfOptions = {
  /** Finished (trim) size in centimetres. */
  widthCm: number;
  heightCm: number;
  /** Bleed added on every side, in millimetres. Default 3 mm. */
  bleedMm?: number;
  title?: string;
};

export type VectorPdfStats = {
  paths: number;
  texts: number;
  images: number;
  gradients: number;
  skippedText: number;
  fonts: string[];
};

type BBox = { x: number; y: number; w: number; h: number };
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/* ------------------------------------------------------------------ helpers */

const num = (el: Element, name: string, fallback = 0): number => {
  const raw = el.getAttribute(name);
  if (raw === null || raw === "") return fallback;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
};

const attrNum = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const refId = (value: string): string => value.replace(/^url\(['"]?#/, "").replace(/['"]?\)$/, "");

const EPSILON = 1e-6;

function mul(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function parseTransform(value: string): Matrix | null {
  let result: Matrix = IDENTITY;
  const pattern = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = pattern.exec(value))) {
    found = true;
    const args = match[2]
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    switch (match[1]) {
      case "matrix":
        if (args.length === 6) result = mul(result, args as Matrix);
        break;
      case "translate":
        result = mul(result, [1, 0, 0, 1, args[0] || 0, args[1] || 0]);
        break;
      case "scale":
        result = mul(result, [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0]);
        break;
      case "rotate": {
        const radians = ((args[0] || 0) * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const rotation: Matrix = [cos, sin, -sin, cos, 0, 0];
        if (args.length >= 3) {
          result = mul(result, [1, 0, 0, 1, args[1], args[2]]);
          result = mul(result, rotation);
          result = mul(result, [1, 0, 0, 1, -args[1], -args[2]]);
        } else {
          result = mul(result, rotation);
        }
        break;
      }
      case "skewX":
        result = mul(result, [1, 0, Math.tan(((args[0] || 0) * Math.PI) / 180), 1, 0, 0]);
        break;
      case "skewY":
        result = mul(result, [1, Math.tan(((args[0] || 0) * Math.PI) / 180), 0, 1, 0, 0]);
        break;
      default:
        break;
    }
  }
  return found ? result : null;
}

const css = (value: number) => fmt(value);

const matrixOps = (m: Matrix) => `${css(m[0])} ${css(m[1])} ${css(m[2])} ${css(m[3])} ${css(m[4])} ${css(m[5])} cm`;

/* ------------------------------------------------------------------- colour */

type Rgb = [number, number, number];

const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  transparent: "#00000000",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
};

function parseColor(input: string): { rgb: Rgb; alpha: number } | null {
  if (!input || input === "none") return null;
  let value = input.trim().toLowerCase();
  if (NAMED[value]) value = NAMED[value];
  if (value === "transparent") return { rgb: [0, 0, 0], alpha: 0 };

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { rgb: [r / 255, g / 255, b / 255], alpha: a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { rgb: [r / 255, g / 255, b / 255], alpha: a };
    }
    return null;
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[\s,/]+/).filter(Boolean);
    const channel = (raw: string) => (raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw) / 255);
    return {
      rgb: [channel(parts[0]), channel(parts[1]), channel(parts[2])],
      alpha: parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]),
    };
  }

  return null;
}

/* --------------------------------------------------------------------- path */

type PathOut = { ops: string[]; bbox: BBox };

const emptyBBox = (): BBox => ({ x: Infinity, y: Infinity, w: 0, h: 0 });

function expand(bbox: BBox, x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  bbox.x = Math.min(bbox.x, x);
  bbox.y = Math.min(bbox.y, y);
  bbox.w = Math.max(bbox.w, x);
  bbox.h = Math.max(bbox.h, y);
}

function finishBBox(bbox: BBox): BBox | null {
  if (!Number.isFinite(bbox.x) || bbox.w < bbox.x) return null;
  return { x: bbox.x, y: bbox.y, w: bbox.w - bbox.x, h: bbox.h - bbox.y };
}

/** Elliptical arc → cubic segments (SVG spec F.6.5). */
function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): number[][] {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < EPSILON || ry < EPSILON) return [[x1, y1, x2, y2, x2, y2]];
  if (Math.abs(x1 - x2) < EPSILON && Math.abs(y1 - y2) < EPSILON) return [];

  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const sign = largeArc === sweep ? -1 : 1;
  const numerator = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, numerator / denominator));
  const cxp = (coef * (rx * y1p)) / ry;
  const cyp = (coef * -(ry * x1p)) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    const value = len < EPSILON ? 0 : Math.min(1, Math.max(-1, dot / len));
    const cross = ux * vy - uy * vx;
    return (cross < 0 ? -1 : 1) * Math.acos(value);
  };

  const startAngle = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaAngle = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && deltaAngle > 0) deltaAngle -= Math.PI * 2;
  if (sweep && deltaAngle < 0) deltaAngle += Math.PI * 2;

  const steps = Math.max(1, Math.ceil(Math.abs(deltaAngle) / (Math.PI / 2)));
  const step = deltaAngle / steps;
  const segments: number[][] = [];
  let th1 = startAngle;

  for (let i = 0; i < steps; i += 1) {
    const th2 = th1 + step;
    const alpha = (4 / 3) * Math.tan((th2 - th1) / 4);
    const cos1 = Math.cos(th1);
    const sin1 = Math.sin(th1);
    const cos2 = Math.cos(th2);
    const sin2 = Math.sin(th2);

    const mapPoint = (px: number, py: number) => {
      const xr = px * rx;
      const yr = py * ry;
      return { x: cosPhi * xr - sinPhi * yr + cx, y: sinPhi * xr + cosPhi * yr + cy };
    };
    const mapVector = (vx: number, vy: number) => {
      const xr = vx * rx;
      const yr = vy * ry;
      return { x: cosPhi * xr - sinPhi * yr, y: sinPhi * xr + cosPhi * yr };
    };

    const p1 = mapPoint(cos1, sin1);
    const p2 = mapPoint(cos2, sin2);
    const d1 = mapVector(cos1 - alpha * sin1, sin1 + alpha * cos1);
    const d2 = mapVector(cos2 + alpha * sin2, sin2 - alpha * cos2);

    segments.push([p1.x + d1.x, p1.y + d1.y, p2.x - d2.x, p2.y - d2.y, p2.x, p2.y]);
    th1 = th2;
  }

  return segments;
}

/** Path data → PDF path operators, tracking the bounding box for gradients. */
function pathToPdf(data: string): PathOut {
  const ops: string[] = [];
  const bbox = emptyBBox();
  const tokens = data.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];

  let index = 0;
  let command = "";
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let prevCubicControl: { x: number; y: number } | null = null;
  let prevQuadControl: { x: number; y: number } | null = null;

  const has = () => index < tokens.length && !/[A-Za-z]/.test(tokens[index]);
  const take = () => Number(tokens[index++]);

  while (index < tokens.length) {
    if (/[A-Za-z]/.test(tokens[index])) {
      command = tokens[index];
      index += 1;
    } else if (!command) {
      index += 1;
      continue;
    }

    const upper = command.toUpperCase();
    const relative = command !== upper;

    if (upper === "Z") {
      ops.push("h");
      cx = startX;
      cy = startY;
      prevCubicControl = null;
      prevQuadControl = null;
      continue;
    }

    if (!has()) {
      if (index < tokens.length) index += 1;
      continue;
    }

    switch (upper) {
      case "M": {
        let x = take();
        let y = take();
        if (relative) {
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        startX = x;
        startY = y;
        expand(bbox, x, y);
        ops.push(`${css(x)} ${css(y)} m`);
        // Extra coordinate pairs after a moveto are implicit linetos.
        while (has()) {
          let lx = take();
          let ly = take();
          if (relative) {
            lx += cx;
            ly += cy;
          }
          cx = lx;
          cy = ly;
          expand(bbox, lx, ly);
          ops.push(`${css(lx)} ${css(ly)} l`);
        }
        break;
      }
      case "L": {
        while (has()) {
          let x = take();
          let y = take();
          if (relative) {
            x += cx;
            y += cy;
          }
          cx = x;
          cy = y;
          expand(bbox, x, y);
          ops.push(`${css(x)} ${css(y)} l`);
        }
        break;
      }
      case "H": {
        while (has()) {
          let x = take();
          if (relative) x += cx;
          cx = x;
          expand(bbox, x, cy);
          ops.push(`${css(x)} ${css(cy)} l`);
        }
        break;
      }
      case "V": {
        while (has()) {
          let y = take();
          if (relative) y += cy;
          cy = y;
          expand(bbox, cx, y);
          ops.push(`${css(cx)} ${css(y)} l`);
        }
        break;
      }
      case "C": {
        while (has()) {
          let x1 = take();
          let y1 = take();
          let x2 = take();
          let y2 = take();
          let x = take();
          let y = take();
          if (relative) {
            x1 += cx;
            y1 += cy;
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          ops.push(`${css(x1)} ${css(y1)} ${css(x2)} ${css(y2)} ${css(x)} ${css(y)} c`);
          expand(bbox, x1, y1);
          expand(bbox, x2, y2);
          expand(bbox, x, y);
          prevCubicControl = { x: x2, y: y2 };
          prevQuadControl = null;
          cx = x;
          cy = y;
        }
        break;
      }
      case "S": {
        while (has()) {
          const x1 = prevCubicControl ? 2 * cx - prevCubicControl.x : cx;
          const y1 = prevCubicControl ? 2 * cy - prevCubicControl.y : cy;
          let x2 = take();
          let y2 = take();
          let x = take();
          let y = take();
          if (relative) {
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          ops.push(`${css(x1)} ${css(y1)} ${css(x2)} ${css(y2)} ${css(x)} ${css(y)} c`);
          expand(bbox, x2, y2);
          expand(bbox, x, y);
          prevCubicControl = { x: x2, y: y2 };
          prevQuadControl = null;
          cx = x;
          cy = y;
        }
        break;
      }
      case "Q": {
        while (has()) {
          let qx = take();
          let qy = take();
          let x = take();
          let y = take();
          if (relative) {
            qx += cx;
            qy += cy;
            x += cx;
            y += cy;
          }
          const c1x = cx + (2 / 3) * (qx - cx);
          const c1y = cy + (2 / 3) * (qy - cy);
          const c2x = x + (2 / 3) * (qx - x);
          const c2y = y + (2 / 3) * (qy - y);
          ops.push(`${css(c1x)} ${css(c1y)} ${css(c2x)} ${css(c2y)} ${css(x)} ${css(y)} c`);
          expand(bbox, qx, qy);
          expand(bbox, x, y);
          prevQuadControl = { x: qx, y: qy };
          prevCubicControl = null;
          cx = x;
          cy = y;
        }
        break;
      }
      case "T": {
        while (has()) {
          const qx: number = prevQuadControl ? 2 * cx - prevQuadControl.x : cx;
          const qy: number = prevQuadControl ? 2 * cy - prevQuadControl.y : cy;
          let x = take();
          let y = take();
          if (relative) {
            x += cx;
            y += cy;
          }
          const c1x = cx + (2 / 3) * (qx - cx);
          const c1y = cy + (2 / 3) * (qy - cy);
          const c2x = x + (2 / 3) * (qx - x);
          const c2y = y + (2 / 3) * (qy - y);
          ops.push(`${css(c1x)} ${css(c1y)} ${css(c2x)} ${css(c2y)} ${css(x)} ${css(y)} c`);
          expand(bbox, x, y);
          prevQuadControl = { x: qx, y: qy };
          prevCubicControl = null;
          cx = x;
          cy = y;
        }
        break;
      }
      case "A": {
        while (has()) {
          const rx = take();
          const ry = take();
          const rotation = take();
          const largeArc = take() !== 0;
          const sweep = take() !== 0;
          let x = take();
          let y = take();
          if (relative) {
            x += cx;
            y += cy;
          }
          for (const segment of arcToCubics(cx, cy, rx, ry, rotation, largeArc, sweep, x, y)) {
            ops.push(
              `${css(segment[0])} ${css(segment[1])} ${css(segment[2])} ${css(segment[3])} ${css(segment[4])} ${css(segment[5])} c`,
            );
          }
          expand(bbox, x, y);
          cx = x;
          cy = y;
          prevCubicControl = null;
          prevQuadControl = null;
        }
        break;
      }
      default:
        index += 1;
        break;
    }
  }

  return { ops, bbox: finishBBox(bbox) ?? { x: 0, y: 0, w: 0, h: 0 } };
}

const KAPPA = 0.5522847498;

function roundedRectPath(x: number, y: number, w: number, h: number, rx: number, ry: number): string[] {
  const rlx = Math.min(rx, w / 2);
  const rly = Math.min(ry, h / 2);
  if (rlx <= 0 || rly <= 0) return [`${css(x)} ${css(y)} ${css(w)} ${css(h)} re`];
  const kx = rlx * KAPPA;
  const ky = rly * KAPPA;
  return [
    `${css(x + rlx)} ${css(y)} m`,
    `${css(x + w - rlx)} ${css(y)} l`,
    `${css(x + w - rlx + kx)} ${css(y)} ${css(x + w)} ${css(y + rly - ky)} ${css(x + w)} ${css(y + rly)} c`,
    `${css(x + w)} ${css(y + h - rly)} l`,
    `${css(x + w)} ${css(y + h - rly + ky)} ${css(x + w - rlx + kx)} ${css(y + h)} ${css(x + w - rlx)} ${css(y + h)} c`,
    `${css(x + rlx)} ${css(y + h)} l`,
    `${css(x + rlx - kx)} ${css(y + h)} ${css(x)} ${css(y + h - rly + ky)} ${css(x)} ${css(y + h - rly)} c`,
    `${css(x)} ${css(y + rly)} l`,
    `${css(x)} ${css(y + rly - ky)} ${css(x + rlx - kx)} ${css(y)} ${css(x + rlx)} ${css(y)} c`,
    "h",
  ];
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string[] {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    `${css(cx + rx)} ${css(cy)} m`,
    `${css(cx + rx)} ${css(cy + ky)} ${css(cx + kx)} ${css(cy + ry)} ${css(cx)} ${css(cy + ry)} c`,
    `${css(cx - kx)} ${css(cy + ry)} ${css(cx - rx)} ${css(cy + ky)} ${css(cx - rx)} ${css(cy)} c`,
    `${css(cx - rx)} ${css(cy - ky)} ${css(cx - kx)} ${css(cy - ry)} ${css(cx)} ${css(cy - ry)} c`,
    `${css(cx + kx)} ${css(cy - ry)} ${css(cx + rx)} ${css(cy - ky)} ${css(cx + rx)} ${css(cy)} c`,
    "h",
  ];
}

/* ------------------------------------------------------------------- state */

type State = {
  fill: string;
  fillOpacity: number;
  fillRule: "nonzero" | "evenodd";
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  lineCap: number;
  lineJoin: number;
  dash: number[] | null;
  opacity: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: string;
  textAnchor: string;
  dominantBaseline: string;
};

const baseState = (): State => ({
  fill: "#000000",
  fillOpacity: 1,
  fillRule: "nonzero",
  stroke: "none",
  strokeOpacity: 1,
  strokeWidth: 1,
  lineCap: 0,
  lineJoin: 0,
  dash: null,
  opacity: 1,
  color: "#000000",
  fontFamily: "sans-serif",
  fontSize: 16,
  fontWeight: 400,
  letterSpacing: "normal",
  textAnchor: "start",
  dominantBaseline: "auto",
});

function lineCapValue(value: string | null): number {
  if (value === "round") return 1;
  if (value === "square") return 2;
  return 0;
}

function lineJoinValue(value: string | null): number {
  if (value === "round") return 1;
  if (value === "bevel") return 2;
  return 0;
}

function parseDash(value: string | null): number[] | null {
  if (!value || value === "none") return null;
  const parts = value
    .split(/[\s,]+/)
    .map(Number)
    .filter((part) => Number.isFinite(part) && part >= 0);
  return parts.length && parts.some((part) => part > 0) ? parts : null;
}

/* ---------------------------------------------------------------- renderer */

class SvgRenderer {
  readonly ops: string[] = [];
  readonly stats: VectorPdfStats = { paths: 0, texts: 0, images: 0, gradients: 0, skippedText: 0, fonts: [] };

  private readonly defs = new Map<string, Element>();
  private readonly usedFonts = new Set<string>();

  /** Path batches can be huge, so they are appended one by one, not spread. */
  private pushAll(items: string[]) {
    for (const item of items) this.ops.push(item);
  }

  constructor(
    private readonly writer: PdfWriter,
    private readonly viewport: BBox,
    private readonly images: Map<Element, string>,
    private readonly gradientTiles: Map<string, string>,
    private readonly fonts: Map<Element, OutlineFont[] | null>,
  ) {}

  registerDefs(root: Element) {
    for (const el of Array.from(root.querySelectorAll("[id]"))) {
      const id = el.getAttribute("id");
      if (id) this.defs.set(id, el);
    }
  }

  render(root: Element) {
    this.visit(root, baseState(), 0);
  }

  private inherit(el: Element, parent: State): State {
    const state: State = { ...parent };
    const attr = (name: string) => el.getAttribute(name);

    const fill = attr("fill");
    if (fill !== null) state.fill = fill;
    const stroke = attr("stroke");
    if (stroke !== null) state.stroke = stroke;
    const color = attr("color");
    if (color) state.color = color;

    const fillOpacity = attr("fill-opacity");
    if (fillOpacity) state.fillOpacity = parent.fillOpacity * attrNum(fillOpacity, 1);
    const strokeOpacity = attr("stroke-opacity");
    if (strokeOpacity) state.strokeOpacity = parent.strokeOpacity * attrNum(strokeOpacity, 1);
    const opacity = attr("opacity");
    state.opacity = parent.opacity * (opacity ? attrNum(opacity, 1) : 1);

    if (attr("fill-rule")) state.fillRule = attr("fill-rule") === "evenodd" ? "evenodd" : "nonzero";
    const strokeWidth = attr("stroke-width");
    if (strokeWidth) state.strokeWidth = attrNum(strokeWidth, 1);
    if (attr("stroke-linecap") !== null) state.lineCap = lineCapValue(attr("stroke-linecap"));
    if (attr("stroke-linejoin") !== null) state.lineJoin = lineJoinValue(attr("stroke-linejoin"));
    if (attr("stroke-dasharray") !== null) state.dash = parseDash(attr("stroke-dasharray"));

    if (attr("font-family")) state.fontFamily = attr("font-family") as string;
    if (attr("font-size")) state.fontSize = attrNum(attr("font-size"), 16);
    if (attr("font-weight")) state.fontWeight = attrNum(attr("font-weight"), 400);
    if (attr("letter-spacing")) state.letterSpacing = attr("letter-spacing") as string;
    if (attr("text-anchor")) state.textAnchor = attr("text-anchor") as string;
    if (attr("dominant-baseline")) state.dominantBaseline = attr("dominant-baseline") as string;

    return state;
  }

  private visit(el: Element, parent: State, depth: number) {
    if (depth > 60) return;
    const tag = el.tagName.toLowerCase().replace(/^svg:/, "");
    if (["defs", "clippath", "lineargradient", "radialgradient", "title", "desc", "style", "metadata", "symbol", "mask", "pattern", "filter"].includes(tag)) {
      return;
    }

    const state = this.inherit(el, parent);
    const opened: string[] = [];

    const transform = el.getAttribute("transform");
    if (transform) {
      const matrix = parseTransform(transform);
      if (matrix) {
        this.ops.push("q", matrixOps(matrix));
        opened.push("Q");
      }
    }

    const clipAttr = el.getAttribute("clip-path");
    if (clipAttr) {
      const clipEl = this.defs.get(refId(clipAttr));
      if (clipEl) {
        this.ops.push("q");
        this.emitClip(clipEl);
        opened.push("Q");
      }
    }

    switch (tag) {
      case "g":
      case "a":
      case "switch":
        for (const child of Array.from(el.children)) this.visit(child, state, depth + 1);
        break;
      case "svg":
        if (depth === 0) {
          for (const child of Array.from(el.children)) this.visit(child, state, depth + 1);
        } else {
          this.nestedSvg(el, state, depth);
        }
        break;
      case "path":
        this.drawPath(el.getAttribute("d") || "", null, state);
        break;
      case "rect": {
        const x = num(el, "x");
        const y = num(el, "y");
        const w = num(el, "width");
        const h = num(el, "height");
        if (w <= 0 || h <= 0) break;
        const rx = num(el, "rx", 0);
        const ry = num(el, "ry", rx);
        this.drawPath("", { x, y, w, h }, state, roundedRectPath(x, y, w, h, rx, ry));
        break;
      }
      case "circle": {
        const cx = num(el, "cx");
        const cy = num(el, "cy");
        const r = num(el, "r");
        if (r <= 0) break;
        this.drawPath("", { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, state, ellipsePath(cx, cy, r, r));
        break;
      }
      case "ellipse": {
        const cx = num(el, "cx");
        const cy = num(el, "cy");
        const rx = num(el, "rx");
        const ry = num(el, "ry");
        if (rx <= 0 || ry <= 0) break;
        this.drawPath("", { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }, state, ellipsePath(cx, cy, rx, ry));
        break;
      }
      case "line": {
        const x1 = num(el, "x1");
        const y1 = num(el, "y1");
        const x2 = num(el, "x2");
        const y2 = num(el, "y2");
        this.drawPath("", { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }, state, [
          `${css(x1)} ${css(y1)} m`,
          `${css(x2)} ${css(y2)} l`,
        ]);
        break;
      }
      case "polyline":
      case "polygon": {
        const points = (el.getAttribute("points") || "")
          .trim()
          .split(/[\s,]+/)
          .map(Number)
          .filter((value) => Number.isFinite(value));
        if (points.length < 4) break;
        const ops: string[] = [`${css(points[0])} ${css(points[1])} m`];
        let minX = points[0];
        let minY = points[1];
        let maxX = points[0];
        let maxY = points[1];
        for (let i = 2; i + 1 < points.length; i += 2) {
          ops.push(`${css(points[i])} ${css(points[i + 1])} l`);
          minX = Math.min(minX, points[i]);
          maxX = Math.max(maxX, points[i]);
          minY = Math.min(minY, points[i + 1]);
          maxY = Math.max(maxY, points[i + 1]);
        }
        if (tag === "polygon") ops.push("h");
        this.drawPath("", { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, state, ops);
        break;
      }
      case "text":
        this.drawText(el, state);
        break;
      case "image":
        this.drawImage(el, state);
        break;
      default:
        for (const child of Array.from(el.children)) this.visit(child, state, depth + 1);
        break;
    }

    for (let i = opened.length - 1; i >= 0; i -= 1) this.ops.push(opened[i]);
  }

  private nestedSvg(el: Element, state: State, depth: number) {
    const x = num(el, "x");
    const y = num(el, "y");
    const width = num(el, "width");
    const height = num(el, "height");
    const viewBox = el.getAttribute("viewBox");
    if (width <= 0 || height <= 0) return;

    const matrix: Matrix = [1, 0, 0, 1, x, y];
    this.ops.push("q", matrixOps(matrix));
    this.ops.push(`${css(0)} ${css(0)} ${css(width)} ${css(height)} re W n`);

    if (viewBox) {
      const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
      if (vw > 0 && vh > 0) {
        const preserve = el.getAttribute("preserveAspectRatio") || "xMidYMid meet";
        let sx = width / vw;
        let sy = height / vh;
        let offsetX = 0;
        let offsetY = 0;
        if (!preserve.includes("none")) {
          const scale = preserve.includes("slice") ? Math.max(sx, sy) : Math.min(sx, sy);
          sx = scale;
          sy = scale;
          const freeX = width - vw * scale;
          const freeY = height - vh * scale;
          offsetX = preserve.includes("xMax") ? freeX : preserve.includes("xMid") ? freeX / 2 : 0;
          offsetY = preserve.includes("YMax") ? freeY : preserve.includes("YMid") ? freeY / 2 : 0;
        }
        this.ops.push(matrixOps([sx, 0, 0, sy, offsetX - vx * sx, offsetY - vy * sy]));
      }
    }

    for (const child of Array.from(el.children)) this.visit(child, state, depth + 1);
    this.ops.push("Q");
  }

  /** Clip geometry; the caller follows it with `W n` and a `Q` later. */
  private emitClip(clipEl: Element) {
    for (const child of Array.from(clipEl.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "ellipse" || tag === "circle") {
        const cx = num(child, "cx");
        const cy = num(child, "cy");
        const rx = tag === "circle" ? num(child, "r") : num(child, "rx");
        const ry = tag === "circle" ? num(child, "r") : num(child, "ry");
        this.pushAll(ellipsePath(cx, cy, rx, ry));
      } else if (tag === "rect") {
        const x = num(child, "x");
        const y = num(child, "y");
        this.ops.push(`${css(x)} ${css(y)} ${css(num(child, "width"))} ${css(num(child, "height"))} re`);
      } else if (tag === "path") {
        this.pushAll(pathToPdf(child.getAttribute("d") || "").ops);
      }
    }
    // Clip paths in the poster are userSpaceOnUse, i.e. already page units.
    this.ops.push("W n");
  }

  /** One /ExtGState covers both channels, so alpha is set once per shape. */
  private applyPaint(fillAlpha: number, strokeAlpha: number) {
    if (fillAlpha >= 1 && strokeAlpha >= 1) return;
    this.ops.push(`/${this.writer.alphaState(fillAlpha, strokeAlpha)} gs`);
  }

  private resolvePaint(value: string, state: State): { rgb: Rgb; alpha: number } | null {
    const input = value === "currentColor" ? state.color : value;
    return parseColor(input);
  }

  private drawPath(d: string, box: BBox | null, state: State, explicitOps?: string[]) {
    const parsed = explicitOps ? { ops: explicitOps, bbox: box ?? this.viewport } : pathToPdf(d);
    if (!parsed.ops.length) return;

    const fillValue = state.fill;
    const gradient = fillValue.startsWith("url(") ? this.gradientTiles.get(refId(fillValue)) : null;
    const fillColor = gradient ? null : this.resolvePaint(fillValue, state);
    const strokeColor = state.stroke && state.stroke !== "none" ? this.resolvePaint(state.stroke, state) : null;

    const hasFill = Boolean(gradient || (fillColor && fillColor.alpha > 0 && state.fillOpacity > 0 && state.opacity > 0));
    const hasStroke = Boolean(strokeColor && strokeColor.alpha > 0 && state.strokeOpacity > 0 && state.opacity > 0 && state.strokeWidth > 0);

    if (!hasFill && !hasStroke) return;

    const fillAlpha = (fillColor?.alpha ?? 1) * state.fillOpacity * state.opacity;
    const strokeAlpha = (strokeColor?.alpha ?? 1) * state.strokeOpacity * state.opacity;

    this.stats.paths += 1;

    const paintFill = Boolean(fillColor && hasFill);

    if (gradient && hasFill) {
      this.ops.push("q");
      if (state.opacity < 1) this.ops.push(`/${this.writer.alphaState(state.opacity, 1)} gs`);
      this.pushAll(parsed.ops);
      this.ops.push("W n");
      const area = parsed.bbox && parsed.bbox.w > 0 && parsed.bbox.h > 0 ? parsed.bbox : box ?? this.viewport;
      this.placeImage(gradient, area);
      this.ops.push("Q");
    }

    if (hasStroke) {
      this.applyPaint(paintFill ? fillAlpha : 1, strokeAlpha);
      if (strokeColor) this.ops.push(`${css(strokeColor.rgb[0])} ${css(strokeColor.rgb[1])} ${css(strokeColor.rgb[2])} RG`);
      if (paintFill && fillColor) {
        this.ops.push(`${css(fillColor.rgb[0])} ${css(fillColor.rgb[1])} ${css(fillColor.rgb[2])} rg`);
      }
      this.ops.push(`${css(state.strokeWidth)} w`);
      this.ops.push(`${state.lineCap} J ${state.lineJoin} j`);
      this.ops.push(state.dash ? `[${state.dash.map(css).join(" ")}] 0 d` : "[] 0 d");
      this.pushAll(parsed.ops);
      this.ops.push(paintFill ? (state.fillRule === "evenodd" ? "B*" : "B") : "S");
      return;
    }

    if (paintFill && fillColor) {
      this.applyPaint(fillAlpha, 1);
      this.ops.push(`${css(fillColor.rgb[0])} ${css(fillColor.rgb[1])} ${css(fillColor.rgb[2])} rg`);
      this.pushAll(parsed.ops);
      this.ops.push(state.fillRule === "evenodd" ? "f*" : "f");
    }
  }

  /** Draws an already-registered image across a rectangle of the page. */
  private placeImage(name: string, box: BBox) {
    // The page frame is y-down (the content stream flips it), so the image
    // matrix negates height to keep the first pixel row at the top.
    this.ops.push(
      "q",
      `${css(box.w)} 0 0 ${css(-box.h)} ${css(box.x)} ${css(box.y + box.h)} cm`,
      `/${name} Do`,
      "Q",
    );
  }

  private drawImage(el: Element, state: State) {
    const name = this.images.get(el);
    if (!name) return;
    const width = num(el, "width", this.viewport.w);
    const height = num(el, "height", this.viewport.h);
    if (width <= 0 || height <= 0) return;
    const box: BBox = { x: num(el, "x"), y: num(el, "y"), w: width, h: height };
    this.ops.push("q");
    if (state.opacity < 1) this.ops.push(`/${this.writer.alphaState(state.opacity, 1)} gs`);
    this.placeImage(name, box);
    this.ops.push("Q");
    this.stats.images += 1;
  }

  private drawText(el: Element, state: State) {
    const raw = el.textContent ?? "";
    const content = raw.replace(/\s+/g, " ").trim();
    if (!content) return;

    const fonts = this.fonts.get(el);
    if (!fonts || !fonts.length) {
      // Nothing is drawn rather than a wrong-looking substitute; the caller
      // gets the count so the export can warn instead of silently losing type.
      this.stats.skippedText += 1;
      return;
    }

    const xs = parseNumberList(el.getAttribute("x"));
    const ys = parseNumberList(el.getAttribute("y"));
    const x = xs[0] ?? 0;
    const y = ys[0] ?? 0;

    const chars = Array.from(content);
    const xPositions = xs.length === chars.length && xs.length > 1 ? xs : undefined;

    const letterSpacing = resolveLetterSpacing(state.letterSpacing, state.fontSize);
    const anchor =
      state.textAnchor === "middle" ? "middle" : state.textAnchor === "end" ? "end" : "start";
    const placement = layoutText(fonts, content, x, y, {
      fontSize: state.fontSize,
      letterSpacing,
      anchor,
      baselineShift: baselineShiftFor(state.dominantBaseline, fonts[0], state.fontSize),
      xPositions,
    });

    if (!placement.commands.length) return;

    const color = this.resolvePaint(state.fill, state);
    if (!color || color.alpha <= 0) return;

    const alpha = color.alpha * state.fillOpacity * state.opacity;
    if (alpha < 1) this.ops.push(`/${this.writer.alphaState(alpha, 1)} gs`);
    this.ops.push(`${css(color.rgb[0])} ${css(color.rgb[1])} ${css(color.rgb[2])} rg`);
    this.pushAll(commandsToOps(placement.commands));
    this.ops.push("f");

    this.stats.texts += 1;
    if (!this.usedFonts.has(state.fontFamily)) {
      this.usedFonts.add(state.fontFamily);
      this.stats.fonts.push(state.fontFamily);
    }
  }
}

function commandsToOps(commands: PathCommand[]): string[] {
  const ops: string[] = [];
  for (const command of commands) {
    switch (command.type) {
      case "M":
        ops.push(`${css(command.x)} ${css(command.y)} m`);
        break;
      case "L":
        ops.push(`${css(command.x)} ${css(command.y)} l`);
        break;
      case "C":
        ops.push(`${css(command.x1)} ${css(command.y1)} ${css(command.x2)} ${css(command.y2)} ${css(command.x)} ${css(command.y)} c`);
        break;
      case "Q": {
        // Only reachable if a caller hands over raw font-space commands.
        const last = ops[ops.length - 1]
          ?.split(" ")
          .filter(Boolean)
          .map(Number);
        const fromX = last && last.length >= 2 ? last[last.length - 2] : command.cx;
        const fromY = last && last.length >= 2 ? last[last.length - 1] : command.cy;
        const c1x = fromX + (2 / 3) * (command.cx - fromX);
        const c1y = fromY + (2 / 3) * (command.cy - fromY);
        const c2x = command.x + (2 / 3) * (command.cx - command.x);
        const c2y = command.y + (2 / 3) * (command.cy - command.y);
        ops.push(`${css(c1x)} ${css(c1y)} ${css(c2x)} ${css(c2y)} ${css(command.x)} ${css(command.y)} c`);
        break;
      }
      default:
        ops.push("h");
        break;
    }
  }
  return ops;
}

function parseNumberList(value: string | null): number[] {
  if (!value) return [];
  return value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((part) => Number.isFinite(part));
}

function resolveLetterSpacing(value: string, fontSize: number): number {
  if (!value || value === "normal") return 0;
  if (value.endsWith("em")) return parseFloat(value) * fontSize;
  if (value.endsWith("%")) return (parseFloat(value) / 100) * fontSize * 0.5;
  return parseFloat(value) || 0;
}

/* ------------------------------------------------------------- asset preps */

async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode an embedded SVG image"));
    image.src = src;
  });
}

function gradientColorStops(gradEl: Element): Array<{ offset: number; color: Rgb; alpha: number }> {
  const stops: Array<{ offset: number; color: Rgb; alpha: number }> = [];
  for (const stop of Array.from(gradEl.querySelectorAll("stop"))) {
    const offsetRaw = (stop.getAttribute("offset") || "0").trim();
    const offset = offsetRaw.endsWith("%") ? parseFloat(offsetRaw) / 100 : parseFloat(offsetRaw) || 0;
    const color = parseColor(stop.getAttribute("stop-color") || "#000000") ?? { rgb: [0, 0, 0] as Rgb, alpha: 1 };
    const alpha = (color.alpha ?? 1) * attrNum(stop.getAttribute("stop-opacity"), 1);
    stops.push({ offset: Math.min(1, Math.max(0, offset)), color: color.rgb, alpha });
  }
  return stops.sort((a, b) => a.offset - b.offset);
}

function gradientCoord(el: Element, name: string, fallback: number): number {
  const raw = el.getAttribute(name);
  if (!raw) return fallback;
  return raw.trim().endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw) || 0;
}

/**
 * Gradients are kept as a small lossless tile instead of a PDF shading so the
 * stop alpha (the poster fades use it) survives exactly, and the fade can never
 * band or block the way a compressed raster would.
 */
async function buildGradientTile(gradEl: Element, writer: PdfWriter): Promise<string | null> {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const stops = gradientColorStops(gradEl);
  if (!stops.length) return null;

  const x1 = gradientCoord(gradEl, "x1", 0);
  const y1 = gradientCoord(gradEl, "y1", 0);
  const x2 = gradientCoord(gradEl, "x2", 0);
  const y2 = gradientCoord(gradEl, "y2", 1);

  const gradient = context.createLinearGradient(x1 * size, y1 * size, x2 * size, y2 * size);
  for (const stop of stops) {
    gradient.addColorStop(
      stop.offset,
      `rgba(${Math.round(stop.color[0] * 255)}, ${Math.round(stop.color[1] * 255)}, ${Math.round(
        stop.color[2] * 255,
      )}, ${stop.alpha})`,
    );
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const { data } = context.getImageData(0, 0, size, size);
  return writer.addImage(splitRgba(data, size, size));
}

/* -------------------------------------------------------------------- main */

export async function svgToPdfBlob(
  svgMarkup: string,
  options: VectorPdfOptions,
): Promise<{ blob: Blob; stats: VectorPdfStats }> {
  const parsed = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const parseError = parsed.querySelector("parsererror");
  if (parseError) throw new Error("The poster SVG could not be parsed for PDF export");
  const root = parsed.documentElement;
  if (!root) throw new Error("The poster SVG is empty");

  const viewBoxAttr = root.getAttribute("viewBox") || "";
  const viewBoxValues = viewBoxAttr.split(/[\s,]+/).map(Number);
  const trimWidthPx = parseFloat(root.getAttribute("width") || "0") || viewBoxValues[2] || 1000;
  const trimHeightPx = parseFloat(root.getAttribute("height") || "0") || viewBoxValues[3] || 1000;
  const viewport: BBox =
    viewBoxValues.length === 4 && viewBoxValues[2] > 0
      ? { x: viewBoxValues[0], y: viewBoxValues[1], w: viewBoxValues[2], h: viewBoxValues[3] }
      : { x: 0, y: 0, w: trimWidthPx, h: trimHeightPx };

  const writer = new PdfWriter();
  const images = new Map<Element, string>();
  const gradientTiles = new Map<string, string>();
  const fonts = new Map<Element, OutlineFont[] | null>();

  // Pre-pass: raster layers (marker icons and the WebGL fallback).
  for (const el of Array.from(root.querySelectorAll("image"))) {
    const href = el.getAttribute("href") || el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!href) continue;
    try {
      const htmlImage = await loadHtmlImage(href);
      const targetW = Math.max(1, Math.min(4096, Math.round(num(el, "width", htmlImage.naturalWidth || 1))));
      const targetH = Math.max(1, Math.min(4096, Math.round(num(el, "height", htmlImage.naturalHeight || 1))));
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.drawImage(htmlImage, 0, 0, targetW, targetH);
      const { data } = context.getImageData(0, 0, targetW, targetH);
      images.set(el, await writer.addImage(splitRgba(data, targetW, targetH)));
    } catch (error) {
      console.warn("[pdf] embedded image skipped", error);
    }
  }

  // Pre-pass: gradients become one tile each.
  for (const gradEl of Array.from(root.querySelectorAll("linearGradient"))) {
    const id = gradEl.getAttribute("id");
    if (!id) continue;
    const name = await buildGradientTile(gradEl, writer);
    if (name) gradientTiles.set(id, name);
  }
  for (const radialEl of Array.from(root.querySelectorAll("radialGradient"))) {
    const id = radialEl.getAttribute("id");
    if (!id) continue;
    // No radial gradients in the poster, but a flat mid stop beats a blank fill.
    const stops = gradientColorStops(radialEl);
    const mid = stops[Math.floor(stops.length / 2)];
    if (!mid) continue;
    const size = 8;
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i += 1) {
      data[i * 4] = mid.color[0] * 255;
      data[i * 4 + 1] = mid.color[1] * 255;
      data[i * 4 + 2] = mid.color[2] * 255;
      data[i * 4 + 3] = mid.alpha * 255;
    }
    gradientTiles.set(id, await writer.addImage(splitRgba(data, size, size)));
  }

  // Pre-pass: fonts, deduplicated by family + weight.
  for (const el of Array.from(root.querySelectorAll("text"))) {
    const family = el.getAttribute("font-family") || "sans-serif";
    const weight = attrNum(el.getAttribute("font-weight"), 400);
    // The sample decides which subset (latin vs latin-ext) owns the glyphs.
    const lookup = await resolveFont(family, weight, (el.textContent || "").trim());
    fonts.set(el, lookup?.fonts ?? null);
  }

  const renderer = new SvgRenderer(writer, viewport, images, gradientTiles, fonts);
  renderer.registerDefs(root);
  renderer.render(root);

  const bleedPt = cmToPt((options.bleedMm ?? 3) / 10);
  const trimWidth = cmToPt(options.widthCm);
  const trimHeight = cmToPt(options.heightCm);
  const mediaWidth = trimWidth + bleedPt * 2;
  const mediaHeight = trimHeight + bleedPt * 2;

  // Cover the whole sheet: the trim rectangle has to be full of artwork even
  // after the bleed is cut away, so scale up (never letterbox).
  const scale = Math.max(mediaWidth / viewport.w, mediaHeight / viewport.h);
  const offsetX = (mediaWidth - viewport.w * scale) / 2;
  const offsetY = (mediaHeight - viewport.h * scale) / 2;

  const content = [
    "q",
    // Flip to SVG's y-down frame once, for the whole page.
    matrixOps([1, 0, 0, -1, 0, mediaHeight]),
    matrixOps([scale, 0, 0, scale, offsetX - viewport.x * scale, offsetY - viewport.y * scale]),
    ...renderer.ops,
    "Q",
  ].join("\n");

  const blob = await writer.build({
    mediaWidth,
    mediaHeight,
    trim: [bleedPt, bleedPt, bleedPt + trimWidth, bleedPt + trimHeight],
    content,
    title: options.title,
  });

  return { blob, stats: renderer.stats };
}
