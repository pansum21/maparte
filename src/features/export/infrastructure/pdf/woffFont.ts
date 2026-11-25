/**
 * A very small WOFF/TrueType reader.
 *
 * The PDF exporter needs real glyph outlines so text can be written as vector
 * paths instead of naming a font the printer may not own. Fonts ship with the
 * app as .woff (the same files @fontsource already emits), and a WOFF file is
 * just an sfnt whose tables may be zlib-compressed — so this reads the tables
 * we need (head, maxp, hhea, hmtx, loca, glyf, cmap) straight out of the
 * decompressed buffers, with no third-party parser.
 *
 * Coordinates are returned in font units, y-up, exactly as stored in `glyf`.
 */

export type PathCommand =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | { type: "Q"; cx: number; cy: number; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Z" };

export type GlyphOutline = {
  /** Outlines in font units, y-up, origin on the baseline. */
  commands: PathCommand[];
  /** Horizontal advance in font units. */
  advance: number;
  /** True when the character had no glyph in this font. */
  missing: boolean;
};

const TAG = (view: DataView, offset: number) =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

type Table = { offset: number; length: number };

/** Reads the WOFF header and returns each table's uncompressed slice. */
async function readTables(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = TAG(view, 0);
  if (signature !== "wOFF") {
    throw new Error(`Unsupported font container: ${signature}`);
  }

  const numTables = view.getUint16(12);
  const tables = new Map<string, Uint8Array>();

  for (let i = 0; i < numTables; i += 1) {
    const entry = 44 + i * 20;
    const tag = TAG(view, entry);
    const offset = view.getUint32(entry + 4);
    const compLength = view.getUint32(entry + 8);
    const origLength = view.getUint32(entry + 12);
    const slice = bytes.subarray(offset, offset + compLength);
    tables.set(tag, compLength < origLength ? await inflate(slice) : slice);
  }

  return tables;
}

const num = (data: Uint8Array, offset: number, size: number): number => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (size === 1) return view.getUint8(offset);
  if (size === 2) return view.getInt16(offset);
  if (size === 4) return view.getInt32(offset);
  return view.getUint16(offset);
};

const u16 = (data: Uint8Array, offset: number) =>
  new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(offset);

const i16 = (data: Uint8Array, offset: number) =>
  new DataView(data.buffer, data.byteOffset, data.byteLength).getInt16(offset);

const u32 = (data: Uint8Array, offset: number) =>
  new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset);

/** cmap: returns a code point → glyph id lookup for the BMP and beyond. */
function buildCharMap(cmap: Uint8Array): (code: number) => number {
  const count = u16(cmap, 2);
  let best: { offset: number; format: number } | null = null;

  for (let i = 0; i < count; i += 1) {
    const record = 4 + i * 8;
    const platform = u16(cmap, record);
    const encoding = u16(cmap, record + 2);
    const offset = u32(cmap, record + 4);
    const format = u16(cmap, offset);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    // Prefer a full-repertoire format 12 table over the BMP format 4 one.
    if (format === 12 || (format === 4 && !best)) best = { offset, format };
  }

  if (!best) return () => 0;

  if (best.format === 12) {
    const { offset } = best;
    const groups = u32(cmap, offset + 12);
    return (code: number) => {
      for (let i = 0; i < groups; i += 1) {
        const group = offset + 16 + i * 12;
        const start = u32(cmap, group);
        const end = u32(cmap, group + 4);
        if (code >= start && code <= end) return u32(cmap, group + 8) + (code - start);
      }
      return 0;
    };
  }

  const { offset } = best;
  const segCountX2 = u16(cmap, offset + 6);
  const segCount = segCountX2 / 2;
  const endCodes = offset + 14;
  const startCodes = endCodes + segCountX2 + 2;
  const idDeltas = startCodes + segCountX2;
  const idRangeOffsets = idDeltas + segCountX2;

  return (code: number) => {
    for (let i = 0; i < segCount; i += 1) {
      const end = u16(cmap, endCodes + i * 2);
      if (code > end) continue;
      const start = u16(cmap, startCodes + i * 2);
      if (code < start) return 0;
      const delta = i16(cmap, idDeltas + i * 2);
      const rangeOffset = u16(cmap, idRangeOffsets + i * 2);
      if (rangeOffset === 0) return (code + delta) & 0xffff;
      const glyphOffset = idRangeOffsets + i * 2 + rangeOffset + (code - start) * 2;
      const glyph = u16(cmap, glyphOffset);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

type CompositeTransform = { a: number; b: number; c: number; d: number; dx: number; dy: number };

export class OutlineFont {
  private readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  private readonly glyphCount: number;
  private readonly loca: Uint8Array;
  private readonly glyf: Uint8Array;
  private readonly hmtx: Uint8Array;
  private readonly hMetrics: number;
  private readonly longLoca: boolean;
  private readonly charToGlyph: (code: number) => number;
  private readonly cache = new Map<number, GlyphOutline>();

  private constructor(tables: Map<string, Uint8Array>) {
    const head = tables.get("head");
    const maxp = tables.get("maxp");
    const hhea = tables.get("hhea");
    const loca = tables.get("loca");
    const glyf = tables.get("glyf");
    const hmtx = tables.get("hmtx");
    const cmap = tables.get("cmap");
    if (!head || !maxp || !hhea || !loca || !glyf || !hmtx || !cmap) {
      throw new Error("Font is missing a required TrueType table");
    }

    this.unitsPerEm = u16(head, 18) || 1000;
    this.ascender = i16(hhea, 4);
    this.descender = i16(hhea, 6);
    this.hMetrics = u16(hhea, 34) || 1;
    this.glyphCount = u16(maxp, 4);
    this.longLoca = i16(head, 50) === 1;
    this.loca = loca;
    this.glyf = glyf;
    this.hmtx = hmtx;
    this.charToGlyph = buildCharMap(cmap);
  }

  static async fromUrl(url: string): Promise<OutlineFont> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Font request failed: ${response.status} ${url}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return new OutlineFont(await readTables(bytes));
  }

  static async fromBytes(bytes: Uint8Array): Promise<OutlineFont> {
    return new OutlineFont(await readTables(bytes));
  }

  get em(): number {
    return this.unitsPerEm;
  }

  /** Width of a single character, in font units. */
  advanceOf(glyphId: number): number {
    const index = Math.min(glyphId, this.hMetrics - 1);
    return u16(this.hmtx, index * 4);
  }

  glyphIdFor(char: string): number {
    return this.charToGlyph(char.codePointAt(0) ?? 0);
  }

  /** Outline for one glyph id, cached because posters repeat glyphs a lot. */
  outline(glyphId: number): GlyphOutline {
    const cached = this.cache.get(glyphId);
    if (cached) return cached;
    const outline = this.buildOutline(glyphId, 0);
    const result = { ...outline, advance: this.advanceOf(glyphId) };
    this.cache.set(glyphId, result);
    return result;
  }

  private glyphRange(glyphId: number): [number, number] {
    if (glyphId >= this.glyphCount) return [0, 0];
    if (this.longLoca) {
      return [u32(this.loca, glyphId * 4), u32(this.loca, (glyphId + 1) * 4)];
    }
    return [u16(this.loca, glyphId * 2) * 2, u16(this.loca, (glyphId + 1) * 2) * 2];
  }

  private buildOutline(glyphId: number, depth: number): GlyphOutline {
    const [start, end] = this.glyphRange(glyphId);
    if (end <= start || depth > 4) return { commands: [], advance: 0, missing: false };

    const glyph = this.glyf.subarray(start, end);
    const contours = i16(glyph, 0);

    if (contours < 0) {
      return this.buildComposite(glyph, depth);
    }

    const commands: PathCommand[] = [];
    const endPoints: number[] = [];
    for (let i = 0; i < contours; i += 1) endPoints.push(u16(glyph, 10 + i * 2));

    let cursor = 10 + contours * 2;
    const instructionLength = u16(glyph, cursor);
    cursor += 2 + instructionLength;

    const pointCount = contours === 0 ? 0 : endPoints[endPoints.length - 1] + 1;
    const flags: number[] = [];
    while (flags.length < pointCount) {
      const flag = num(glyph, cursor, 1);
      cursor += 1;
      flags.push(flag);
      if (flag & 0x08) {
        let repeat = num(glyph, cursor, 1);
        cursor += 1;
        while (repeat > 0 && flags.length < pointCount) {
          flags.push(flag);
          repeat -= 1;
        }
      }
    }

    const xs: number[] = [];
    let x = 0;
    for (const flag of flags) {
      if (flag & 0x02) {
        const delta = num(glyph, cursor, 1);
        cursor += 1;
        x += flag & 0x10 ? delta : -delta;
      } else if (!(flag & 0x10)) {
        x += i16(glyph, cursor);
        cursor += 2;
      }
      xs.push(x);
    }

    const ys: number[] = [];
    let y = 0;
    for (const flag of flags) {
      if (flag & 0x04) {
        const delta = num(glyph, cursor, 1);
        cursor += 1;
        y += flag & 0x20 ? delta : -delta;
      } else if (!(flag & 0x20)) {
        y += i16(glyph, cursor);
        cursor += 2;
      }
      ys.push(y);
    }

    let first = 0;
    for (const last of endPoints) {
      this.appendContour(commands, flags, xs, ys, first, last);
      first = last + 1;
    }

    return { commands, advance: 0, missing: false };
  }

  /** One TrueType contour, converting quadratic control points to curves. */
  private appendContour(
    commands: PathCommand[],
    flags: number[],
    xs: number[],
    ys: number[],
    first: number,
    last: number,
  ) {
    if (last < first) return;
    const onCurve = (i: number) => (flags[i] & 0x01) !== 0;
    const point = (i: number) => ({ x: xs[i], y: ys[i] });

    const count = last - first + 1;
    let startIndex = first;
    // A contour may start on a control point; the true start is the implied
    // midpoint between the last and first points.
    let startPoint: { x: number; y: number };
    let index = first;

    if (onCurve(first)) {
      startPoint = point(first);
      index = first + 1;
    } else if (onCurve(last)) {
      startPoint = point(last);
      startIndex = first;
    } else {
      startPoint = {
        x: (xs[first] + xs[last]) / 2,
        y: (ys[first] + ys[last]) / 2,
      };
    }

    commands.push({ type: "M", x: startPoint.x, y: startPoint.y });

    let control: { x: number; y: number } | null = null;
    for (let step = 0; step < count; step += 1) {
      const i = first + ((index - first + step) % count);
      const current = point(i);
      if (onCurve(i)) {
        if (control) {
          commands.push({
            type: "Q",
            cx: control.x,
            cy: control.y,
            x: current.x,
            y: current.y,
          });
          control = null;
        } else {
          commands.push({ type: "L", x: current.x, y: current.y });
        }
      } else if (control) {
        const mid = { x: (control.x + current.x) / 2, y: (control.y + current.y) / 2 };
        commands.push({ type: "Q", cx: control.x, cy: control.y, x: mid.x, y: mid.y });
        control = current;
      } else {
        control = current;
      }
    }

    if (control) {
      commands.push({ type: "Q", cx: control.x, cy: control.y, x: startPoint.x, y: startPoint.y });
    } else {
      commands.push({ type: "Z" });
    }
    void startIndex;
  }

  private buildComposite(glyph: Uint8Array, depth: number): GlyphOutline {
    const commands: PathCommand[] = [];
    let cursor = 10;

    for (;;) {
      const flags = u16(glyph, cursor);
      const glyphIndex = u16(glyph, cursor + 2);
      cursor += 4;

      let dx = 0;
      let dy = 0;
      if (flags & 0x0001) {
        dx = i16(glyph, cursor);
        dy = i16(glyph, cursor + 2);
        cursor += 4;
      } else {
        dx = num(glyph, cursor, 1);
        dy = num(glyph, cursor + 1, 1);
        cursor += 2;
      }

      const transform: CompositeTransform = { a: 1, b: 0, c: 0, d: 1, dx, dy };
      if (flags & 0x0008) {
        const scale = i16(glyph, cursor) / 16384;
        cursor += 2;
        transform.a = scale;
        transform.d = scale;
      } else if (flags & 0x0040) {
        transform.a = i16(glyph, cursor) / 16384;
        transform.d = i16(glyph, cursor + 2) / 16384;
        cursor += 4;
      } else if (flags & 0x0080) {
        transform.a = i16(glyph, cursor) / 16384;
        transform.b = i16(glyph, cursor + 2) / 16384;
        transform.c = i16(glyph, cursor + 4) / 16384;
        transform.d = i16(glyph, cursor + 6) / 16384;
        cursor += 8;
      }

      if (flags & 0x0002) {
        const child = this.buildOutline(glyphIndex, depth + 1);
        for (const command of child.commands) {
          if (command.type === "Z") {
            commands.push(command);
            continue;
          }
          const px = "x" in command ? command.x : 0;
          const py = "y" in command ? command.y : 0;
          const map = (x: number, y: number) => ({
            x: transform.a * x + transform.c * y + transform.dx,
            y: transform.b * x + transform.d * y + transform.dy,
          });
          if (command.type === "Q") {
            const control = map(command.cx, command.cy);
            const end = map(px, py);
            commands.push({ type: "Q", cx: control.x, cy: control.y, x: end.x, y: end.y });
          } else if (command.type === "C") {
            const first = map(command.x1, command.y1);
            const second = map(command.x2, command.y2);
            const end = map(command.x, command.y);
            commands.push({ type: "C", x1: first.x, y1: first.y, x2: second.x, y2: second.y, x: end.x, y: end.y });
          } else if (command.type === "M" || command.type === "L") {
            const p = map(px, py);
            commands.push({ type: command.type, x: p.x, y: p.y });
          }
        }
      }

      if (!(flags & 0x0020)) break;
    }

    return { commands, advance: 0, missing: false };
  }
}

/** Loads a font once per URL for the lifetime of the export. */
const fontCache = new Map<string, Promise<OutlineFont>>();

export function loadOutlineFont(url: string): Promise<OutlineFont> {
  const cached = fontCache.get(url);
  if (cached) return cached;
  const loading = OutlineFont.fromUrl(url);
  fontCache.set(url, loading);
  return loading;
}
