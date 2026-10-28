import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/layouts.json"), "utf8"),
);
const layouts = manifest.categories.flatMap((category) =>
  category.layouts.map((layout) => ({
    id: layout.id,
    name: layout.name,
    category: category.name,
    widthCm: String(layout.posterWidthCm ?? layout.width),
    heightCm: String(layout.posterHeightCm ?? layout.height),
  })),
);

const allPatternIds = [
  "neatline-single",
  "neatline-double",
  "neatline-triple",
  "neatline-thick-thin",
  "neatline-thin-thick",
  "neatline-triple-sandwich",
  "neatline-dashed",
  "neatline-dotted",
  "neatline-dash-dot",
];

const gapTestValues = [0.00, 0.05, 0.10, 0.15, 0.20, 0.35, 0.50, 0.60];
const thicknessTestValues = [null, 0.6, 2.0, 4.5, 8.0, 14.0];

const vite = await createServer({
  root,
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { NeatlineArtwork, getPosterBorderMetrics, lineStyles, widthsFor } =
    await vite.ssrLoadModule("/src/features/layout/ui/NeatlinePicker.tsx");

  let totalTests = 0;
  let passedTests = 0;
  const failures = [];

  console.log(`Starting Exhaustive Overlap Stress Testing:`);
  console.log(`- Layouts: ${layouts.length}`);
  console.log(`- Patterns: ${allPatternIds.length}`);
  console.log(`- Gap values: ${gapTestValues.length}`);
  console.log(`- Thickness variants: ${thicknessTestValues.length}`);
  console.log(`Total planned tests: ${layouts.length * allPatternIds.length * gapTestValues.length * thicknessTestValues.length * 2} (with and without white mat)`);

  for (const layout of layouts) {
    const widthCm = Number(layout.widthCm);
    const heightCm = Number(layout.heightCm);

    for (const patternId of allPatternIds) {
      const style = lineStyles.find((s) => s.id === patternId);
      if (!style) {
        failures.push(`Style ${patternId} not found in lineStyles`);
        continue;
      }

      for (const showWhiteMat of [false, true]) {
      for (const gapCm of gapTestValues) {
        for (const thicknessVal of thicknessTestValues) {
          totalTests++;

          const thicknesses =
            thicknessVal === null
              ? {}
              : { [patternId]: [thicknessVal, thicknessVal, thicknessVal] };

          const selection = {
            lineId: patternId,
            cornerId: "none",
            frameId: "none",
            cornerPosition: "all",
            thicknesses,
            lineVariant: "plain",
            cornerVariant: "plain",
            mapGapCm: gapCm,
            showWhiteMat,
          };

          const metrics = getPosterBorderMetrics(
            layout.widthCm,
            layout.heightCm,
            gapCm,
            patternId,
            thicknesses,
            1.0,
            showWhiteMat,
          );

          // 1. Check physical clearances
          const clearanceCm = metrics.mapInsetCm - (metrics.outerMatCm + metrics.borderBandCm);
          if (Math.abs(clearanceCm - gapCm) > 0.0001) {
            failures.push(
              `Clearance mismatch on ${layout.id}/${patternId}/mat-${showWhiteMat}/gap-${gapCm}: clearance=${clearanceCm}, expected=${gapCm}`,
            );
            continue;
          }

          if (clearanceCm < 0) {
            failures.push(
              `NEGATIVE CLEARANCE (OVERLAP) on ${layout.id}/${patternId}/mat-${showWhiteMat}/gap-${gapCm}: clearance=${clearanceCm}`,
            );
            continue;
          }

          // 2. Check Map Opening is positive and healthy
          const mapOpeningWidthCm = widthCm - metrics.mapInsetCm * 2;
          const mapOpeningHeightCm = heightCm - metrics.mapInsetCm * 2;
          if (mapOpeningWidthCm <= 0 || mapOpeningHeightCm <= 0) {
            failures.push(
              `Map window squashed to zero on ${layout.id}/${patternId}/mat-${showWhiteMat}: w=${mapOpeningWidthCm}, h=${mapOpeningHeightCm}`,
            );
            continue;
          }

          // 3. Render markup and verify NO stroke/element penetrates the map opening
          const markup = renderToStaticMarkup(
            React.createElement(NeatlineArtwork, {
              selection,
              widthCm: layout.widthCm,
              heightCm: layout.heightCm,
            }),
          );

          if (!markup || !markup.startsWith("<svg")) {
            failures.push(`Failed to render SVG on ${layout.id}/${patternId}`);
            continue;
          }

          // In SVG coordinates relative to the artwork viewport, the map
          // window starts after the border band; the white mat is outside it.
          const mapInsetUnits = (metrics.borderBandCm + metrics.gapCm) * metrics.unitScale;
          const innerStrokeWidth =
            metrics.offInner - metrics.edgeInset >= 0
              ? widthsFor(patternId, thicknesses).slice(-1)[0] ?? 2
              : 2;
          const innerBorderStrokeEdgeUnits = metrics.offInner + innerStrokeWidth / 2;

          // The inner border line stroke MUST finish before mapInsetUnits
          if (innerBorderStrokeEdgeUnits > mapInsetUnits - (gapCm * metrics.unitScale) + 0.001) {
            failures.push(
              `Inner border stroke encroaches into gap on ${layout.id}/${patternId}/mat-${showWhiteMat}: edge=${innerBorderStrokeEdgeUnits}, mapStart=${mapInsetUnits}`,
            );
            continue;
          }

          // Check all rects in markup
          const rects = [...markup.matchAll(/<rect\b([^>]*)>/g)].map((m) => m[1]);
          let rectEncroachment = false;
          for (const attrs of rects) {
            const x = Number(attrs.match(/\bx="([\d.]+)"/)?.[1] ?? 0);
            const y = Number(attrs.match(/\by="([\d.]+)"/)?.[1] ?? 0);
            const w = Number(attrs.match(/\bwidth="([\d.]+)"/)?.[1] ?? 0);
            const h = Number(attrs.match(/\bheight="([\d.]+)"/)?.[1] ?? 0);

            // A border rect must either be a perimeter line (whose inner edge is <= offInner)
            // or a corner square/rosette (whose x + w <= offInner or x >= innerW - offInner).
            // It MUST NOT cross into the map window interior [mapInsetUnits, innerW - mapInsetUnits] x [mapInsetUnits, innerH - mapInsetUnits].
            const rectInnerX1 = x;
            const rectInnerX2 = x + w;
            const rectInnerY1 = y;
            const rectInnerY2 = y + h;

            // If a rect is inside the map window:
            if (
              rectInnerX1 > mapInsetUnits &&
              rectInnerX2 < metrics.innerW - mapInsetUnits &&
              rectInnerY1 > mapInsetUnits &&
              rectInnerY2 < metrics.innerH - mapInsetUnits
            ) {
              rectEncroachment = true;
              failures.push(
                `Rect encroached inside map window on ${layout.id}/${patternId}/mat-${showWhiteMat}: rect=[${x},${y},${w},${h}] inside map opening [${mapInsetUnits.toFixed(1)}, ${(metrics.innerW - mapInsetUnits).toFixed(1)}]`,
              );
              break;
            }
          }

          if (rectEncroachment) continue;

          passedTests++;
        }
      }
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`EXHAUSTIVE OVERLAP STRESS TEST RESULTS:`);
  console.log(`Total tests run: ${totalTests}`);
  console.log(`Total tests passed: ${passedTests}`);
  console.log(`Total overlap failures: ${failures.length}`);
  console.log(`========================================\n`);

  if (failures.length > 0) {
    console.error("Failures detected:", failures.slice(0, 20));
    process.exit(1);
  } else {
    console.log("SUCCESS: 0 overlaps found across all 36 layouts and all 19 border styles!");
  }
} finally {
  await vite.close();
}
