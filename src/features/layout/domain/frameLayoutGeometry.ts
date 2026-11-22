export type FrameLayoutId =
  | "classic"
  | "left"
  | "right"
  | "center"
  | "dark"
  | "box"
  | "title"
  | "full-map";

export interface FrameLayoutGeometry {
  posterWidth: number;
  posterHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  safeInsetX: number;
  safeInsetY: number;
  captionX: number;
  captionY: number;
  captionWidth: number;
  captionAlign: "left" | "center" | "right";
  captionHeight: number;
  style: FrameLayoutId;
}

/**
 * Builds a proportional paper composition. The map window keeps the poster's
 * physical aspect ratio available to it (no square crop), while the paper
 * margin and title band scale with the selected print size and orientation.
 */
export function getFrameLayoutGeometry(
  posterWidth: number,
  posterHeight: number,
  widthCm: number,
  heightCm: number,
  mapInsetCm: number,
  gapCm: number,
  style: FrameLayoutId,
): FrameLayoutGeometry {
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const pxPerCmY = posterHeight / Math.max(1, heightCm);
  const safeInsetCm = Math.max(0.35, mapInsetCm - gapCm + 0.35);
  const safeInsetX = safeInsetCm * pxPerCmX;
  const safeInsetY = safeInsetCm * pxPerCmY;
  const innerWidth = Math.max(1, posterWidth - safeInsetX * 2);
  const innerHeight = Math.max(1, posterHeight - safeInsetY * 2);
  const fullBleed = style === "full-map" || style === "box";
  const box = style === "box";
  const boxHeight = Math.min(innerHeight * 0.14, 5.2 * pxPerCmY);
  const captionHeight = fullBleed && !box ? 0 : box ? boxHeight : Math.min(innerHeight * 0.245, 7.1 * pxPerCmY);
  const mapX = fullBleed ? 0 : safeInsetX;
  const mapY = fullBleed ? 0 : safeInsetY;
  const mapWidth = fullBleed ? posterWidth : innerWidth;
  const mapHeight = fullBleed ? posterHeight : Math.max(1, innerHeight - captionHeight);
  const captionAlign = style === "left" ? "left" : style === "right" ? "right" : "center";
  const captionWidth = box ? Math.min(innerWidth * 0.76, 14 * pxPerCmX) : innerWidth;
  const captionX = captionAlign === "left"
    ? safeInsetX
    : captionAlign === "right"
      ? posterWidth - safeInsetX
      : posterWidth / 2;
  const captionY = box
    ? posterHeight - safeInsetY - 1.2 * pxPerCmY - boxHeight / 2
    : mapY + mapHeight + Math.max(0.35 * pxPerCmY, captionHeight * 0.18);

  return {
    posterWidth,
    posterHeight,
    x: mapX,
    y: mapY,
    width: mapWidth,
    height: mapHeight,
    safeInsetX,
    safeInsetY,
    captionX,
    captionY,
    captionWidth,
    captionAlign,
    captionHeight,
    style,
  };
}

