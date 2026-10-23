import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputDir = path.resolve(root, "../upload");
const outputDir = path.join(root, "public/assets/ai-frames");
const manifestPath = path.join(root, "src/features/layout/ui/aiFrames.json");
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const sources = [
  ["150658", "Open Double Corners"],
  ["150708", "Green Inset Line"],
  ["150718", "Square Corner Caps"],
  ["150818", "Gold Corner Accents"],
  ["151006", "Fine Cross Corners"],
  ["151039", "Double Rail"],
  ["151105", "Offset Double Line"],
  ["151325", "Hairline Cross Corners"],
  ["152051", "Interrupted Triple Line"],
  ["152109", "Angular Open Corners"],
  ["152228", "Clean Geometric Double"],
  ["152500", "Ornamental Side Corners"],
  ["152647", "Botanical-Free Corner Line"],
  ["152709", "Fine Dotted Rectangle"],
  ["152909", "Arrow Corner Rails"],
  ["153019", "Soft Hairline Corners"],
  ["153044", "Circle-Free Rail Corners"],
  ["153115", "Complete Double Rectangle"],
  ["153259", "Bold Double Rectangle"],
  ["153304", "Classic Double Rectangle"],
];

const width = 1000;
const height = 1400;
const padX = 20;
const padY = 20;

function pointInCircle(x, y, cx, cy, radius) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function classifyPixel(id, r, g, b) {
  // The source references use a pale green rail and gold accents in these two designs.
  if (id === "150708" && g > r + 12 && g > b + 8) return "#88a94d";
  if (id === "150818" && r > g + 18 && g > b + 18 && r > 130) return "#d7b444";
  if (id === "150818" && r > 185 && g > 165 && b < 145) return "#d7b444";
  return "#303238";
}

function shouldErase(id, x, y, w, h) {
  if (id === "150818") {
    // Remove only the two black dots identified by the user; retain gold corner marks.
    return pointInCircle(x, y, w * 0.89, h * 0.29, Math.max(2.2, w * 0.015)) ||
      pointInCircle(x, y, w * 0.09, h * 0.75, Math.max(2.2, w * 0.015));
  }
  if (id === "152228") return y >= h * 0.88; // Exclude the source watermark/footer strip.
  if (id === "152647") {
    // Remove the small lower-left sprig while retaining the adjoining frame rails.
    return x >= w * 0.075 && x <= w * 0.31 && y >= h * 0.72 && y <= h * 0.95;
  }
  if (id === "152709") return y >= h * 0.95; // Exclude the tiny signature below the dotted frame.
  if (id === "153044") {
    // Remove all three circular marks; their open rail endpoints stay in place.
    return pointInCircle(x, y, w * 0.075, h * 0.075, w * 0.045) ||
      pointInCircle(x, y, w * 0.92, h * 0.86, w * 0.025) ||
      pointInCircle(x, y, w * 0.92, h * 0.94, w * 0.055);
  }
  return false;
}

function buildMask(data, w, h, colorId) {
  const mask = new Uint8Array(w * h);
  const inkThreshold = colorId === "153044" ? 180 : colorId === "152909" ? 205 : 225;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Remove white, light gray checkerboards, shadows, and pale source backgrounds.
      if (Math.min(r, g, b) >= inkThreshold || shouldErase(colorId, x, y, w, h)) continue;
      mask[y * w + x] = 1;
    }
  }
  if (colorId === "153044") removeSmallComponents(mask, w, h, 5);
  return mask;
}

function removeSmallComponents(mask, w, h, minimumSize) {
  const visited = new Uint8Array(mask.length);
  const neighbors = [-1, 0, 1];
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index] || visited[index]) continue;
    const component = [index];
    visited[index] = 1;
    for (let cursor = 0; cursor < component.length; cursor++) {
      const current = component[cursor];
      const x = current % w;
      const y = Math.floor(current / w);
      for (const dy of neighbors) for (const dx of neighbors) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const next = ny * w + nx;
        if (mask[next] && !visited[next]) { visited[next] = 1; component.push(next); }
      }
    }
    if (component.length < minimumSize) for (const pixel of component) mask[pixel] = 0;
  }
}

function simplifyCollinear(points) {
  if (points.length < 4) return points;
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[(i + points.length - 1) % points.length];
    const b = points[i];
    const c = points[(i + 1) % points.length];
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const bcx = c[0] - b[0], bcy = c[1] - b[1];
    if (abx * bcy !== aby * bcx || abx * bcx + aby * bcy < 0) result.push(b);
  }
  return result.length >= 3 ? result : points;
}

function maskToPath(mask, w, h) {
  const edges = [];
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) edges.push([[x, y], [x + 1, y], 0]);
      if (!at(x + 1, y)) edges.push([[x + 1, y], [x + 1, y + 1], 1]);
      if (!at(x, y + 1)) edges.push([[x + 1, y + 1], [x, y + 1], 2]);
      if (!at(x - 1, y)) edges.push([[x, y + 1], [x, y], 3]);
    }
  }
  const key = (p) => `${p[0]},${p[1]}`;
  const outgoing = new Map();
  edges.forEach((edge, index) => {
    const k = key(edge[0]);
    if (!outgoing.has(k)) outgoing.set(k, []);
    outgoing.get(k).push(index);
  });
  const used = new Uint8Array(edges.length);
  const loops = [];
  for (let startIndex = 0; startIndex < edges.length; startIndex++) {
    if (used[startIndex]) continue;
    const points = [];
    let index = startIndex;
    const start = edges[index][0];
    let guard = 0;
    while (!used[index] && guard++ < edges.length + 4) {
      const edge = edges[index];
      used[index] = 1;
      points.push(edge[0]);
      const endKey = key(edge[1]);
      if (endKey === key(start)) break;
      const candidates = (outgoing.get(endKey) || []).filter((candidate) => !used[candidate]);
      if (!candidates.length) break;
      const direction = edge[2];
      const priority = [(direction + 1) % 4, direction, (direction + 3) % 4, (direction + 2) % 4];
      index = candidates.sort((a, b) => priority.indexOf(edges[a][2]) - priority.indexOf(edges[b][2]))[0];
    }
    if (points.length >= 3) loops.push(simplifyCollinear(points));
  }
  return loops;
}

function loopsToSvg(loops, bbox, color) {
  const [minX, minY, maxX, maxY] = bbox;
  const scaleX = (width - padX * 2) / Math.max(1, maxX - minX);
  const scaleY = (height - padY * 2) / Math.max(1, maxY - minY);
  const segments = [];
  for (const loop of loops) {
    const coords = loop.map(([x, y]) => [
      padX + (x - minX) * scaleX,
      padY + (y - minY) * scaleY,
    ]);
    if (coords.length < 3) continue;
    segments.push(`M${coords[0][0].toFixed(2)},${coords[0][1].toFixed(2)}${coords.slice(1).map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join("")}Z`);
  }
  return segments.length ? `<path fill="${color}" fill-rule="evenodd" d="${segments.join("")}"/>` : "";
}

const manifest = [];
for (let i = 0; i < sources.length; i++) {
  const [stamp, name] = sources[i];
  const id = `selected-frame-${String(i + 1).padStart(2, "0")}`;
  const inputPath = path.join(inputDir, `image(20261023-${stamp}).png`);
  if (!fs.existsSync(inputPath)) throw new Error(`Missing selected reference: ${inputPath}`);

  let art = "";
  if (stamp === "152709") {
    // Recreate the plain dotted rectangle from the reference without the
    // signature printed beneath its lower edge.
    art = `<rect x="20" y="20" width="960" height="1360" fill="none" stroke="#303238" stroke-width="3.2" stroke-dasharray="0.1 10.5" stroke-linecap="round"/>`;
  } else if (stamp === "153115") {
    // The uploaded source is a crop of one double-line corner. Continue that exact
    // visual language into a complete, square-opening rectangle; discard its shadow.
    art = `<g fill="none" stroke="#303238" stroke-linecap="square" stroke-linejoin="miter"><rect x="20" y="20" width="960" height="1360" stroke-width="8"/><rect x="42" y="42" width="916" height="1316" stroke-width="5"/></g>`;
  } else {
    const { data, info } = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const baseMask = buildMask(data, info.width, info.height, stamp);
    let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (!baseMask[y * info.width + x]) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < minX || maxY < minY) throw new Error(`No frame ink found in ${inputPath}`);
    const bbox = [minX, minY, maxX + 1, maxY + 1];

    const colors = stamp === "150708" ? ["#88a94d", "#303238"]
      : stamp === "150818" ? ["#d7b444", "#303238"] : ["#303238"];
    for (const color of colors) {
      const layer = new Uint8Array(info.width * info.height);
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const p = y * info.width + x;
        if (!baseMask[p]) continue;
        const i3 = p * 3;
        const pixelColor = classifyPixel(stamp, data[i3], data[i3 + 1], data[i3 + 2]);
        if (pixelColor === color) layer[p] = 1;
      }
      art += loopsToSvg(maskToPath(layer, info.width, info.height), bbox, color);
    }
  }

  if (!art) throw new Error(`Frame ${id} produced empty SVG art`);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1400" viewBox="0 0 1000 1400">${art}</svg>\n`;
  const asset = `/assets/ai-frames/${id}.svg`;
  fs.writeFileSync(path.join(outputDir, `${id}.svg`), svg);
  manifest.push({ id, name, asset, thumbnail: asset, width, height, mime: "image/svg+xml", kind: "frame", accent: "#303238" });
}
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${manifest.length} user-selected transparent SVG frames.`);
