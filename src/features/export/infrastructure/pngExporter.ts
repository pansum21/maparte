function writeUint32BE(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const index = (crc ^ bytes[i]) & 0xff;
    crc = (CRC_TABLE[index] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface PixelDensity {
  x: number;
  y: number;
}

function normalizeDensity(dpi: number | PixelDensity): PixelDensity {
  const x = typeof dpi === "number" ? dpi : dpi.x;
  const y = typeof dpi === "number" ? dpi : dpi.y;
  return {
    x: Number.isFinite(x) && x > 0 ? x : 300,
    y: Number.isFinite(y) && y > 0 ? y : 300,
  };
}

function buildPhysChunk(dpi: PixelDensity): Uint8Array {
  const xPpm = Math.max(1, Math.round(dpi.x / 0.0254));
  const yPpm = Math.max(1, Math.round(dpi.y / 0.0254));
  const length = 9;
  const chunk = new Uint8Array(4 + 4 + length + 4);
  const type = new TextEncoder().encode("pHYs");
  const dataOffset = 8;

  writeUint32BE(chunk, 0, length);
  chunk.set(type, 4);
  writeUint32BE(chunk, dataOffset, xPpm);
  writeUint32BE(chunk, dataOffset + 4, yPpm);
  chunk[dataOffset + 8] = 1; // meters

  const crcBytes = new Uint8Array(4 + length);
  crcBytes.set(type, 0);
  crcBytes.set(chunk.slice(dataOffset, dataOffset + length), 4);
  writeUint32BE(chunk, dataOffset + length, crc32(crcBytes));

  return chunk;
}

export function injectDpiChunk(pngBytes: Uint8Array, dpi: number | PixelDensity): Uint8Array {
  // PNG signature is 8 bytes, first chunk is expected to be IHDR.
  if (pngBytes.length < 33) {
    return pngBytes;
  }

  const ihdrLength =
    (pngBytes[8] << 24) |
    (pngBytes[9] << 16) |
    (pngBytes[10] << 8) |
    pngBytes[11];
  const insertAt = 8 + 12 + ihdrLength;
  if (insertAt > pngBytes.length) {
    return pngBytes;
  }

  const resultChunks: Uint8Array[] = [pngBytes.slice(0, insertAt)];
  let offset = insertAt;
  let inserted = false;
  while (offset + 12 <= pngBytes.length) {
    const length =
      pngBytes[offset] * 0x1000000 +
      (pngBytes[offset + 1] << 16) +
      (pngBytes[offset + 2] << 8) +
      pngBytes[offset + 3];
    const end = offset + 12 + length;
    if (end > pngBytes.length) return pngBytes;
    const type = String.fromCharCode(...pngBytes.slice(offset + 4, offset + 8));
    if (type === "pHYs") {
      if (!inserted) resultChunks.push(buildPhysChunk(normalizeDensity(dpi)));
      inserted = true;
    } else {
      resultChunks.push(pngBytes.slice(offset, end));
    }
    offset = end;
    if (type === "IEND") break;
  }
  if (!inserted) resultChunks.splice(1, 0, buildPhysChunk(normalizeDensity(dpi)));
  const totalLength = resultChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of resultChunks) {
    result.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }
  return result;
}

export async function createPngBlob(
  canvas: HTMLCanvasElement,
  dpi: number | PixelDensity = 500,
): Promise<Blob> {
  const baseBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create PNG blob from canvas."));
      }
    }, "image/png");
  });

  const bytes = new Uint8Array(await baseBlob.arrayBuffer());
  const withDpi = injectDpiChunk(bytes, dpi);
  return new Blob([withDpi as unknown as BlobPart], { type: "image/png" });
}
