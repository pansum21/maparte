/**
 * Heart outline on a unit square (0..1 on both axes). The preview clips the map
 * window with it and the PNG export draws the same curve, so both match.
 */
export const HEART_PATH_UNIT =
  "M 0.5 0.95 C 0.15 0.68 0.02 0.5 0.02 0.3 C 0.02 0.14 0.15 0.03 0.29 0.03 " +
  "C 0.39 0.03 0.46 0.09 0.5 0.17 C 0.54 0.09 0.61 0.03 0.71 0.03 " +
  "C 0.85 0.03 0.98 0.14 0.98 0.3 C 0.98 0.5 0.85 0.68 0.5 0.95 Z";

/** Heart as a Path2D placed on a square at (x, y) with the given size. */
export function heartPath2D(x: number, y: number, size: number): Path2D {
  const path = new Path2D(HEART_PATH_UNIT);
  const scaled = new Path2D();
  scaled.addPath(path, new DOMMatrix([size, 0, 0, size, x, y]));
  return scaled;
}
