import { loadOutlineFont, type OutlineFont, type PathCommand } from "./woffFont";

/* ------------------------------------------------------------------ fonts */
/* The app already ships its typefaces through @fontsource CSS, so the export
   reuses exactly the files the browser loaded: one CSSFontFaceRule gives the
   family, the weight, the woff URL and — importantly — the unicode-range that
   says which characters live in that file. @fontsource ships the same family
   twice (a `latin` file and a `latin-ext` file), so the range is what keeps
   ASCII from landing on the extended subset, which has no ASCII glyphs. */

type Face = {
  family: string;
  weight: number;
  style: string;
  url: string;
  ranges: Array<[number, number]>;
};

let faces: Face[] | null = null;

function parseUnicodeRange(value: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  if (!value) return ranges;
  for (const part of value.split(",")) {
    const match = part.trim().match(/^u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?$/i);
    if (!match) continue;
    const head = match[1];
    if (head.includes("?")) {
      ranges.push([parseInt(head.replace(/\?/g, "0"), 16), parseInt(head.replace(/\?/g, "f"), 16)]);
    } else if (match[2]) {
      ranges.push([parseInt(head, 16), parseInt(match[2], 16)]);
    } else {
      const code = parseInt(head, 16);
      ranges.push([code, code]);
    }
  }
  return ranges;
}

function collectFaces(): Face[] {
  if (faces) return faces;
  const found: Face[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = (rule.style.getPropertyValue("font-family") || "").replace(/['"]/g, "").trim();
      if (!family) continue;
      const weight = Number(rule.style.getPropertyValue("font-weight")) || 400;
      const style = (rule.style.getPropertyValue("font-style") || "normal").trim();
      const src = rule.style.getPropertyValue("src");
      const urls: string[] = [];
      const pattern = /url\((['"]?)([^'")]+)\1\)/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(src))) urls.push(match[2]);
      // WOFF keeps the TrueType tables this reader needs (one zlib blob per
      // table) while woff2 uses a different, much heavier container.
      const woff = urls.find((url) => url.split("?")[0].endsWith(".woff"));
      if (!woff) continue;
      found.push({
        family,
        weight,
        style,
        url: new URL(woff, sheet.href || window.location.href).href,
        ranges: parseUnicodeRange(rule.style.getPropertyValue("unicode-range")),
      });
    }
  }
  faces = found;
  return found;
}

const fontJobs = new Map<string, Promise<OutlineFont[] | null>>();

/** Splits an SVG font-family stack into bare family names. */
export function parseFamilyStack(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.replace(/['"]/g, "").trim())
    .filter(Boolean);
}

function facesForStack(stack: string[]): { family: string; faces: Face[] } | null {
  const all = collectFaces();
  for (const rawFamily of stack) {
    const family = rawFamily.toLowerCase();
    const matches = all.filter((face) => face.family.toLowerCase() === family);
    if (matches.length) return { family, faces: matches };
  }
  return null;
}

const coverage = (face: Face, codes: number[]): number => {
  if (!face.ranges.length) return codes.length;
  let covered = 0;
  for (const code of codes) {
    if (face.ranges.some(([start, end]) => code >= start && code <= end)) covered += 1;
  }
  return covered;
};

export type FontLookup = { fonts: OutlineFont[]; substituted: boolean };

/**
 * Loads the outlines for a family stack, ordered by how well each face covers
 * the characters actually being drawn. The first match is the primary face;
 * anything left over is a fallback for characters outside its subset.
 */
export function resolveFont(fontFamily: string, fontWeight: number, sample = ""): Promise<FontLookup | null> {
  const stack = parseFamilyStack(fontFamily);
  const key = `${stack.join("|")}@${fontWeight}#${sample}`;
  const cached = fontJobs.get(key);
  if (cached) return cached.then((list) => (list && list.length ? { fonts: list, substituted: false } : null));

  const job = (async (): Promise<OutlineFont[] | null> => {
    const match = facesForStack(stack);
    const pool = (match?.faces ?? collectFaces()).filter((face) => face.style === "normal");
    const candidates = pool.length ? pool : match?.faces ?? collectFaces();
    if (!candidates.length) return null;

    const codes = Array.from(new Set(Array.from(sample))).map((char) => char.codePointAt(0) ?? 0);
    const ranked = candidates
      .map((face) => ({
        face,
        score: coverage(face, codes),
        distance: Math.abs(face.weight - fontWeight),
        // With equal coverage the base `latin` subset is the safe default.
        primary: face.url.includes("-latin-ext") || face.url.includes("-cyrillic") || face.url.includes("-vietnamese") ? 0 : 1,
      }))
      .sort((a, b) => b.score - a.score || a.distance - b.distance || b.primary - a.primary);

    // Prefer faces that actually own these characters, but keep a couple of
    // fallbacks so mixed-script strings still draw.
    const usable = ranked.filter((item) => item.score > 0).slice(0, 3);
    const picked = usable.length ? usable : ranked.slice(0, 1);

    const loaded: OutlineFont[] = [];
    for (const item of picked) {
      try {
        loaded.push(await loadOutlineFont(item.face.url));
      } catch (error) {
        console.warn("[pdf] could not read font outline", item.face.url, error);
      }
    }
    return loaded.length ? loaded : null;
  })();

  fontJobs.set(key, job);
  return job.then((list) => (list ? { fonts: list, substituted: !facesForStack(stack) } : null));
}

/* ------------------------------------------------------------------- text */

const CUBIC = 2 / 3;

export type TextOptions = {
  fontSize: number;
  /** Already resolved to page units. */
  letterSpacing: number;
  anchor: "start" | "middle" | "end";
  /** Baseline shift applied for dominant-baseline. */
  baselineShift: number;
  /** Per-character x positions, when the source supplies them. */
  xPositions?: number[];
};

export type TextPlacement = { commands: PathCommand[]; width: number };

/** First font in the chain that actually has this character. */
function glyphFor(fonts: OutlineFont[], char: string): { font: OutlineFont; glyphId: number } {
  const code = char.codePointAt(0) ?? 0;
  for (const font of fonts) {
    const id = font.glyphIdFor(char);
    if (id !== 0) return { font, glyphId: id };
  }
  void code;
  return { font: fonts[0], glyphId: 0 };
}

/**
 * Lays a run out as cubic outlines in page units with y pointing down, which
 * is the frame the page content stream is flipped into.
 */
export function layoutText(
  fonts: OutlineFont[],
  text: string,
  x: number,
  y: number,
  options: TextOptions,
): TextPlacement {
  const chars = Array.from(text);
  const scaleOf = (font: OutlineFont) => options.fontSize / font.em;

  const glyphs = chars.map((char) => glyphFor(fonts, char));
  const advances = glyphs.map((item) => item.font.advanceOf(item.glyphId) * scaleOf(item.font));
  const total =
    advances.reduce((sum, advance) => sum + advance, 0) +
    options.letterSpacing * Math.max(0, chars.length - 1);

  let pen = options.anchor === "middle" ? x - total / 2 : options.anchor === "end" ? x - total : x;
  const baseline = y + options.baselineShift;
  const commands: PathCommand[] = [];

  glyphs.forEach((item, index) => {
    const start = options.xPositions?.[index] ?? pen;
    const scale = scaleOf(item.font);
    const outline = item.font.outline(item.glyphId);
    const tx = (value: number) => start + value * scale;
    const ty = (value: number) => baseline - value * scale;

    for (const command of outline.commands) {
      if (command.type === "Z") {
        commands.push(command);
      } else if (command.type === "Q") {
        commands.push({
          type: "C",
          x1: tx(command.cx),
          y1: ty(command.cy),
          x2: tx(command.x),
          y2: ty(command.y),
          x: tx(command.x),
          y: ty(command.y),
        });
      } else if (command.type === "M" || command.type === "L") {
        commands.push({ type: command.type, x: tx(command.x), y: ty(command.y) });
      } else if (command.type === "C") {
        commands.push({
          type: "C",
          x1: tx(command.x1),
          y1: ty(command.y1),
          x2: tx(command.x2),
          y2: ty(command.y2),
          x: tx(command.x),
          y: ty(command.y),
        });
      }
    }

    pen = start + advances[index] + options.letterSpacing;
  });

  return { commands, width: total };
}

/**
 * SVG `dominant-baseline` as a baseline shift in page units (y down). The
 * poster caption centres its band with `central`.
 */
export function baselineShiftFor(value: string, font: OutlineFont, fontSize: number): number {
  const unit = fontSize / font.em;
  switch (value) {
    case "central":
    case "middle":
      return ((font.ascender + font.descender) / 2) * unit;
    case "hanging":
    case "text-before-edge":
      return font.ascender * unit;
    case "text-after-edge":
    case "ideographic":
      return font.descender * unit;
    default:
      return 0;
  }
}

/** Quadratic outlines become cubic segments, which is what PDF stores. */
export function quadToCubic(
  from: { x: number; y: number },
  control: { x: number; y: number },
  to: { x: number; y: number },
) {
  return {
    x1: from.x + CUBIC * (control.x - from.x),
    y1: from.y + CUBIC * (control.y - from.y),
    x2: to.x + CUBIC * (control.x - to.x),
    y2: to.y + CUBIC * (control.y - to.y),
    x: to.x,
    y: to.y,
  };
}
