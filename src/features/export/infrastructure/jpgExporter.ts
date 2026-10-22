import type { PixelDensity } from "./pngExporter";

function normalizeDensity(dpi: number | PixelDensity): PixelDensity {
  const x = typeof dpi === "number" ? dpi : dpi.x;
  const y = typeof dpi === "number" ? dpi : dpi.y;
  return {
    x: Number.isFinite(x) && x > 0 ? x : 300,
    y: Number.isFinite(y) && y > 0 ? y : 300,
  };
}

/** Writes the actual pixel density into a JPEG's JFIF header. */
export function injectJpegDensity(bytes: Uint8Array, density: number | PixelDensity): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const { x, y } = normalizeDensity(density);
  const xDpi = Math.max(1, Math.min(65535, Math.round(x)));
  const yDpi = Math.max(1, Math.min(65535, Math.round(y)));
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const end = offset + 2 + segmentLength;
    if (segmentLength < 2 || end > bytes.length) return bytes;
    const isJfif = marker === 0xe0 &&
      bytes[offset + 4] === 0x4a && bytes[offset + 5] === 0x46 &&
      bytes[offset + 6] === 0x49 && bytes[offset + 7] === 0x46 &&
      bytes[offset + 8] === 0;
    if (isJfif) {
      const copy = bytes.slice();
      copy[offset + 11] = 1; // pixels per inch
      copy[offset + 12] = (xDpi >>> 8) & 0xff;
      copy[offset + 13] = xDpi & 0xff;
      copy[offset + 14] = (yDpi >>> 8) & 0xff;
      copy[offset + 15] = yDpi & 0xff;
      return copy;
    }
    offset = end;
  }

  // Add a JFIF APP0 segment immediately after SOI when the encoder omitted one.
  const jfif = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01, 0x01, (xDpi >>> 8) & 0xff, xDpi & 0xff,
    (yDpi >>> 8) & 0xff, yDpi & 0xff, 0x00, 0x00,
  ]);
  const result = new Uint8Array(bytes.length + jfif.length);
  result.set(bytes.slice(0, 2), 0);
  result.set(jfif, 2);
  result.set(bytes.slice(2), 2 + jfif.length);
  return result;
}

/**
 * Exports an HTMLCanvasElement as a high-quality JPEG Blob.
 */
export async function createJpgBlob(
  canvas: HTMLCanvasElement,
  quality: number = 0.95,
  density: number | PixelDensity = 500,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          void blob.arrayBuffer().then(
            (buffer) => {
              const jpeg = injectJpegDensity(new Uint8Array(buffer), density);
              const safeBytes = new Uint8Array(jpeg.length);
              safeBytes.set(jpeg);
              resolve(new Blob([safeBytes.buffer], { type: "image/jpeg" }));
            },
            reject,
          );
        } else {
          reject(new Error("Failed to create JPG blob from canvas."));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}
