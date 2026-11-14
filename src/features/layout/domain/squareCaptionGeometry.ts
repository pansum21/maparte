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
): SquareCaptionGeometry {
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const pxPerCmY = posterHeight / Math.max(1, heightCm);
  const innerBorderEdgeCm = Math.max(0, mapInsetCm - gapCm);
  const safeInsetCm = innerBorderEdgeCm + 0.5;
  const safeInsetX = safeInsetCm * pxPerCmX;
  const safeInsetY = safeInsetCm * pxPerCmY;
  const availableWidth = Math.max(1, posterWidth - safeInsetX * 2);
  const availableHeight = Math.max(1, posterHeight - safeInsetY * 2);
  // Keep at least 7 cm at the bottom for the editable caption and two credits.
  const captionHeight = 7 * pxPerCmY;
  const size = Math.min(availableWidth, availableHeight - captionHeight);

  return {
    posterWidth,
    posterHeight,
    x: (posterWidth - size) / 2,
    y: safeInsetY,
    size,
    safeInsetX,
    safeInsetY,
  };
}
