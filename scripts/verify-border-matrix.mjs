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
const errors = [];
const layoutReports = [];

function thicknessesFor(lineId, count, value) {
  return value === null ? {} : { [lineId]: Array.from({ length: count }, () => value) };
}

const vite = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { NeatlineArtwork } = await vite.ssrLoadModule("/src/features/layout/ui/NeatlinePicker.tsx");
  let totalCases = 0;
  for (const layout of layouts) {
    let layoutFailures = 0;
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
    layoutReports.push({ id: layout.id, category: layout.category, cases: patterns.length * 3 * 2, failures: layoutFailures });
  }
  const result = { layouts: layouts.length, linePatterns: patterns.length, cases: totalCases, failures: errors.length, layoutReports, firstFailures: errors.slice(0, 30) };
  console.log(JSON.stringify(result, null, 2));
  if (layouts.length !== 26 || errors.length) process.exitCode = 1;
} finally {
  await vite.close();
}
