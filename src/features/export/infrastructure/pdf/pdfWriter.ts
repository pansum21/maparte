/**
 * Minimal PDF writer for the poster export.
 *
 * The page holds vector content only: glyph outlines, map paths, rules and
 * shapes. Where the source is genuinely raster (a marker icon, the WebGL
 * fallback layer) the pixels are stored lossless (Flate), never as JPEG, so
 * hairlines and small type stay clean in print.
 */

const encoder = new TextEncoder();

async function deflate(bytes: Uint8Array): Promise<{ data: Uint8Array; filtered: boolean }> {
  if (typeof CompressionStream === "undefined") return { data: bytes, filtered: false };
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  const buffer = await new Response(stream).arrayBuffer();
  return { data: new Uint8Array(buffer), filtered: true };
}

/** A DeviceRGB image plus a DeviceGray soft mask when it has transparency. */
export class PdfImage {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly rgb: Uint8Array,
    readonly alpha: Uint8Array | null,
  ) {}
}

export const fmt = (value: number): string => String(Math.round(value * 1000) / 1000);

/** Centimetres to PDF points (1 pt = 1/72 inch). */
export const cmToPt = (cm: number): number => (cm / 2.54) * 72;

function escapePdfText(value: string): string {
  return value.replace(/([\\()])/g, "\\$1").replace(/[\r\n]+/g, " ");
}

export class PdfWriter {
  private readonly chunks: Uint8Array[] = [];
  private readonly offsets: number[] = [];
  private length = 0;
  private images: Array<{ name: string; id: number }> = [];
  private states: Array<{ name: string; ca: number; CA: number }> = [];

  constructor() {
    // The header must be the first bytes of the file, and offsets are absolute,
    // so it is emitted before anything else.
    this.push(encoder.encode("%PDF-1.7\n%\u00E2\u00E3\u00CF\u00D3\n"));
  }

  private push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  private pushText(text: string) {
    this.push(encoder.encode(text));
  }

  /**
   * Claims an object number without writing it. Bodies can then be emitted in
   * any order, which lets a page reference its content stream and parent
   * before either has been serialised.
   */
  reserve(): number {
    this.offsets.push(0);
    return this.offsets.length;
  }

  object(id: number, body: string): number {
    this.offsets[id - 1] = this.length;
    this.pushText(`${id} 0 obj\n${body}\nendobj\n`);
    return id;
  }

  async stream(id: number, dict: string, payload: Uint8Array): Promise<number> {
    const { data, filtered } = await deflate(payload);
    this.offsets[id - 1] = this.length;
    this.pushText(`${id} 0 obj\n<< ${dict}${filtered ? " /Filter /FlateDecode" : ""} /Length ${data.length} >>\nstream\n`);
    this.push(data);
    this.pushText("\nendstream\nendobj\n");
    return id;
  }

  /** Registers one alpha pair and returns its /ExtGState resource name. */
  alphaState(fillAlpha: number, strokeAlpha: number): string {
    const ca = Math.min(1, Math.max(0, Math.round(fillAlpha * 1000) / 1000));
    const CA = Math.min(1, Math.max(0, Math.round(strokeAlpha * 1000) / 1000));
    const existing = this.states.find((state) => state.ca === ca && state.CA === CA);
    if (existing) return existing.name;
    const name = `GS${this.states.length + 1}`;
    this.states.push({ name, ca, CA });
    return name;
  }

  async addImage(image: PdfImage): Promise<string> {
    const name = `Im${this.images.length + 1}`;
    let smask = 0;
    if (image.alpha) {
      smask = await this.stream(
        this.reserve(),
        `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8`,
        image.alpha,
      );
    }
    const ref = await this.stream(
      this.reserve(),
      `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Interpolate true${smask ? ` /SMask ${smask} 0 R` : ""}`,
      image.rgb,
    );
    this.images.push({ name, id: ref });
    return name;
  }

  /** Builds the file: catalog, page tree, and the print boxes. */
  async build(parts: {
    /** Full media size, bleed included, in points. */
    mediaWidth: number;
    mediaHeight: number;
    /** Trim rectangle in points: [x0, y0, x1, y1]. */
    trim: [number, number, number, number];
    content: string;
    title?: string;
  }): Promise<Blob> {
    const catalogId = this.reserve();
    const pagesId = this.reserve();
    const pageId = this.reserve();
    const contentId = this.reserve();
    const infoId = this.reserve();

    const extGState = this.states.length
      ? `/ExtGState << ${this.states
          .map((state) => `/${state.name} << /Type /ExtGState /ca ${state.ca} /CA ${state.CA} >>`)
          .join(" ")} >>`
      : "";
    const xObjects = this.images.length
      ? `/XObject << ${this.images.map((image) => `/${image.name} ${image.id} 0 R`).join(" ")} >>`
      : "";

    await this.stream(contentId, "", encoder.encode(parts.content));

    const [x0, y0, x1, y1] = parts.trim;
    this.object(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R ` +
        `/MediaBox [0 0 ${fmt(parts.mediaWidth)} ${fmt(parts.mediaHeight)}] ` +
        // The artwork runs to the sheet edge, so bleed covers the media box…
        `/BleedBox [0 0 ${fmt(parts.mediaWidth)} ${fmt(parts.mediaHeight)}] ` +
        // …while trim is the finished size the printer cuts to.
        `/TrimBox [${fmt(x0)} ${fmt(y0)} ${fmt(x1)} ${fmt(y1)}] ` +
        `/ArtBox [${fmt(x0)} ${fmt(y0)} ${fmt(x1)} ${fmt(y1)}] ` +
        `/Resources << ${[extGState, xObjects].filter(Boolean).join(" ")} >> ` +
        `/Contents ${contentId} 0 R >>`,
    );
    this.object(pagesId, `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
    this.object(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    this.object(
      infoId,
      `<< /Title (${escapePdfText(parts.title ?? "MapArte poster")}) /Creator (MapArte) ` +
        `/Producer (MapArte vector poster export) /CreationDate (D:${stamp}) >>`,
    );

    const xrefStart = this.length;
    this.pushText(`xref\n0 ${this.offsets.length + 1}\n0000000000 65535 f \n`);
    for (const offset of this.offsets) {
      this.pushText(`${String(offset).padStart(10, "0")} 00000 n \n`);
    }
    this.pushText(
      `trailer\n<< /Size ${this.offsets.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
        `startxref\n${xrefStart}\n%%EOF\n`,
    );

    const file = new Uint8Array(this.length);
    let cursor = 0;
    for (const chunk of this.chunks) {
      file.set(chunk, cursor);
      cursor += chunk.length;
    }
    return new Blob([file as unknown as BlobPart], { type: "application/pdf" });
  }
}

/** Packs straight RGBA bytes into the RGB + alpha planes a PDF image needs. */
export function splitRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): PdfImage {
  const pixels = width * height;
  const rgb = new Uint8Array(pixels * 3);
  const alpha = new Uint8Array(pixels);
  let transparent = false;
  for (let i = 0; i < pixels; i += 1) {
    const source = i * 4;
    rgb[i * 3] = rgba[source];
    rgb[i * 3 + 1] = rgba[source + 1];
    rgb[i * 3 + 2] = rgba[source + 2];
    const a = rgba[source + 3];
    alpha[i] = a;
    if (a !== 255) transparent = true;
  }
  return new PdfImage(width, height, rgb, transparent ? alpha : null);
}
