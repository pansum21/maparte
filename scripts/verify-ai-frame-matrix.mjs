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
const thicknessCases = [
  ["default", null],
  ["thin", [0.25, 0.25]],
  ["thick", [2, 2]],
  ["uneven", [1.4, 0.35]],
];

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
    let left = info.width, top = info.height, right = -1, bottom = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    metricsByFrame.set(frame.id, { left, top, right, bottom, width: info.width, height: info.height });
    if (centerAlpha !== 0) failures.push(`${frame.id}: map opening is not transparent`);
    if (cornerAlpha !== 0) failures.push(`${frame.id}: outer canvas background is not transparent`);
    if (right < left || bottom < top) failures.push(`${frame.id}: no visible frame artwork`);
  } catch (error) {
    failures.push(`${frame.id}: invalid SVG (${error.message})`);
  }
}

const vite = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const layoutReports = [];
try {
  const previewCss = fs.readFileSync(path.join(root, "src/styles/preview.css"), "utf8");
  const frameRule = previewCss.match(/\.poster-frame \.neatline-artwork\.preview-neatline\s*\{([^}]+)\}/)?.[1] || "";
  if (!/inset:\s*var\(--mat-inset-y[^)]*\)\s+var\(--mat-inset-x[^)]*\)/.test(frameRule)
    || !/width:\s*auto/.test(frameRule) || !/height:\s*auto/.test(frameRule)) {
    failures.push("preview frame SVG is not constrained to the white mat interior");
  }
  const { NeatlineArtwork, frameWidthsFor, getPosterBorderMetrics } = await vite.ssrLoadModule("/src/features/layout/ui/NeatlinePicker.tsx");
  for (const layout of layouts) {
    const metrics = getPosterBorderMetrics(layout.widthCm, layout.heightCm, true);
    const unitScaleX = 1000 / metrics.usableWidthCm;
    const unitScaleY = (1000 * metrics.usableHeightCm / metrics.usableWidthCm) / metrics.usableHeightCm;
    let layoutFailures = 0;
    let smallestGap = Infinity;
    let largestGap = 0;
    for (const frame of frames) {
      for (const [thicknessName, thicknessValues] of thicknessCases) {
      const thicknesses = thicknessValues ? { [frame.id]: thicknessValues } : {};
      const expectedWidthsMm = frameWidthsFor(frame.id, thicknesses);
      const markup = renderToStaticMarkup(React.createElement(NeatlineArtwork, {
        selection: { lineId: "none", cornerId: "none", frameId: frame.id, cornerPosition: "all", thicknesses, lineVariant: "plain", cornerVariant: "plain" },
        widthCm: layout.widthCm,
        heightCm: layout.heightCm,
      }));
      const renderedRects = [...markup.matchAll(/<rect\b([^>]*data-full-frame="true"[^>]*)\/?\s*>/g)];
      if (renderedRects.length !== 2) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}/${thicknessName}: expected two responsive vector border lines`);
        continue;
      }
      const frameRects = renderedRects.map((match) => Object.fromEntries(["x", "y", "width", "height", "stroke-width"].map((name) => {
        const attr = match[1].match(new RegExp(`${name}="([^"]+)"`));
        return [name, Number(attr?.[1])];
      })));
      if (frameRects.some((rect) => Object.values(rect).some((n) => !Number.isFinite(n)) || rect.width <= 0 || rect.height <= 0 || rect["stroke-width"] <= 0)) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}/${thicknessName}: invalid responsive vector border geometry`);
        continue;
      }

      // The rendered artwork uses the same dynamic SVG aspect as the selected
      // page. Verify its physical stroke widths remain identical in X/Y, and
      // that the outer stroke leaves an equal map gap on all four sides.
      const outer = frameRects[0];
      const outerEdges = {
        left: (outer.x - outer["stroke-width"] / 2) / unitScaleX,
        right: (1000 - outer.x - outer.width - outer["stroke-width"] / 2) / unitScaleX,
        top: (outer.y - outer["stroke-width"] / 2) / unitScaleY,
        bottom: (1000 * metrics.usableHeightCm / metrics.usableWidthCm - outer.y - outer.height - outer["stroke-width"] / 2) / unitScaleY,
      };
      const artEdges = Object.values(outerEdges);
      if (artEdges.some((edge) => !Number.isFinite(edge) || edge <= 0)
        || Math.max(...artEdges) - Math.min(...artEdges) > 0.01) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}: outer artwork inset is uneven across the layout`);
      }
      const physicalWidths = frameRects.map((rect) => rect["stroke-width"] / unitScaleX);
      if (physicalWidths.some((width) => width <= 0 || width > 0.2)) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}/${thicknessName}: line thickness is outside the thin-frame range`);
      }
      const physicalWidthsMm = physicalWidths.map((value) => value * 10);
      if (physicalWidthsMm.some((value, index) => Math.abs(value - expectedWidthsMm[index]) > 0.01)) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}/${thicknessName}: frame thickness control does not match rendered SVG width`);
      }
      const gaps = [
        metrics.mapInsetCm - metrics.outerMatCm - outerEdges.left,
        metrics.mapInsetCm - metrics.outerMatCm - outerEdges.right,
        metrics.mapInsetCm - metrics.outerMatCm - outerEdges.top,
        metrics.mapInsetCm - metrics.outerMatCm - outerEdges.bottom,
      ];
      const min = Math.min(...gaps), max = Math.max(...gaps);
      smallestGap = Math.min(smallestGap, min);
      largestGap = Math.max(largestGap, max);
      if (gaps.some((gap) => gap <= 0 || Math.abs(gap - metrics.gapCm) > 0.02) || max - min > 0.01) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}/${thicknessName}: map/frame white gap is not even (${gaps.map((g) => g.toFixed(3)).join(", ")} cm)`);
      }
      if (frameRects[1].x <= outer.x || frameRects[1].y <= outer.y
        || frameRects[1].x + frameRects[1].width >= outer.x + outer.width
        || frameRects[1].y + frameRects[1].height >= outer.y + outer.height) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}/${thicknessName}: inner line escapes the outer line`);
      }
      const inner = frameRects[1];
      const clearances = [
        inner.x - inner["stroke-width"] / 2 - outer.x - outer["stroke-width"] / 2,
        outer.x + outer.width - outer["stroke-width"] / 2 - inner.x - inner.width - inner["stroke-width"] / 2,
        inner.y - inner["stroke-width"] / 2 - outer.y - outer["stroke-width"] / 2,
        outer.y + outer.height - outer["stroke-width"] / 2 - inner.y - inner.height - inner["stroke-width"] / 2,
      ];
      if (clearances.some((gap) => !Number.isFinite(gap) || gap / unitScaleX <= 0.01)) {
        layoutFailures++;
        failures.push(`${layout.id}/${frame.id}/${thicknessName}: frame lines overlap or touch`);
      }
      }
    }
    layoutReports.push({
      id: layout.id,
      category: layout.category,
      frameCases: frames.length * thicknessCases.length,
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
  thicknessCases: thicknessCases.map(([name]) => name),
  combinations: frames.length * thicknessCases.length * layouts.length,
  uniqueVectorAssets: hashes.size,
  failures: failures.length,
  layoutReports: layoutReports.map(({ id, category, frameCases, failures: count, whiteGapCm, observedGapRangeCm }) => ({ id, category, frameCases, failures: count, whiteGapCm, observedGapRangeCm })),
  firstFailures: failures.slice(0, 30),
};
console.log(JSON.stringify(result, null, 2));
// The selected frame catalogue is intentionally user-curated and may contain
// any positive number of unique frames; do not hard-code the old 20-frame set.
if (frames.length !== 2 || layouts.length !== 26 || hashes.size !== frames.length || failures.length) {
  process.exitCode = 1;
}
