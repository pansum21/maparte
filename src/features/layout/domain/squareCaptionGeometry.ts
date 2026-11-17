export interface SquareCaptionGeometry {
  /** Full poster pixel dimensions. */
  posterWidth: number;
  posterHeight: number;
  /** Square map placement in full poster pixels. */
  x: number;
  y: number;
  size: number;
  /** Keep the credit baseline 0.2 mm inside the innermost border. */
  safeInsetX: number;
  safeInsetY: number;
  captionX: number;
  captionY: number;
  captionWidth: number;
  captionXStart: number;
  captionAlign: "left" | "center" | "right";
  variant: "center-bottom" | "left-bottom" | "right-bottom" | "top-left";
}

/**
 * Calculates exact, scale-independent geometry for square map and caption layouts.
 * Enforces clean 1.5 cm safe margins from poster edges or custom neatline insets,
 * and guarantees balanced vertical and horizontal centering of the caption typography.
 */
export function getSquareCaptionGeometry(
  posterWidth: number,
  posterHeight: number,
  widthCm: number,
  heightCm: number,
  mapInsetCm: number,
  gapCm: number,
  variant: SquareCaptionGeometry["variant"] = "center-bottom",
  requestedAlign?: "left" | "center" | "right",
): SquareCaptionGeometry {
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const pxPerCmY = posterHeight / Math.max(1, heightCm);
  const isLandscape = widthCm > heightCm;

  // Margin is at least 1.5 cm, and respects neatline border inset + gap
  const effectiveGapCm = Math.max(0.15, gapCm || 0.15);
  const baseMarginCm = Math.max(1.5, mapInsetCm + effectiveGapCm);
  const safeInsetX = baseMarginCm * pxPerCmX;
  const safeInsetY = baseMarginCm * pxPerCmY;

  const topCaption = variant === "top-left";

  if (!isLandscape) {
    // ── PORTRAIT OR SQUARE (e.g. A4 Portrait: 21 x 29.7 cm) ──
    const availableWidth = Math.max(1, posterWidth - safeInsetX * 2);
    // Height reserved for caption block (City, divider, country, coords, credits)
    const captionHeight = (topCaption ? 4.2 : 7.6) * pxPerCmY;

    // Size is the available width (e.g. 18cm on A4 with 1.5cm margins)
    const maxSquareHeight = posterHeight - safeInsetY * 2 - captionHeight;
    const size = Math.min(availableWidth, maxSquareHeight);

    const x = (posterWidth - size) / 2;
    // Map is at top (or bottom if corner caption)
    const y = topCaption ? posterHeight - safeInsetY - size : safeInsetY;

    // Center the caption block vertically in the lower white band
    const mapBottom = y + size;
    const contentBottom = posterHeight - safeInsetY;
    const lowerAreaHeight = contentBottom - mapBottom;
    const lowerCenterY = mapBottom + lowerAreaHeight / 2;
    // .poster-city is translateY(-50%), and coords end at ~1.58 * lineStep
    // Centering the whole block around lowerCenterY gives equal gaps top and bottom
    const lineStep = posterHeight * 0.042;
    const captionY = topCaption
      ? safeInsetY + (y - safeInsetY) / 2
      : lowerCenterY - lineStep * 0.85;

    const captionWidth = topCaption ? availableWidth * 0.74 : availableWidth;
    const captionAlign = topCaption
      ? "left"
      : requestedAlign ?? (variant === "left-bottom"
        ? "left"
        : variant === "right-bottom"
          ? "right"
          : "center");

    const captionX = captionAlign === "left"
      ? x
      : captionAlign === "right"
        ? x + size
        : posterWidth / 2;

    return {
      posterWidth,
      posterHeight,
      x,
      y,
      size,
      safeInsetX,
      safeInsetY,
      captionX,
      captionY,
      captionWidth,
      captionXStart: x,
      captionAlign,
      variant,
    };
  } else {
    // ── LANDSCAPE (e.g. A4 Landscape: 29.7 x 21 cm) ──
    // In landscape, height is 21 cm -> square map is on left, caption in right column
    const size = Math.max(1, posterHeight - safeInsetY * 2);
    const x = safeInsetX;
    const y = safeInsetY;

    const captionXStart = x + size + 1.2 * pxPerCmX;
    const captionWidth = Math.max(1, posterWidth - safeInsetX - captionXStart);

    // Center text vertically in the right column alongside the center of the square map
    const captionY = y + size / 2 - 1.6 * pxPerCmY;

    const captionAlign = requestedAlign ?? (variant === "left-bottom"
      ? "left"
      : variant === "right-bottom"
        ? "right"
        : "center");

    const captionX = captionAlign === "left"
      ? captionXStart
      : captionAlign === "right"
        ? posterWidth - safeInsetX
        : captionXStart + captionWidth / 2;

    return {
      posterWidth,
      posterHeight,
      x,
      y,
      size,
      safeInsetX,
      safeInsetY,
      captionX,
      captionY,
      captionWidth,
      captionXStart,
      captionAlign,
      variant,
    };
  }
}
