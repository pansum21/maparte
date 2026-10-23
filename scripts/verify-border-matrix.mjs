import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/layouts.json'), 'utf8'));
const lineIds = ['neatline-single', 'neatline-double', 'neatline-triple', 'neatline-dashed', 'neatline-dotted', 'neatline-double-dotted'];
const cornerIds = Array.from({ length: 12 }, (_, i) => `border-corner-${String(i + 1).padStart(2, '0')}`);
const positions = ['all', 'top', 'bottom', 'left', 'right', 'diagonal-a', 'diagonal-b', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
const placementCorners = {
  all: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  top: ['top-left', 'top-right'], bottom: ['bottom-left', 'bottom-right'],
  left: ['top-left', 'bottom-left'], right: ['top-right', 'bottom-right'],
  'diagonal-a': ['top-left', 'bottom-right'], 'diagonal-b': ['top-right', 'bottom-left'],
  'top-left': ['top-left'], 'top-right': ['top-right'], 'bottom-left': ['bottom-left'], 'bottom-right': ['bottom-right'],
};
function strokeCount(lineId) {
  return ({ 'neatline-double': 2, 'neatline-double-dotted': 2, 'neatline-triple': 3 }[lineId] ?? 1);
}
function thicknessCases(lineId) {
  const count = strokeCount(lineId);
  const cases = [{}];
  for (let mask = 0; mask < 2 ** count; mask++) {
    cases.push({ [lineId]: Array.from({ length: count }, (_, index) => mask & (1 << index) ? 5 : 0.5) });
  }
  return cases;
}
const combinations = [];
for (const lineId of lineIds) for (const thicknesses of thicknessCases(lineId)) combinations.push({ lineId, cornerId: 'none', cornerPosition: 'all', thicknesses });
for (const lineId of lineIds) for (const cornerId of cornerIds) for (const cornerPosition of positions) {
  for (const thicknesses of thicknessCases(lineId)) combinations.push({ lineId, cornerId, cornerPosition, thicknesses });
}
for (const cornerId of cornerIds) for (const cornerPosition of positions) combinations.push({ lineId: 'none', cornerId, cornerPosition });

const vite = await createServer({ root, configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const summary = [];
try {
  const { NeatlineArtwork, getPosterBorderMetrics } = await vite.ssrLoadModule('/src/features/layout/ui/NeatlinePicker.tsx');
  let failures = 0;
  let total = 0;
  for (const category of manifest.categories) for (const layout of category.layouts) {
    const widthCm = String(layout.posterWidthCm ?? layout.width);
    const heightCm = String(layout.posterHeightCm ?? layout.height);
    const metrics = getPosterBorderMetrics(widthCm, heightCm);
    const layoutFailures = [];
    let minCornerCm = Infinity;
    let maxCornerCm = 0;
    let maxJoinGapCm = 0;
    for (const selection of combinations) {
      total++;
      const markup = renderToStaticMarkup(React.createElement(NeatlineArtwork, {
        selection: { ...selection, thicknesses: selection.thicknesses ?? {}, lineVariant: 'plain', cornerVariant: 'plain' }, widthCm, heightCm,
      }));
      const hasLine = selection.lineId !== 'none';
      const hasCorner = selection.cornerId !== 'none';
      const expectedStrokeCount = hasLine ? strokeCount(selection.lineId) : 0;
      const paths = [...markup.matchAll(/<path\b[^>]*d="([^"]+)"/g)];
      const images = [...markup.matchAll(/<image\b[^>]*href="([^"]+)"[^>]*x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
      const activeCorners = hasCorner ? placementCorners[selection.cornerPosition] : [];
      const expectedPaths = expectedStrokeCount * 4;
      if (paths.length !== expectedPaths) layoutFailures.push(`${selection.lineId}/${selection.cornerId}/${selection.cornerPosition}: ${paths.length}/${expectedPaths} line edges`);
      if (images.length !== activeCorners.length) layoutFailures.push(`${selection.lineId}/${selection.cornerId}/${selection.cornerPosition}: ${images.length}/${activeCorners.length} corner assets`);
      const view = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const viewW = Number(view?.[1]); const viewH = Number(view?.[2]);
      for (const [, href, x, y, w, h] of images) {
        if (!fs.existsSync(path.join(root, 'public', href.replace(/^\//, '')))) layoutFailures.push(`${selection.cornerId}: missing asset ${href}`);
        if (+x < 0 || +y < 0 || +x + +w > viewW + 0.01 || +y + +h > viewH + 0.01) layoutFailures.push(`${selection.cornerId}: art clips outside canvas`);
        const sizeCm = (+w * metrics.usableWidthCm) / 1000;
        if (sizeCm <= 0) layoutFailures.push(`${selection.cornerId}: corner art has zero size`);
        minCornerCm = Math.min(minCornerCm, sizeCm);
        maxCornerCm = Math.max(maxCornerCm, sizeCm);
      }
      for (const [, d] of paths) {
        const points = [...d.matchAll(/[ML] ([\d.]+) ([\d.]+)/g)];
        if (points.length < 2 || points.some(([, x, y]) => +x < 0 || +x > viewW || +y < 0 || +y > viewH)) layoutFailures.push(`${selection.lineId}: invalid or clipped line geometry`);
      }
      for (const [, gaps] of markup.matchAll(/data-join-gaps="([\d.,]*)"/g)) {
        for (const gap of gaps.split(',').filter(Boolean).map(Number)) maxJoinGapCm = Math.max(maxJoinGapCm, gap * metrics.usableWidthCm / 1000);
      }
      if (hasLine && hasCorner) {
        const edgeCorners = [
          ['top-left', 'top-right'], ['bottom-left', 'bottom-right'],
          ['top-left', 'bottom-left'], ['top-right', 'bottom-right'],
        ];
        for (let index = 0; index < paths.length; index++) {
          const pointCount = [...paths[index][1].matchAll(/[ML] ([\d.]+) ([\d.]+)/g)].length;
          const cornerCount = edgeCorners[index % 4].filter((name) => activeCorners.includes(name)).length;
          const dashed = ['neatline-dashed', 'neatline-dotted', 'neatline-double-dotted'].includes(selection.lineId);
          const expected = dashed && cornerCount === 2 ? 6 : 2 + cornerCount;
          if (pointCount !== expected) layoutFailures.push(`${selection.lineId}/${selection.cornerId}/${selection.cornerPosition}: join path has ${pointCount}, expected ${expected} points`);
        }
      }
    }
    const unique = [...new Set(layoutFailures)];
    failures += unique.length;
    summary.push({ id: layout.id, category: category.name, tested: combinations.length, failures: unique.length, gapCm: metrics.gapCm,
      cornerSizeCm: [Number(minCornerCm.toFixed(3)), Number(maxCornerCm.toFixed(3))], maxJoinGapCm: Number(maxJoinGapCm.toFixed(3)), details: unique.slice(0, 3) });
  }
  const result = { combinations: total, layouts: summary.length, failures, layoutsReport: summary };
  console.log(JSON.stringify(result, null, 2));
  if (total !== 100256 || summary.length !== 26 || failures > 0) process.exitCode = 1;
} finally {
  await vite.close();
}
