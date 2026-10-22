import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { resolveCanvasSize } = await vite.ssrLoadModule(
    "/src/features/poster/infrastructure/renderer/canvas.ts",
  );
  const { injectDpiChunk, createPngBlob } = await vite.ssrLoadModule(
    "/src/features/export/infrastructure/pngExporter.ts",
  );
  const { injectJpegDensity, createJpgBlob } = await vite.ssrLoadModule(
    "/src/features/export/infrastructure/jpgExporter.ts",
  );
  const { createPdfBlobFromCanvas } = await vite.ssrLoadModule(
    "/src/features/export/infrastructure/pdfExporter.ts",
  );

  const posterSizes = [
    [10, 15], [13.84 / 2.54, 30 / 2.54], [20, 30], [21, 29.7],
    [30, 40], [30, 45], [40, 50], [42, 59.4], [50, 70], [60, 90],
  ];
  const limits = [
    { maxPixels: 80_000_000, maxSide: 11_000 },
    { maxPixels: 48_000_000, maxSide: 8_192 },
  ];
  let resolutionCases = 0;
  let formatCases = 0;

  function pngChunk(type, data) {
    const chunk = new Uint8Array(12 + data.length);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.length);
    chunk.set(new TextEncoder().encode(type), 4);
    chunk.set(data, 8);
    // CRC is not used by the metadata injector; this is a compact test fixture.
    view.setUint32(8 + data.length, 0);
    return chunk;
  }

  function pngFixture(width, height) {
    const ihdr = new Uint8Array(13);
    const ihdrView = new DataView(ihdr.buffer);
    ihdrView.setUint32(0, width);
    ihdrView.setUint32(4, height);
    return new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10,
      ...pngChunk("IHDR", ihdr),
      ...pngChunk("IDAT", new Uint8Array([1, 2, 3])),
      ...pngChunk("IEND", new Uint8Array()),
    ]);
  }

  function jpegFixture() {
    return new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
      0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xd9,
    ]);
  }

  function readPng(bytes) {
    let offset = 8;
    let dimensions = null;
    let density = null;
    let densityCount = 0;
    while (offset + 12 <= bytes.length) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.length - offset);
      const length = view.getUint32(0);
      const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
      if (type === "IHDR") dimensions = { width: view.getUint32(8), height: view.getUint32(12) };
      if (type === "pHYs") {
        density = { x: view.getUint32(8) * 0.0254, y: view.getUint32(12) * 0.0254, unit: bytes[offset + 16] };
        densityCount += 1;
      }
      offset += length + 12;
      if (type === "IEND") break;
    }
    return { dimensions, density, densityCount };
  }

  // One hundred deterministic size × tier × device cases.
  for (let i = 0; i < 100; i += 1) {
    const [shortSide, longSide] = posterSizes[i % posterSizes.length];
    const landscape = i % 3 === 0;
    const [widthIn, heightIn] = landscape
      ? [longSide, shortSide]
      : [shortSide, longSide];
    const targetDpi = i % 2 === 0 ? 500 : 300;
    const deviceLimits = limits[Math.floor(i / 5) % limits.length];
    const size = resolveCanvasSize(widthIn, heightIn, targetDpi, deviceLimits);

    assert(size.width > 0 && size.height > 0, `case ${i}: dimensions must be positive`);
    assert(size.width * size.height <= deviceLimits.maxPixels, `case ${i}: pixel cap exceeded`);
    assert(Math.max(size.width, size.height) <= deviceLimits.maxSide, `case ${i}: side cap exceeded`);
    assert(Math.abs(size.effectiveDpiX - size.width / widthIn) < 1e-9);
    assert(Math.abs(size.effectiveDpiY - size.height / heightIn) < 1e-9);
    assert(size.effectiveDpiX <= targetDpi + 0.01 && size.effectiveDpiY <= targetDpi + 0.01);
    const aspectError = Math.abs(size.width / size.height - widthIn / heightIn);
    assert(aspectError < 0.002, `case ${i}: aspect ratio changed too much`);

    // Exercise each real file-writer with the capped dimensions for this case.
    const density = {
      x: size.width / widthIn,
      y: size.height / heightIn,
    };
    const fakeCanvas = {
      width: size.width,
      height: size.height,
      toBlob(callback, mimeType) {
        const bytes = mimeType === "image/jpeg" ? jpegFixture() : pngFixture(size.width, size.height);
        callback(new Blob([bytes], { type: mimeType }));
      },
      toDataURL: () => "data:image/jpeg;base64,/9j/2Q==",
    };
    const pngBlob = await createPngBlob(fakeCanvas, density);
    const pngResult = readPng(new Uint8Array(await pngBlob.arrayBuffer()));
    assert.deepEqual(pngResult.dimensions, { width: size.width, height: size.height });
    assert.equal(pngResult.densityCount, 1);
    assert(Math.abs(pngResult.density.x - density.x) < 0.02);
    assert(Math.abs(pngResult.density.y - density.y) < 0.02);

    const jpegBlob = await createJpgBlob(fakeCanvas, 0.95, density);
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    assert.equal(jpegBytes[0], 0xff);
    assert.equal(jpegBytes[1], 0xd8);
    assert.equal(jpegBytes[13], 1);
    assert.equal((jpegBytes[14] << 8) | jpegBytes[15], Math.round(density.x));
    assert.equal((jpegBytes[16] << 8) | jpegBytes[17], Math.round(density.y));

    const pdfBlob = createPdfBlobFromCanvas(fakeCanvas, {
      widthCm: widthIn * 2.54,
      heightCm: heightIn * 2.54,
    });
    const pdf = new TextDecoder().decode(await pdfBlob.arrayBuffer());
    const mediaBox = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    const imageSize = pdf.match(/\/Width (\d+) \/Height (\d+)/);
    assert(mediaBox && imageSize, `case ${i}: PDF needs a physical page and raster dimensions`);
    const pdfPpiX = Number(imageSize[1]) / (Number(mediaBox[1]) / 72);
    const pdfPpiY = Number(imageSize[2]) / (Number(mediaBox[2]) / 72);
    assert(Math.abs(pdfPpiX - density.x) < 0.15, `case ${i}: PDF X PPI mismatch`);
    assert(Math.abs(pdfPpiY - density.y) < 0.15, `case ${i}: PDF Y PPI mismatch`);

    resolutionCases += 1;
    formatCases += 3;
  }

  const replaceablePng = pngFixture(64, 96);
  const pngWithDensity = injectDpiChunk(replaceablePng, { x: 500, y: 347 });
  const firstPngDensity = readPng(pngWithDensity);
  assert.equal(firstPngDensity.densityCount, 1, "PNG must contain exactly one pHYs chunk");
  assert.equal(firstPngDensity.density.unit, 1, "PNG pHYs unit must be meters");
  assert(Math.abs(firstPngDensity.density.x - 500) < 0.02);
  assert(Math.abs(firstPngDensity.density.y - 347) < 0.02);
  const replacedPngDensity = readPng(injectDpiChunk(pngWithDensity, 300));
  assert.equal(replacedPngDensity.densityCount, 1, "re-export must replace, not duplicate, pHYs");
  assert(Math.abs(replacedPngDensity.density.x - 300) < 0.02);

  const jpegJfif = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xd9,
  ]);
  const jpegDpi = injectJpegDensity(jpegJfif, { x: 500, y: 347 });
  assert.equal(jpegDpi[13], 1, "JPEG JFIF unit must mean pixels per inch");
  assert.equal((jpegDpi[14] << 8) | jpegDpi[15], 500);
  assert.equal((jpegDpi[16] << 8) | jpegDpi[17], 347);
  const jpegWithoutJfif = injectJpegDensity(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 300);
  assert.equal(jpegWithoutJfif[2], 0xff);
  assert.equal(jpegWithoutJfif[3], 0xe0, "JPEG without JFIF must receive a density header");

  const damagedJpeg = injectJpegDensity(new Uint8Array([1, 2, 3]), 500);
  assert.deepEqual([...damagedJpeg], [1, 2, 3], "invalid JPEG data must pass through safely");

  const pdfBytes = await createPdfBlobFromCanvas(
    {
      width: 1889,
      height: 4096,
      toDataURL: () => "data:image/jpeg;base64,/9j/2Q==",
    },
    { widthCm: 13.84, heightCm: 30 },
  ).arrayBuffer();
  const pdf = new TextDecoder().decode(pdfBytes);
  const mediaBox = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  const imageSize = pdf.match(/\/Width (\d+) \/Height (\d+)/);
  assert(mediaBox && imageSize, "PDF must include page and embedded-image dimensions");
  const pageWidthIn = Number(mediaBox[1]) / 72;
  const pageHeightIn = Number(mediaBox[2]) / 72;
  const pdfPpiX = Number(imageSize[1]) / pageWidthIn;
  const pdfPpiY = Number(imageSize[2]) / pageHeightIn;
  assert(Math.abs(pdfPpiX - 346.7) < 0.2, `unexpected PDF X PPI: ${pdfPpiX}`);
  assert(Math.abs(pdfPpiY - 346.8) < 0.2, `unexpected PDF Y PPI: ${pdfPpiY}`);

  console.log(JSON.stringify({
    resolutionCases,
    rasterFormatCases: formatCases,
    pngDensity: { x: firstPngDensity.density.x, y: firstPngDensity.density.y },
    jpgDensity: { x: 500, y: 347 },
    pdfPpi: { x: pdfPpiX, y: pdfPpiY },
    result: "PASS",
  }, null, 2));
} finally {
  await vite.close();
}
