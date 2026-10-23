/**
 * Create a baseline, uncompressed RGB TIFF from the export canvas.
 *
 * Uncompressed strips keep the encoded byte count deterministic: equal canvas
 * dimensions produce equal TIFF file sizes on every device. Pixels are read in
 * bounded-height strips so encoding does not allocate a second full-frame
 * ImageData buffer.
 */
export async function createTiffBlob(
  canvas: HTMLCanvasElement,
  dpi: { x: number; y: number },
): Promise<Blob> {
  const { width, height } = canvas;
  if (!width || !height) throw new Error("Cannot export an empty TIFF canvas.");
  // Use the same cap on every device so a phone and desktop never silently
  // export different pixel dimensions. A bounded TIFF also avoids making
  // exceptionally large uncompressed files likely to exhaust mobile memory.
  const maxTiffBytes = 64 * 1024 * 1024;
  if (width * height * 3 > maxTiffBytes - 4096) {
    throw new Error(
      "This TIFF would exceed the shared 64 MB safety limit. Choose a smaller print size; the limit is the same on phone and desktop.",
    );
  }

  const stripRows = Math.min(128, height);
  const stripCount = Math.ceil(height / stripRows);
  const entryCount = 13;
  const ifdOffset = 8;
  const ifdSize = 2 + entryCount * 12 + 4;
  let extraOffset = ifdOffset + ifdSize;
  const bitsOffset = extraOffset;
  extraOffset += 6;
  const stripOffsetsOffset = stripCount > 1 ? extraOffset : 0;
  if (stripCount > 1) extraOffset += stripCount * 4;
  const stripByteCountsOffset = stripCount > 1 ? extraOffset : 0;
  if (stripCount > 1) extraOffset += stripCount * 4;
  const xResolutionOffset = extraOffset;
  extraOffset += 8;
  const yResolutionOffset = extraOffset;
  extraOffset += 8;
  const pixelDataOffset = extraOffset;

  const stripByteCounts = Array.from({ length: stripCount }, (_, index) => {
    const rows = Math.min(stripRows, height - index * stripRows);
    return width * rows * 3;
  });
  const stripOffsets: number[] = [];
  let nextPixelOffset = pixelDataOffset;
  for (const byteCount of stripByteCounts) {
    stripOffsets.push(nextPixelOffset);
    nextPixelOffset += byteCount;
  }
  if (nextPixelOffset > 0xffffffff) {
    throw new Error("This TIFF would exceed the standard TIFF 4 GB file limit.");
  }

  const header = new Uint8Array(pixelDataOffset);
  const view = new DataView(header.buffer);
  header[0] = 0x49; // II: little endian
  header[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, entryCount, true);

  const tags: Array<[number, number, number, number]> = [
    [256, 4, 1, width], // ImageWidth LONG
    [257, 4, 1, height], // ImageLength LONG
    [258, 3, 3, bitsOffset], // BitsPerSample: 8,8,8
    [259, 3, 1, 1], // Compression: none
    [262, 3, 1, 2], // PhotometricInterpretation: RGB
    [273, 4, stripCount, stripCount === 1 ? stripOffsets[0] : stripOffsetsOffset],
    [274, 3, 1, 1], // Orientation: top-left
    [277, 3, 1, 3], // SamplesPerPixel: RGB
    [278, 4, 1, stripRows], // RowsPerStrip
    [279, 4, stripCount, stripCount === 1 ? stripByteCounts[0] : stripByteCountsOffset],
    [282, 5, 1, xResolutionOffset], // XResolution RATIONAL
    [283, 5, 1, yResolutionOffset], // YResolution RATIONAL
    [296, 3, 1, 2], // ResolutionUnit: inch
  ];

  let entryOffset = ifdOffset + 2;
  for (const [tag, type, count, value] of tags) {
    view.setUint16(entryOffset, tag, true);
    view.setUint16(entryOffset + 2, type, true);
    view.setUint32(entryOffset + 4, count, true);
    if ((type === 3 && count === 1)) view.setUint16(entryOffset + 8, value, true);
    else view.setUint32(entryOffset + 8, value, true);
    entryOffset += 12;
  }
  view.setUint32(entryOffset, 0, true); // no next IFD
  view.setUint16(bitsOffset, 8, true);
  view.setUint16(bitsOffset + 2, 8, true);
  view.setUint16(bitsOffset + 4, 8, true);
  if (stripCount > 1) {
    stripOffsets.forEach((value, index) => view.setUint32(stripOffsetsOffset + index * 4, value, true));
    stripByteCounts.forEach((value, index) => view.setUint32(stripByteCountsOffset + index * 4, value, true));
  }
  const safeDpiX = Math.max(1, Math.round(Number.isFinite(dpi.x) ? dpi.x : 300));
  const safeDpiY = Math.max(1, Math.round(Number.isFinite(dpi.y) ? dpi.y : 300));
  view.setUint32(xResolutionOffset, safeDpiX, true);
  view.setUint32(xResolutionOffset + 4, 1, true);
  view.setUint32(yResolutionOffset, safeDpiY, true);
  view.setUint32(yResolutionOffset + 4, 1, true);

  const parts: BlobPart[] = [header];
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not read the poster canvas for TIFF export.");
  for (let y = 0; y < height; y += stripRows) {
    const rows = Math.min(stripRows, height - y);
    const image = context.getImageData(0, y, width, rows);
    const rgba = image.data;
    const rgb = new Uint8Array(width * rows * 3);
    for (let source = 0, target = 0; source < rgba.length; source += 4) {
      const alpha = rgba[source + 3];
      if (alpha === 255) {
        rgb[target++] = rgba[source];
        rgb[target++] = rgba[source + 1];
        rgb[target++] = rgba[source + 2];
      } else {
        // Flatten transparency onto white for reliable print-shop output.
        rgb[target++] = Math.round((rgba[source] * alpha + 255 * (255 - alpha)) / 255);
        rgb[target++] = Math.round((rgba[source + 1] * alpha + 255 * (255 - alpha)) / 255);
        rgb[target++] = Math.round((rgba[source + 2] * alpha + 255 * (255 - alpha)) / 255);
      }
    }
    parts.push(rgb);
  }
  return new Blob(parts, { type: "image/tiff" });
}
