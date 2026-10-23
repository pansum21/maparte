import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frames = JSON.parse(fs.readFileSync(path.join(root, "src/features/layout/ui/aiFrames.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/layouts.json"), "utf8"));
const layouts = manifest.categories.flatMap((category) => category.layouts.map((layout) => ({
  ...layout,
  category: category.name,
  widthCm: String(layout.posterWidthCm ?? layout.width),
  heightCm: String(layout.posterHeightCm ?? layout.height),
})));

const failures = [];
const hashes = new Set();
const metricsByFrame = new Map();

for (const frame of frames) {
  const assetPath = path.join(root, "public", frame.asset.replace(/^\//, ""));
  if (!fs.existsSync(assetPath)) {
    failures.push(`${frame.id}: missing ${frame.asset}`);
    continue;
  }
  const svg = fs.readFileSync(assetPath, "utf8");
  const hash = crypto.createHash("sha256").update(svg).digest("hex");
  if (hashes.has(hash)) failures.push(`${frame.id}: duplicate vector artwork`);
  hashes.add(hash);
  if (!/<svg\b[^>]*viewBox="0 0 1000 1400"/.test(svg)) failures.push(`${frame.id}: incorrect vector canvas`);
  if (/<image\b/.test(svg)) failures.push(`${frame.id}: raster image remains in vector frame`);
  if (/(shutterstock|dreamstime|depositphotos|freepik|istock|vecteezy)/i.test(svg)) failures.push(`${frame.id}: watermark text remains`);
  if (/<rect\b[^>]*fill="(?:#fff|white|#ffffff)"/i.test(svg)) failures.push(`${frame.id}: white background was not removed`);
  try {
    const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== 1000 || info.height !== 1400) failures.push(`${frame.id}: rasterized to ${info.width}x${info.height}`);
    const centerAlpha = data[((700 * info.width) + 500) * 4 + 3];
    const cornerAlpha = data[3];
    if (centerAlpha !== 0) failures.push(`${frame.id}: map opening is not transparent`);
    if (cornerAlpha !== 0) failures.push(`${frame.id}: outer canvas background is not transparent`);
  } catch (error) {
    failures.push(`${frame.id}: invalid SVG (${error.message})`);
  }
}

const vite = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const layoutReports = [];
try {
  const { NeatlineArtwork, getAiFramePlacement, getPosterBorderMetrics } = await vite.ssrLoadModule("/src/features/layout/ui/NeatlinePicker.tsx");
  for (const layout of layouts) {
    const metrics = getPosterBorderMetrics(layout.widthCm, layout.heightCm, true);
    const unitScaleX = 1000 / metrics.usableWidthCm;
    const unitScaleY = (1000 * metrics.usableHeightCm / metrics.usableWidthCm) / metrics.usableHeightCm;
    let layoutFailures = 0;
    let smallestGap = Infinity;
    let largestGap = 0;
    for (const frame of frames) {
      const markup = renderToStaticMarkup(React.createElement(NeatlineArtwork, {
        selection: { lineId: "none", cornerId: "none", frameId: frame.id, cornerPosition: "all", thicknesses: {}, lineVariant: "plain", cornerVariant: "plain" },
        widthCm: layout.widthCm,
        heightCm: layout.heightCm,
      }));
      const image = markup.match(/<image\b([^>]*data-full-frame="true"[^>]*)\/?\s*>/);
      const attrs = Object.fromEntries(["href", "x", "y", "width", "height"].map((name) => {
        const match = image?.[1].match(new RegExp(`${name}="([^"]+)"`));
        return [name, match?.[1]];
      }));
      if (!image || attrs.href !== frame.asset) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}: selected vector frame did not render`);
        continue;
      }
      const numbers = Object.fromEntries(["x", "y", "width", "height"].map((key) => [key, Number(attrs[key])]));
      if (Object.values(numbers).some((n) => !Number.isFinite(n)) || numbers.width <= 0 || numbers.height <= 0) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}: invalid frame placement`);
        continue;
      }
      const placement = getAiFramePlacement(layout.widthCm, layout.heightCm);
      for (const key of ["x", "y", "width", "height"]) {
        if (Math.abs(numbers[key] - placement[key]) > 0.02) {
          layoutFailures++;
          failures.push(`${layout.id}/${frame.id}: ${key} differs from placement metrics`);
        }
      }

      // Verify actual vector line bounds after applying the image transform.
      const artLeft = (numbers.x + numbers.width * 0.02) / unitScaleX;
      const artRight = (1000 - (numbers.x + numbers.width * 0.98)) / unitScaleX;
      const artTop = (numbers.y + numbers.height * (20 / 1400)) / unitScaleY;
      const artBottom = (metrics.usableHeightCm - (numbers.y + numbers.height * (1380 / 1400)) / unitScaleY);
      const leftGap = metrics.mapInsetCm - metrics.outerMatCm - artLeft;
      const rightGap = metrics.mapInsetCm - metrics.outerMatCm - artRight;
      const topGap = metrics.mapInsetCm - metrics.outerMatCm - artTop;
      const bottomGap = metrics.mapInsetCm - metrics.outerMatCm - artBottom;
      const gaps = [leftGap, rightGap, topGap, bottomGap];
      const min = Math.min(...gaps), max = Math.max(...gaps);
      smallestGap = Math.min(smallestGap, min);
      largestGap = Math.max(largestGap, max);
      const expectedGap = metrics.gapCm;
      // Thin banner canvases can legitimately scale the physical gap below
      // 0.12 cm. Require the gap to stay positive and equal on all four sides;
      // also ensure it remains within the designed maximum gap.
      if (gaps.some((gap) => gap <= 0 || Math.abs(gap - expectedGap) > 0.035) || max - min > 0.01) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}: map/frame white gap is not even (${gaps.map((g) => g.toFixed(3)).join(", ")} cm)`);
      }
      if (numbers.x + numbers.width * 0.02 < 0 || numbers.y + numbers.height * (20 / 1400) < 0) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}: inner frame edge clips the page`);
      }
    }
    layoutReports.push({
      id: layout.id,
      category: layout.category,
      frameCases: frames.length,
      failures: layoutFailures,
      whiteGapCm: Number(metrics.gapCm.toFixed(3)),
      observedGapRangeCm: [Number(smallestGap.toFixed(3)), Number(largestGap.toFixed(3))],
    });
  }
} finally {
  await vite.close();
}

const result = {
  frames: frames.length,
  layouts: layouts.length,
  combinations: frames.length * layouts.length,
  uniqueVectorAssets: hashes.size,
  failures: failures.length,
  layoutReports: layoutReports.map(({ id, category, frameCases, failures: count, whiteGapCm, observedGapRangeCm }) => ({ id, category, frameCases, failures: count, whiteGapCm, observedGapRangeCm })),
  firstFailures: failures.slice(0, 30),
};
console.log(JSON.stringify(result, null, 2));
if (frames.length !== 20 || layouts.length !== 26 || hashes.size !== 20 || failures.length) process.exitCode = 1;
