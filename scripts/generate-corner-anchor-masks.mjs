import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const borderDir = path.join(root, 'public/assets/borders');
const output = {};
const size = 64;
for (let i = 1; i <= 12; i++) {
  const id = `corner-${String(i).padStart(2, '0')}`;
  const svg = fs.readFileSync(path.join(borderDir, `${id}.svg`));
  output[id] = {};
  for (const rotation of [0, 90, 180, 270]) {
    const { data, info } = await sharp(svg).rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(size, size, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rows = Array(size).fill(null); const columns = Array(size).fill(null);
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
      const row = rows[y] ?? [x, x]; row[0] = Math.min(row[0], x); row[1] = Math.max(row[1], x); rows[y] = row;
      const column = columns[x] ?? [y, y]; column[0] = Math.min(column[0], y); column[1] = Math.max(column[1], y); columns[x] = column;
    }
    output[id][rotation] = { rows, columns };
  }
}
fs.writeFileSync(path.join(root, 'src/features/layout/ui/cornerAnchorMasks.json'), `${JSON.stringify({ size, assets: output })}\n`);
console.log(`Generated alpha-edge anchors for ${Object.keys(output).length} corner vectors at ${size}×${size}.`);
