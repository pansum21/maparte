import type { SquareCaptionGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import { isLatinScript } from "@/features/poster/domain/textLayout";

/**
 * Name block for the poster style circle layout.
 *
 * One pure layout shared by the live preview (SVG), the PNG export (canvas) and the
 * layered SVG export, so all three show the same text at the same place. Text is
 * measured once, then every letter gets its own x position. The underline is exactly
 * as wide as the printed name (never wider) and long names shrink or wrap instead
 * of running off the poster.
 */

/** Returns the width in px of `text` set in the CSS font shorthand `font`. */
export type MeasureText = (font: string, text: string) => number;

export interface CirclePosterCaptionInput {
  geometry: SquareCaptionGeometry;
  city: string;
  country: string;
  coords: string;
  customDate?: string;
  showText: boolean;
  includeCredits: boolean;
  creditUrl: string;
  /** Full CSS font-family stacks. */
  headingFamily: string;
  midlineFamily: string;
  bottomFamily: string;
  creditFamily: string;
  headingScale: number;
  midlineScale: number;
  bottomScale: number;
}

export interface PosterTextRun {
  /** Characters to draw (spaces are skipped, they only add distance). */
  chars: string;
  /** One x per character (left edge). Non-Latin text is one run with a single x. */
  xs: number[];
  baselineY: number;
  size: number;
  weight: number;
  family: string;
  opacity: number;
}

export interface PosterRule {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}

export interface PosterCredit {
  text: string;
  x: number;
  y: number;
  size: number;
  anchor: "start" | "end";
  family: string;
  opacity: number;
}

export interface CirclePosterCaptionLayout {
  runs: PosterTextRun[];
  rules: PosterRule[];
  credits: PosterCredit[];
}

const REF = 100;
const CAP = 0.72;

interface Measured {
  /** Advance of each char at size 1, aligned to `chars` (spaces included). */
  advances: number[];
  chars: string[];
  tracking: number;
  whole: boolean;
}

function measureLine(text: string, family: string, weight: number, tracking: number, measure: MeasureText): Measured {
  const font = `${weight} ${REF}px ${family}`;
  if (!isLatinScript(text) || tracking === 0) {
    return { advances: [measure(font, text) / REF], chars: [text], tracking: 0, whole: true };
  }
  const chars = Array.from(text);
  return { advances: chars.map((c) => measure(font, c) / REF), chars, tracking, whole: false };
}

/** Ink width at size 1: advances plus tracking between letters, none after the last. */
function inkWidth(m: Measured): number {
  if (m.whole) return m.advances[0];
  let total = 0;
  m.advances.forEach((a) => { total += a; });
  return total + m.tracking * Math.max(0, m.chars.length - 1);
}

function placeRun(
  m: Measured,
  size: number,
  startX: number,
  baselineY: number,
  weight: number,
  family: string,
  opacity: number,
): PosterTextRun {
  if (m.whole) {
    return { chars: m.chars[0], xs: [startX], baselineY, size, weight, family, opacity };
  }
  const chars: string[] = [];
  const xs: number[] = [];
  let x = startX;
  m.chars.forEach((c, i) => {
    if (c !== " ") {
      chars.push(c);
      xs.push(Number(x.toFixed(2)));
    }
    x += (m.advances[i] + m.tracking) * size;
  });
  return { chars: chars.join(""), xs, baselineY, size, weight, family, opacity };
}

/** Best split of the words into `n` lines (smallest widest line). */
function splitWords(words: string[], n: number, widthOf: (line: string) => number): string[] {
  if (n <= 1 || words.length <= 1) return [words.join(" ")];
  const lines = Math.min(n, words.length);
  let best: string[] = [words.join(" ")];
  let bestWidth = Infinity;
  const walk = (start: number, left: number, acc: string[]) => {
    if (left === 1) {
      const all = [...acc, words.slice(start).join(" ")];
      const w = Math.max(...all.map(widthOf));
      if (w < bestWidth) { bestWidth = w; best = all; }
      return;
    }
    for (let end = start + 1; end <= words.length - (left - 1); end += 1) {
      walk(end, left - 1, [...acc, words.slice(start, end).join(" ")]);
    }
  };
  walk(0, lines, []);
  return best;
}

export function layoutCirclePosterCaption(
  input: CirclePosterCaptionInput,
  measure: MeasureText,
): CirclePosterCaptionLayout {
  const g = input.geometry;
  const box = g.textBox ?? { x: g.captionXStart, y: g.captionY, w: g.captionWidth, h: g.posterHeight - g.captionY };
  const W = g.posterWidth;
  const H = g.posterHeight;
  const unit = Math.min(W, H);
  const align = g.captionAlign;
  const credits: PosterCredit[] = [];

  const creditSize = Math.max(8, unit * 0.0165);
  const creditY = H - g.safeInsetY;
  if (input.includeCredits) {
    credits.push({
      text: input.creditUrl,
      x: g.safeInsetX,
      y: creditY,
      size: creditSize,
      anchor: "start",
      family: input.creditFamily,
      opacity: 0.68,
    });
  }

  const runs: PosterTextRun[] = [];
  const rules: PosterRule[] = [];
  const city = (input.city || "").trim();
  const country = (input.country || "").trim();
  if (!input.showText || (!city && !country)) return { runs, rules, credits };

  const startX = (inkW: number) =>
    align === "left" ? box.x : align === "right" ? box.x + box.w - inkW : box.x + (box.w - inkW) / 2;

  const cityLatin = isLatinScript(city);
  const cityText = cityLatin ? city.toUpperCase() : city;
  const cityWeight = 600;
  const cityTracking = cityLatin ? 0.12 : 0;
  const maxCity = 0.125 * unit * input.headingScale;
  const maxW = box.w * 0.94;

  const lineWidth = (line: string) =>
    inkWidth(measureLine(line, input.headingFamily, cityWeight, cityTracking, measure));

  // Choose the fewest lines that keep the name large; always fit the width.
  const words = cityText.split(/\s+/).filter(Boolean);
  let cityLines = [cityText];
  let citySize = maxCity;
  if (cityText) {
    const fitFor = (lines: string[]) => Math.min(maxCity, maxW / Math.max(1e-6, Math.max(...lines.map(lineWidth))));
    citySize = fitFor(cityLines);
    for (let n = 2; n <= 3 && citySize < maxCity * 0.62 && words.length >= n; n += 1) {
      const candidate = splitWords(words, n, lineWidth);
      const size = fitFor(candidate);
      if (size > citySize * 1.2) {
        cityLines = candidate;
        citySize = size;
      }
    }
  }

  const build = (k: number) => {
    const out: PosterTextRun[] = [];
    const outRules: PosterRule[] = [];
    const cs = citySize * k;
    let y = 0;
    if (cityText) {
      const lineStep = cs * 1.12;
      cityLines.forEach((line, i) => {
        const m = measureLine(line, input.headingFamily, cityWeight, cityTracking, measure);
        const w = inkWidth(m) * cs;
        y = cs * CAP + i * lineStep;
        out.push(placeRun(m, cs, startX(w), y, cityWeight, input.headingFamily, 1));
      });
      if (country) {
        const widest = Math.max(...cityLines.map(lineWidth)) * cs;
        const ruleH = Math.max(2, unit * 0.004);
        const ruleY = y + cs * 0.2;
        outRules.push({ x: startX(widest), y: ruleY, w: widest, h: ruleH, opacity: 0.9 });
        y = ruleY + ruleH;
      }
    }
    const rest: Array<{ text: string; size0: number; weight: number; tracking: number; family: string; opacity: number; gap: number; upper: boolean }> = [];
    if (country) {
      rest.push({ text: country, size0: 0.036 * unit * input.midlineScale, weight: 400, tracking: 0.42, family: input.midlineFamily, opacity: 0.92, gap: 1.0, upper: true });
    }
    if (input.customDate?.trim()) {
      rest.push({ text: input.customDate.trim(), size0: 0.022 * unit * input.bottomScale, weight: 400, tracking: 0.05, family: input.bottomFamily, opacity: 0.72, gap: 1.25, upper: false });
    }
    if (input.coords) {
      rest.push({ text: input.coords, size0: 0.0215 * unit * input.bottomScale, weight: 400, tracking: 0.05, family: input.bottomFamily, opacity: 0.72, gap: 1.25, upper: false });
    }
    rest.forEach((item, i) => {
      const latin = isLatinScript(item.text);
      const text = item.upper && latin ? item.text.toUpperCase() : item.text;
      const m = measureLine(text, item.family, item.weight, latin ? item.tracking : 0, measure);
      const size = Math.min(item.size0 * k, (box.w * 0.94) / Math.max(1e-6, inkWidth(m)));
      const w = inkWidth(m) * size;
      const top = i === 0 && !cityText ? 0 : y + size * item.gap;
      y = top + size * CAP;
      out.push(placeRun(m, size, startX(w), y, item.weight, item.family, item.opacity));
    });
    return { out, outRules, height: y };
  };

  let k = 1;
  let built = build(k);
  if (built.height > box.h) {
    k = Math.max(0.2, box.h / built.height);
    built = build(k);
  }
  const offset = g.textTopAlign ? box.y : box.y + Math.max(0, (box.h - built.height) / 2);
  built.out.forEach((r) => runs.push({ ...r, baselineY: Number((r.baselineY + offset).toFixed(2)) }));
  built.outRules.forEach((r) => rules.push({ ...r, y: Number((r.y + offset).toFixed(2)) }));
  return { runs, rules, credits };
}

/** Canvas based measurer. Falls back to a rough estimate when no canvas exists. */
export function createCanvasMeasure(): MeasureText {
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  try {
    ctx = typeof document !== "undefined"
      ? document.createElement("canvas").getContext("2d")
      : null;
  } catch {
    ctx = null;
  }
  return (font, text) => {
    if (!ctx) return text.length * REF * 0.6;
    ctx.font = font;
    return ctx.measureText(text).width;
  };
}
