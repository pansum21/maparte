import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/layouts.json"), "utf8"));
const layouts = manifest.categories.flatMap((category) => category.layouts.map((layout) => ({
  id: layout.id,
  category: category.name,
  widthCm: String(layout.posterWidthCm ?? layout.width),
  heightCm: String(layout.posterHeightCm ?? layout.height),
})));
const patterns = [
  ["neatline-single", 1],
  ["neatline-double", 2],
  ["neatline-triple", 3],
];
const frames = ["selected-frame-18", "selected-frame-20"];
const frameThicknessCases = [
  ["default", null],
  ["thin", [0.25, 0.25]],
  ["thick", [2, 2]],
  ["uneven", [1.4, 0.35]],
];
const errors = [];
const layoutReports = [];

function thicknessesFor(lineId, count, value) {
  return value === null ? {} : { [lineId]: Array.from({ length: count }, () => value) };
}

const vite = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { NeatlineArtwork, frameWidthsFor, getPosterBorderMetrics } = await vite.ssrLoadModule("/src/features/layout/ui/NeatlinePicker.tsx");
  let totalCases = 0;
  for (const layout of layouts) {
    let layoutFailures = 0;
    totalCases++;
    const noneMarkup = renderToStaticMarkup(React.createElement(NeatlineArtwork, {
      selection: { lineId: "none", cornerId: "none", frameId: "none", cornerPosition: "all", thicknesses: {}, lineVariant: "plain", cornerVariant: "plain" },
      widthCm: layout.widthCm,
      heightCm: layout.heightCm,
    }));
    if (noneMarkup !== "") {
      layoutFailures++;
      errors.push(`${layout.id}/none: no-border selection rendered artwork`);
    }
    for (const [lineId, count] of patterns) {
      for (const thicknessValue of [null, 0.5, 5]) {
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
          const markup = renderToStaticMarkup(React.createElement(NeatlineArtwork, {
            selection,
            widthCm: layout.widthCm,
            heightCm: layout.heightCm,
          }));
          const paths = [...markup.matchAll(/<path\b([^>]*)>/g)].map((match) => match[1]);
          const expectedPaths = count * 4;
          if (paths.length !== expectedPaths) {
            layoutFailures++;
            errors.push(`${layout.id}/${lineId}/${thicknessValue ?? "default"}/${lineVariant}: rendered ${paths.length} edges, expected ${expectedPaths}`);
            continue;
          }
          const edgeCounts = Object.fromEntries(["top", "right", "bottom", "left"].map((edge) => [edge, paths.filter((attrs) => attrs.includes(`data-edge="${edge}"`)).length]));
          if (Object.values(edgeCounts).some((edgeCount) => edgeCount !== count)) {
            layoutFailures++;
            errors.push(`${layout.id}/${lineId}: incomplete edges ${JSON.stringify(edgeCounts)}`);
          }
          const groupWidths = [...markup.matchAll(/<g\b[^>]*stroke-width="([\d.]+)"[^>]*>/g)].map((match) => Number(match[1]));
          if (groupWidths.length !== count || groupWidths.some((value) => value < 0.5 || value > 5)) {
            layoutFailures++;
            errors.push(`${layout.id}/${lineId}: invalid or clipped stroke width list ${groupWidths.join(",")}`);
          }
          const viewBox = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
          const viewW = Number(viewBox?.[1]), viewH = Number(viewBox?.[2]);
          for (const attrs of paths) {
            const d = attrs.match(/d="([^"]+)"/)?.[1] ?? "";
            const commands = [...d.matchAll(/([MHV])\s*([\d.]+)(?:\s+([\d.]+))?/g)];
            const outOfBounds = commands.some((match) => {
              const command = match[1];
              const first = Number(match[2]);
              const second = match[3] === undefined ? null : Number(match[3]);
              if (![first, ...(second === null ? [] : [second])].every(Number.isFinite)) return true;
              if (command === "M") return first < 0 || first > viewW || second === null || second < 0 || second > viewH;
              if (command === "H") return first < 0 || first > viewW;
              return first < 0 || first > viewH;
            });
            if (commands.length < 2 || outOfBounds) {
              layoutFailures++;
              errors.push(`${layout.id}/${lineId}: edge path exits the viewBox`);
            }
          }
          if (lineVariant === "colorful" && !["#b44737", "#276b62", "#bd8735", "#526b9b"].every((color) => markup.includes(`stroke="${color}"`))) {
            layoutFailures++;
            errors.push(`${layout.id}/${lineId}: colorful variant is missing one or more side colors`);
          }
        }
      }
    }
    for (const frameId of frames) {
      for (const [thicknessName, thicknessValues] of frameThicknessCases) {
        totalCases++;
        const thicknesses = thicknessValues ? { [frameId]: thicknessValues } : {};
        const expectedWidthsMm = frameWidthsFor(frameId, thicknesses);
        const markup = renderToStaticMarkup(React.createElement(NeatlineArtwork, {
          selection: { lineId: "none", cornerId: "none", frameId, cornerPosition: "all", thicknesses, lineVariant: "plain", cornerVariant: "plain" },
          widthCm: layout.widthCm,
          heightCm: layout.heightCm,
        }));
        const rects = [...markup.matchAll(/<rect\b([^>]*data-full-frame="true"[^>]*)\/?\s*>/g)].map((match) => {
          const attrs = Object.fromEntries(["x", "y", "width", "height", "stroke-width"].map((name) => {
            const value = match[1].match(new RegExp(`${name}="([^"]+)"`))?.[1];
            return [name, Number(value)];
          }));
          return attrs;
        });
        if (rects.length !== 2 || rects.some((rect) => Object.values(rect).some((value) => !Number.isFinite(value)) || rect.width <= 0 || rect.height <= 0 || rect["stroke-width"] <= 0)) {
          layoutFailures++;
          errors.push(`${layout.id}/${frameId}/${thicknessName}: invalid or missing vector frame lines`);
          continue;
        }
        const metrics = getPosterBorderMetrics(layout.widthCm, layout.heightCm, true);
        const unitScale = 1000 / metrics.usableWidthCm;
        const renderedWidthsMm = rects.map((rect) => rect["stroke-width"] / unitScale * 10);
        if (renderedWidthsMm.some((value, index) => Math.abs(value - expectedWidthsMm[index]) > 0.01)) {
          layoutFailures++;
          errors.push(`${layout.id}/${frameId}/${thicknessName}: frame thickness controls did not reach the vector preview`);
        }
        const [outer, inner] = rects;
        const clearances = [
          inner.x - inner["stroke-width"] / 2 - outer.x - outer["stroke-width"] / 2,
          outer.x + outer.width - outer["stroke-width"] / 2 - inner.x - inner.width - inner["stroke-width"] / 2,
          inner.y - inner["stroke-width"] / 2 - outer.y - outer["stroke-width"] / 2,
          outer.y + outer.height - outer["stroke-width"] / 2 - inner.y - inner.height - inner["stroke-width"] / 2,
        ];
        if (clearances.some((gap) => !Number.isFinite(gap) || gap / unitScale <= 0.01)) {
          layoutFailures++;
          errors.push(`${layout.id}/${frameId}/${thicknessName}: frame strokes overlap or touch`);
        }
      }
    }
    layoutReports.push({ id: layout.id, category: layout.category, cases: 1 + patterns.length * 3 * 2 + frames.length * frameThicknessCases.length, failures: layoutFailures });
  }
  const result = { layouts: layouts.length, linePatterns: patterns.length, frameStyles: frames.length, frameThicknessCases: frameThicknessCases.map(([name]) => name), cases: totalCases, failures: errors.length, layoutReports, firstFailures: errors.slice(0, 30) };
  console.log(JSON.stringify(result, null, 2));
  if (layouts.length !== 26 || errors.length) process.exitCode = 1;
} finally {
  await vite.close();
}
