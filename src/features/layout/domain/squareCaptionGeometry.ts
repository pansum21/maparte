export interface SquareCaptionGeometry {
  /** Full poster pixel dimensions. */
  posterWidth: number;
  posterHeight: number;
  /** Square map placement in full poster pixels. */
  x: number;
  y: number;
  size: number;
  /** Keep the credit baseline 5 mm inside the innermost border. */
  safeInsetX: number;
  safeInsetY: number;
  captionX: number;
  captionY: number;
  captionWidth: number;
  captionAlign: "left" | "center" | "right";
  variant: "center-bottom" | "left-bottom" | "right-bottom" | "top-left";
}

/**
 * Adds a 5 mm clear zone inside the inner edge of the selected frame.
 * Border thickness is already part of mapInsetCm - gapCm, so increasing the
 * border moves this layout's map and footer credits inward together.
 */
export function getSquareCaptionGeometry(
  posterWidth: number,
  posterHeight: number,
  widthCm: number,
  heightCm: number,
  mapInsetCm: number,
  gapCm: number,
  variant: SquareCaptionGeometry["variant"] = "center-bottom",
): SquareCaptionGeometry {
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const pxPerCmY = posterHeight / Math.max(1, heightCm);
  const innerBorderEdgeCm = Math.max(0, mapInsetCm - gapCm);
  const safeInsetCm = innerBorderEdgeCm + 0.5;
  const safeInsetX = safeInsetCm * pxPerCmX;
  const safeInsetY = safeInsetCm * pxPerCmY;
  const availableWidth = Math.max(1, posterWidth - safeInsetX * 2);
  const availableHeight = Math.max(1, posterHeight - safeInsetY * 2);
  const topCaption = variant === "top-left";
  // Reserve room for the editable caption below the map, or above it for the
  // corner details treatment. Brand credit stays in its own 5 mm safe zone.
  const captionHeight = (topCaption ? 3.6 : 7) * pxPerCmY;
  const captionGap = 0.35 * pxPerCmY;
  const y = topCaption ? safeInsetY + captionHeight + captionGap : safeInsetY;
  const mapBottomLimit = posterHeight - safeInsetY - (topCaption ? 0 : captionHeight);
  const size = Math.min(availableWidth, mapBottomLimit - y);
  const captionY = topCaption
    ? safeInsetY + 0.9 * pxPerCmY
    : y + size + captionGap;
  const captionWidth = topCaption ? availableWidth * 0.74 : availableWidth;
  const captionAlign = variant === "left-bottom" || topCaption
    ? "left"
    : variant === "right-bottom"
      ? "right"
      : "center";
  const captionX = captionAlign === "left"
    ? safeInsetX
    : captionAlign === "right"
      ? posterWidth - safeInsetX
      : posterWidth / 2;

  return {
    posterWidth,
    posterHeight,
    x: (posterWidth - size) / 2,
    y,
    size,
    safeInsetX,
    safeInsetY,
    captionX,
    captionY,
    captionWidth,
    captionAlign,
    variant,
  };
}
