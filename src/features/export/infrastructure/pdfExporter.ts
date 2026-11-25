import type { ExportOptions } from "../domain/types";
import { cmToPt, fmt } from "./pdf/pdfWriter";
import { svgToPdfBlob } from "./pdf/svgPdf";

/**
 * Poster PDFs.
 *
 * The vector path is the real one: `layeredSvgExporter` already draws the whole
 * poster as one self-contained SVG, and `svgToPdfBlob` writes that geometry
 * straight into a PDF content stream — paths, clip rules, dashes, gradients and
 * glyph outlines. Nothing is screenshotted, no text is left to the printer's
 * fonts, and the page carries MediaBox/BleedBox for the full sheet plus
 * TrimBox/ArtBox for the finished size.
 *
 * `createPdfBlobFromCanvas` stays as the fallback for layouts that only exist
 * as a raster canvas (the double-poster path). It embeds the pixels without
 * re-compressing them, but sets the same print boxes so a shop still knows
 * where to cut.
 */

/** Bleed added on every side of the finished size, in millimetres. */
export const PDF_BLEED_MM = 3;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function normalizePositiveNumber(value: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatPdfNumber(value: number): string {
  const rounded = Number(value.toFixed(3));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export type PdfPageGeometry = {
  /** Sheet size in points, bleed included. */
  mediaWidth: number;
  mediaHeight: number;
  /** Finished corner rectangle in points: [x0, y0, x1, y1]. */
  trim: [number, number, number, number];
  /** Bleed margin in points. */
  bleed: number;
};

/**
 * MediaBox is the trim plus bleed; the trim rectangle sits one bleed inside it.
 * A print shop reads BleedBox for the sheet edge and TrimBox for the cut.
 */
export function resolvePdfPageGeometry(
  widthCm: number,
  heightCm: number,
  bleedMm: number = PDF_BLEED_MM,
): PdfPageGeometry {
  const trimWidth = cmToPt(widthCm);
  const trimHeight = cmToPt(heightCm);
  const bleed = cmToPt(Math.max(0, bleedMm) / 10);
  return {
    mediaWidth: trimWidth + bleed * 2,
    mediaHeight: trimHeight + bleed * 2,
    trim: [bleed, bleed, bleed + trimWidth, bleed + trimHeight],
    bleed,
  };
}

/** The real export: one SVG in, one print-ready vector PDF out. */
export async function createPdfBlobFromSvg(
  svg: string,
  options: Partial<ExportOptions> = {},
): Promise<Blob> {
  const widthCm = normalizePositiveNumber(options.widthCm ?? 20, 20);
  const heightCm = normalizePositiveNumber(options.heightCm ?? 30, 30);
  const { blob } = await svgToPdfBlob(svg, {
    widthCm,
    heightCm,
    bleedMm: PDF_BLEED_MM,
  });
  return blob;
}

/** Fallback for canvas-only layouts: the pixels, but with proper print boxes. */
export function createPdfBlobFromCanvas(
  canvas: HTMLCanvasElement,
  options: Partial<ExportOptions> = {},
): Blob {
  const imageWidth = Math.max(1, Math.round(Number(canvas?.width) || 1));
  const imageHeight = Math.max(1, Math.round(Number(canvas?.height) || 1));
  const widthCm = normalizePositiveNumber(options.widthCm ?? 20, 20);
  const heightCm = normalizePositiveNumber(options.heightCm ?? 30, 30);
  const page = resolvePdfPageGeometry(widthCm, heightCm);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 1.0);
  const base64 = jpegDataUrl.split(",")[1] || "";
  const imageBytes = base64ToBytes(base64);

  // The artwork is drawn across the whole media box, so it bleeds past the
  // trim line instead of leaving a white edge under the cutter.
  const contentStream = [
    "q",
    `${formatPdfNumber(page.mediaWidth)} 0 0 ${formatPdfNumber(page.mediaHeight)} 0 0 cm`,
    "/Im0 Do",
    "Q",
  ].join("\n");

  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(contentStream);
  const chunks: Uint8Array[] = [];
  const objectOffsets: number[] = [0];
  let byteLength = 0;

  function append(part: string | Uint8Array): void {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    byteLength += bytes.length;
  }

  function writeObject(
    objectId: number,
    dictionary: string,
    streamBytes: Uint8Array | null = null,
  ): void {
    objectOffsets[objectId] = byteLength;
    append(`${objectId} 0 obj\n`);
    if (streamBytes) {
      append(`${dictionary}\nstream\n`);
      append(streamBytes);
      append("\nendstream\nendobj\n");
      return;
    }
    append(`${dictionary}\nendobj\n`);
  }

  const [trimX0, trimY0, trimX1, trimY1] = page.trim;

  append("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");

  writeObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  writeObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  writeObject(
    3,
    `<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${formatPdfNumber(page.mediaWidth)} ${formatPdfNumber(page.mediaHeight)}] ` +
      `/BleedBox [0 0 ${formatPdfNumber(page.mediaWidth)} ${formatPdfNumber(page.mediaHeight)}] ` +
      `/TrimBox [${formatPdfNumber(trimX0)} ${formatPdfNumber(trimY0)} ${formatPdfNumber(trimX1)} ${formatPdfNumber(trimY1)}] ` +
      `/ArtBox [${formatPdfNumber(trimX0)} ${formatPdfNumber(trimY0)} ${formatPdfNumber(trimX1)} ${formatPdfNumber(trimY1)}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  writeObject(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>`,
    imageBytes,
  );
  writeObject(5, `<< /Length ${contentBytes.length} >>`, contentBytes);

  const xrefStart = byteLength;
  append("xref\n0 6\n");
  append("0000000000 65535 f \n");
  for (let objectId = 1; objectId <= 5; objectId += 1) {
    append(`${String(objectOffsets[objectId]).padStart(10, "0")} 00000 n \n`);
  }
  append("trailer\n<< /Size 6 /Root 1 0 R >>\n");
  append(`startxref\n${xrefStart}\n%%EOF`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

/** Kept for callers that only need the point values. */
export const pdfPoints = { cmToPt, fmt };
