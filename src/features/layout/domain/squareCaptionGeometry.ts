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
  /** Map window shape. Circle windows share the exact square slot (x, y, size). */
  shape?: "square" | "circle";
  /** Landscape only: which side the text column sits on. */
  textSide?: "left" | "right";
  /**
   * Poster style circle. x, y and size describe the round map itself; the compass
   * ring, ticks and letters live in the larger overlay slot around it, and the
   * name block is laid out inside `textBox`.
   */
  posterStyle?: boolean;
  overlayX?: number;
  overlayY?: number;
  overlaySize?: number;
  textBox?: { x: number; y: number; w: number; h: number };
}

/** Map diameter as a share of the compass slot (ticks and letters use the rest). */
export const CIRCLE_POSTER_MAP_FRACTION = 0.82;
/** Share of the poster height used by the compass block in portrait (the rest is text). */
export const CIRCLE_POSTER_MAP_BLOCK = 0.7;

/**
 * Poster style circle layout. Portrait: compass block on the top 70 percent, name block
 * in the lower 30 percent. Landscape: compass block on one side, name block on the other.
 */
export function getCirclePosterGeometry(
  posterWidth: number,
  posterHeight: number,
  widthCm: number,
  heightCm: number,
  mapInsetCm: number,
  gapCm: number,
  textSide: "left" | "right" = "right",
  requestedAlign?: "left" | "center" | "right",
): SquareCaptionGeometry {
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const pxPerCmY = posterHeight / Math.max(1, heightCm);
  const isLandscape = widthCm > heightCm;
  const minDim = Math.min(posterWidth, posterHeight);
  const frameMarginX = Math.max(0, mapInsetCm + (gapCm || 0)) * pxPerCmX;
  const frameMarginY = Math.max(0, mapInsetCm + (gapCm || 0)) * pxPerCmY;
  const safeInsetX = Math.max(0.035 * minDim, frameMarginX);
  const safeInsetY = Math.max(0.035 * minDim, frameMarginY);

  let slot: number;
  let slotX: number;
  let slotY: number;
  let textBox: { x: number; y: number; w: number; h: number };
  let align: "left" | "center" | "right";

  if (!isLandscape) {
    const blockBottom = CIRCLE_POSTER_MAP_BLOCK * posterHeight;
    slot = Math.min(posterWidth - safeInsetX * 2, blockBottom - safeInsetY * 0.4);
    slotX = (posterWidth - slot) / 2;
    slotY = blockBottom - slot - safeInsetY * 0.2;
    const top = blockBottom;
    const creditBand = 0.04 * posterHeight;
    textBox = {
      x: safeInsetX,
      y: top,
      w: posterWidth - safeInsetX * 2,
      h: Math.max(1, posterHeight - safeInsetY - creditBand - top),
    };
    align = requestedAlign ?? "center";
  } else {
    slot = posterHeight - safeInsetY * 2;
    slotY = safeInsetY;
    const gap = 0.04 * posterWidth;
    const textW = Math.max(1, posterWidth - safeInsetX * 2 - slot - gap);
    if (textSide === "left") {
      slotX = posterWidth - safeInsetX - slot;
      textBox = { x: safeInsetX, y: safeInsetY, w: textW, h: posterHeight - safeInsetY * 2 - 0.04 * posterHeight };
    } else {
      slotX = safeInsetX;
      textBox = { x: slotX + slot + gap, y: safeInsetY, w: textW, h: posterHeight - safeInsetY * 2 - 0.04 * posterHeight };
    }
    align = requestedAlign ?? "center";
  }

  const mapSize = slot * CIRCLE_POSTER_MAP_FRACTION;
  const captionX = align === "left" ? textBox.x : align === "right" ? textBox.x + textBox.w : textBox.x + textBox.w / 2;
  return {
    posterWidth,
    posterHeight,
    x: slotX + (slot - mapSize) / 2,
    y: slotY + (slot - mapSize) / 2,
    size: mapSize,
    safeInsetX,
    safeInsetY,
    captionX,
    captionY: textBox.y,
    captionWidth: textBox.w,
    captionXStart: textBox.x,
    captionAlign: align,
    variant: "center-bottom",
    shape: "circle",
    textSide: isLandscape ? textSide : "right",
    posterStyle: true,
    overlayX: slotX,
    overlayY: slotY,
    overlaySize: slot,
    textBox,
  };
}

/**
 * Circle layouts reuse the square geometry: the circle is inscribed in the same
 * square slot. In landscape the text column can be mirrored to the left side.
 */
export function getCircleCaptionGeometry(
  posterWidth: number,
  posterHeight: number,
  widthCm: number,
  heightCm: number,
  mapInsetCm: number,
  gapCm: number,
  textSide: "left" | "right" = "right",
  requestedAlign?: "left" | "center" | "right",
  posterStyle = false,
): SquareCaptionGeometry {
  if (posterStyle) {
    return getCirclePosterGeometry(
      posterWidth, posterHeight, widthCm, heightCm, mapInsetCm, gapCm, textSide, requestedAlign,
    );
  }
  const isLandscape = widthCm > heightCm;
  const base = getSquareCaptionGeometry(
    posterWidth, posterHeight, widthCm, heightCm, mapInsetCm, gapCm,
    "center-bottom", requestedAlign,
  );
  if (!isLandscape || textSide === "right") {
    return { ...base, shape: "circle", textSide: "right" };
  }
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const x = posterWidth - base.safeInsetX - base.size;
  const captionXStart = base.safeInsetX;
  const captionWidth = Math.max(1, x - 1.2 * pxPerCmX - captionXStart);
  const captionX = base.captionAlign === "left"
    ? captionXStart
    : base.captionAlign === "right"
      ? captionXStart + captionWidth
      : captionXStart + captionWidth / 2;
  return {
    ...base,
    x,
    captionX,
    captionXStart,
    captionWidth,
    shape: "circle",
    textSide: "left",
  };
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
  const baseMarginCm = Math.max(1.0, mapInsetCm + effectiveGapCm);
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
