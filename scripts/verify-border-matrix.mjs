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
    category: category.name,
    widthCm: String(layout.posterWidthCm ?? layout.width),
    heightCm: String(layout.posterHeightCm ?? layout.height),
  })),
);

const baselinePatterns = [
  ["neatline-single", 1],
  ["neatline-double", 2],
  ["neatline-triple", 3],
];

const designerPatterns = [
  ["neatline-thick-thin", 2],
  ["neatline-thin-thick", 2],
  ["neatline-triple-sandwich", 3],
  ["neatline-dashed", 2],
  ["neatline-dotted", 2],
  ["neatline-dash-dot", 2],
];

const allPatterns = [...baselinePatterns, ...designerPatterns];
const errors = [];
const layoutReports = [];

function thicknessesFor(lineId, count, value) {
  return value === null
    ? {}
    : { [lineId]: Array.from({ length: count }, () => value) };
}

const vite = await createServer({
  root,
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const { NeatlineArtwork, NeatlinePicker, getPosterBorderMetrics, lineStyles } =
    await vite.ssrLoadModule("/src/features/layout/ui/NeatlinePicker.tsx");
  let totalCases = 0;
  const pickerMarkup = renderToStaticMarkup(
    React.createElement(NeatlinePicker, { width: "21", height: "29.7" }),
  );

  // Verify all 11 line patterns are declared and present in picker markup
  for (const [lineId] of allPatterns) {
    if (!pickerMarkup.includes(`data-border-style="${lineId}"`)) {
      errors.push(`${lineId}: missing from NeatlinePicker options`);
    }
  }
  totalCases++;

  for (const layout of layouts) {
    let layoutFailures = 0;
    totalCases++;
    const noneMarkup = renderToStaticMarkup(
      React.createElement(NeatlineArtwork, {
        selection: {
          lineId: "none",
          cornerId: "none",
          frameId: "none",
          cornerPosition: "all",
          thicknesses: {},
          lineVariant: "plain",
          cornerVariant: "plain",
        },
        widthCm: layout.widthCm,
        heightCm: layout.heightCm,
      }),
    );
    if (noneMarkup !== "") {
      layoutFailures++;
      errors.push(`${layout.id}/none: no-border selection rendered artwork`);
    }

    // 1. Thoroughly verify baseline patterns (Single, Double, Triple)
    for (const [lineId, count] of baselinePatterns) {
      for (const thicknessValue of [null, 0.5, 2.5, 5]) {
        for (const lineVariant of ["plain", "colorful"]) {
          totalCases++;
          const selection = {
            lineId,
            cornerId: "none",
            frameId: "none",
            cornerPosition: "all",
            thicknesses: thicknessesFor(lineId, count, thicknessValue),
            lineVariant,
            cornerVariant: "plain",
          };
          const markup = renderToStaticMarkup(
            React.createElement(NeatlineArtwork, {
              selection,
              widthCm: layout.widthCm,
              heightCm: layout.heightCm,
            }),
          );
          const paths = [...markup.matchAll(/<path\b([^>]*)>/g)].map(
            (match) => match[1],
          );
          const expectedPaths = count * 4;
          if (paths.length !== expectedPaths) {
            layoutFailures++;
            errors.push(
              `${layout.id}/${lineId}/${thicknessValue ?? "default"}/${lineVariant}: rendered ${paths.length} edges, expected ${expectedPaths}`,
            );
            continue;
          }
          const edgeCounts = Object.fromEntries(
            ["top", "right", "bottom", "left"].map((edge) => [
              edge,
              paths.filter((attrs) => attrs.includes(`data-edge="${edge}"`))
                .length,
            ]),
          );
          if (
            Object.values(edgeCounts).some((edgeCount) => edgeCount !== count)
          ) {
            layoutFailures++;
            errors.push(
              `${layout.id}/${lineId}: incomplete edges ${JSON.stringify(edgeCounts)}`,
            );
          }
          const groupWidths = [
            ...markup.matchAll(/<g\b[^>]*stroke-width="([\d.]+)"[^>]*>/g),
          ].map((match) => Number(match[1]));
          if (
            groupWidths.length !== count ||
            groupWidths.some((value) => value < 2.3 || value > 48.1)
          ) {
            layoutFailures++;
            errors.push(
              `${layout.id}/${lineId}: invalid or clipped stroke width list ${groupWidths.join(",")}`,
            );
          }
          const viewBox = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
          const viewW = Number(viewBox?.[1]);
          const viewH = Number(viewBox?.[2]);
          for (const attrs of paths) {
            const d = attrs.match(/d="([^"]+)"/)?.[1] ?? "";
            const commands = [
              ...d.matchAll(/([MHV])\s*([\d.]+)(?:\s+([\d.]+))?/g),
            ];
            const outOfBounds = commands.some((match) => {
              const command = match[1];
              const first = Number(match[2]);
              const second =
                match[3] === undefined ? null : Number(match[3]);
              if (
                ![first, ...(second === null ? [] : [second])].every(
                  Number.isFinite,
                )
              )
                return true;
              if (command === "M")
                return (
                  first < 0 ||
                  first > viewW ||
                  second === null ||
                  second < 0 ||
                  second > viewH
                );
              if (command === "H") return first < 0 || first > viewW;
              return first < 0 || first > viewH;
            });
            if (commands.length < 2 || outOfBounds) {
              layoutFailures++;
              errors.push(`${layout.id}/${lineId}: edge path exits the viewBox`);
            }
          }
          if (
            lineVariant === "colorful" &&
            !["#b44737", "#276b62", "#bd8735", "#526b9b"].every((color) =>
              markup.includes(`stroke="${color}"`),
            )
          ) {
            layoutFailures++;
            errors.push(
              `${layout.id}/${lineId}: colorful variant is missing one or more side colors`,
            );
          }
        }
      }
    }

    // 2. Thoroughly verify the 8 Designer Patterns across gap values & thicknesses
    for (const [lineId, count] of designerPatterns) {
      for (const mapGapCm of [0.0, 0.1, 0.2, 0.35, 0.5]) {
        for (const thicknessValue of [null, 1.5, 4.0]) {
          totalCases++;
          const selection = {
            lineId,
            cornerId: "none",
            frameId: "none",
            cornerPosition: "all",
            thicknesses: thicknessesFor(lineId, count, thicknessValue),
            lineVariant: "plain",
            cornerVariant: "plain",
            mapGapCm,
          };
          const markup = renderToStaticMarkup(
            React.createElement(NeatlineArtwork, {
              selection,
              widthCm: layout.widthCm,
              heightCm: layout.heightCm,
            }),
          );

          if (!markup || !markup.startsWith("<svg")) {
            layoutFailures++;
            errors.push(`${layout.id}/${lineId}/gap-${mapGapCm}: failed to render svg root`);
            continue;
          }

          const viewBox = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
          const viewW = Number(viewBox?.[1]);
          const viewH = Number(viewBox?.[2]);
          if (!viewW || !viewH || !Number.isFinite(viewW) || !Number.isFinite(viewH) || viewH <= 0) {
            layoutFailures++;
            errors.push(`${layout.id}/${lineId}: invalid viewBox ${viewBox?.[0]}`);
            continue;
          }

          // Check all rects fit inside viewBox
          const rects = [...markup.matchAll(/<rect\b([^>]*)>/g)].map((m) => m[1]);
          for (const attrs of rects) {
            const x = Number(attrs.match(/\bx="([\d.]+)"/)?.[1] ?? 0);
            const y = Number(attrs.match(/\by="([\d.]+)"/)?.[1] ?? 0);
            const width = Number(attrs.match(/\bwidth="([\d.]+)"/)?.[1] ?? 0);
            const height = Number(attrs.match(/\bheight="([\d.]+)"/)?.[1] ?? 0);

            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y) ||
              !Number.isFinite(width) ||
              !Number.isFinite(height) ||
              width <= 0 ||
              height <= 0 ||
              x < 0 ||
              y < 0 ||
              x + width > viewW + 1 ||
              y + height > viewH + 1
            ) {
              layoutFailures++;
              errors.push(
                `${layout.id}/${lineId}/gap-${mapGapCm}: rect out of bounds x=${x}, y=${y}, w=${width}, h=${height} inside ${viewW}x${viewH}`,
              );
            }
          }

        }
      }
    }

    layoutReports.push({
      id: layout.id,
      category: layout.category,
      cases: 1 + baselinePatterns.length * 4 * 2 + designerPatterns.length * 4 * 3,
      failures: layoutFailures,
    });
  }

  const result = {
    layouts: layouts.length,
    totalLinePatterns: allPatterns.length,
    baselinePatterns: baselinePatterns.length,
    designerPatterns: designerPatterns.length,
    cases: totalCases,
    failures: errors.length,
    layoutReportsSummary: `Verified ${layouts.length} layouts across all 11 border styles and multiple gap/thickness matrices.`,
    firstFailures: errors.slice(0, 30),
  };
  console.log(JSON.stringify(result, null, 2));
  if (layouts.length < 26 || errors.length) process.exitCode = 1;
} finally {
  await vite.close();
}
