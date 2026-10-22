export interface ExportRenderTile {
  /** Position of the non-overlapping core in the final poster. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Expanded render surface position in the final poster. */
  renderX: number;
  renderY: number;
  renderWidth: number;
  renderHeight: number;
  /** Crop rectangle inside the expanded render surface. */
  sourceX: number;
  sourceY: number;
}

/**
 * Splits a print canvas into WebGL-safe tiles. Small overlaps keep strokes and
 * antialiasing stable at tile edges; only each tile's core is copied to output.
 */
export function buildExportRenderTiles(
  width: number,
  height: number,
  maxSide: number,
  overlap = 8,
): ExportRenderTile[] {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const sideLimit = Math.max(1, Math.floor(maxSide));
  const safeOverlap = Math.max(0, Math.min(Math.floor(overlap), Math.floor((sideLimit - 1) / 4)));
  const coreSide = Math.max(1, sideLimit - safeOverlap * 2);
  const tiles: ExportRenderTile[] = [];

  for (let y = 0; y < safeHeight; y += coreSide) {
    for (let x = 0; x < safeWidth; x += coreSide) {
      const tileWidth = Math.min(coreSide, safeWidth - x);
      const tileHeight = Math.min(coreSide, safeHeight - y);
      const renderX = Math.max(0, x - safeOverlap);
      const renderY = Math.max(0, y - safeOverlap);
      const renderRight = Math.min(safeWidth, x + tileWidth + safeOverlap);
      const renderBottom = Math.min(safeHeight, y + tileHeight + safeOverlap);

      tiles.push({
        x,
        y,
        width: tileWidth,
        height: tileHeight,
        renderX,
        renderY,
        renderWidth: renderRight - renderX,
        renderHeight: renderBottom - renderY,
        sourceX: x - renderX,
        sourceY: y - renderY,
      });
    }
  }

  return tiles;
}
