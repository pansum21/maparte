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
  captionAlign: "left" | "center" | "right";
  variant: "center-bottom" | "left-bottom" | "right-bottom" | "top-left";
}

/**
 * Calculates exact, scale-independent geometry for square map and caption layouts.
 * Enforces clean 1.5 cm safe margins from poster edges or custom neatline insets.
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
  const isLandscape = widthCm > heightCm;

  // Margin is at least 1.5 cm, or larger if user chose a thicker border inset
  const baseMarginCm = Math.max(1.5, mapInsetCm);
  const safeInsetX = baseMarginCm * pxPerCmX;
  const safeInsetY = baseMarginCm * pxPerCmY;

  const topCaption = variant === "top-left";

  if (!isLandscape) {
    // ── PORTRAIT OR SQUARE (e.g. A4 Portrait: 21 x 29.7 cm) ──
    const availableWidth = Math.max(1, posterWidth - safeInsetX * 2);
    // Height reserved for caption block (City, divider, country, coords, credits)
    const captionHeight = (topCaption ? 3.8 : 7.2) * pxPerCmY;
    const captionGap = 0.9 * pxPerCmY;

    // Size is the available width (18cm on A4 with 1.5cm margins)
    const maxSquareHeight = posterHeight - safeInsetY * 2 - captionHeight;
    const size = Math.min(availableWidth, maxSquareHeight);

    const x = (posterWidth - size) / 2;
    const y = topCaption ? safeInsetY + captionHeight + captionGap : safeInsetY;

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
      captionAlign,
      variant,
    };
  } else {
    // ── LANDSCAPE (e.g. A4 Landscape: 29.7 x 21 cm) ──
    // In landscape, height is 21 cm -> square map is 18 x 18 cm on left, caption on right
    const size = Math.max(1, posterHeight - safeInsetY * 2);
    const x = safeInsetX;
    const y = safeInsetY;

    const captionXStart = x + size + 1.2 * pxPerCmX;
    const captionWidth = Math.max(1, posterWidth - safeInsetX - captionXStart);
    const captionY = y + size * 0.35; // vertically centered in right column
    const captionAlign = variant === "right-bottom" ? "right" : "left";
    const captionX = captionAlign === "right" ? posterWidth - safeInsetX : captionXStart;

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
      captionAlign,
      variant,
    };
  }
}
