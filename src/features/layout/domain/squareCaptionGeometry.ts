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
  variant: "center-bottom" | "left-bottom" | "right-bottom" | "top-left" | "top-center" | "bottom-left";
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
  variant: SquareCaptionGeometry["variant"] = "center-bottom",
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
    if (variant === "top-center") {
      const topBandHeight = (1 - CIRCLE_POSTER_MAP_BLOCK) * posterHeight;
      const creditBand = 0.04 * posterHeight;
      slot = Math.min(posterWidth - safeInsetX * 2, (posterHeight - topBandHeight) - safeInsetY * 0.4);
      slotX = (posterWidth - slot) / 2;
      slotY = topBandHeight + (posterHeight - topBandHeight - safeInsetY - slot) / 2;
      textBox = {
        x: safeInsetX,
        y: safeInsetY,
        w: posterWidth - safeInsetX * 2,
        h: Math.max(1, topBandHeight - safeInsetY - creditBand),
      };
      align = requestedAlign ?? "center";
    } else {
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
    }
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
    variant: !isLandscape && variant === "top-center" ? "top-center" : "center-bottom",
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
  variant: SquareCaptionGeometry["variant"] = "center-bottom",
): SquareCaptionGeometry {
  if (posterStyle) {
    return getCirclePosterGeometry(
      posterWidth, posterHeight, widthCm, heightCm, mapInsetCm, gapCm, textSide, requestedAlign, variant,
    );
  }
  const isLandscape = widthCm > heightCm;
  const base = getSquareCaptionGeometry(
    posterWidth, posterHeight, widthCm, heightCm, mapInsetCm, gapCm,
    variant, requestedAlign, textSide,
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
  textSide: "left" | "right" = "right",
): SquareCaptionGeometry {
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const pxPerCmY = posterHeight / Math.max(1, heightCm);
  const isLandscape = widthCm > heightCm;

  // Margin is at least 1.5 cm, and respects neatline border inset + gap
  const effectiveGapCm = Math.max(0.15, gapCm || 0.15);
  const baseMarginCm = Math.max(1.0, mapInsetCm + effectiveGapCm);
  const safeInsetX = baseMarginCm * pxPerCmX;
  const safeInsetY = baseMarginCm * pxPerCmY;

  const topCaption = variant === "top-left" || variant === "top-center";
  const bottomCorner = variant === "bottom-left";

  if (!isLandscape) {
    // ── PORTRAIT OR SQUARE (e.g. A4 Portrait: 21 x 29.7 cm) ──
    const availableWidth = Math.max(1, posterWidth - safeInsetX * 2);
    const availableHeight = Math.max(1, posterHeight - safeInsetY * 2);
    // Height reserved for caption block (City, divider, country, coords, credits)
    const captionHeight = (variant === "top-left" || bottomCorner ? 4.2 : 7.6) * pxPerCmY;

    // Size is the available width (e.g. 18cm on A4 with 1.5cm margins)
    const maxSquareHeight = availableHeight - captionHeight;
    const size = Math.min(availableWidth, maxSquareHeight);

    const x = (posterWidth - size) / 2;
    const isCornerDetail = variant === "top-left" || bottomCorner;
    // For corner details, the square map is centered vertically and horizontally inside the poster borders!
    const y = isCornerDetail
      ? safeInsetY + (availableHeight - size) / 2
      : topCaption
        ? posterHeight - safeInsetY - size
        : safeInsetY;

    // Center the caption block vertically in the allocated white band
    const mapBottom = y + size;
    const contentBottom = posterHeight - safeInsetY;
    const lowerAreaHeight = contentBottom - mapBottom;
    const lowerCenterY = mapBottom + lowerAreaHeight / 2;
    const lineStep = posterHeight * 0.042;

    let captionY: number;
    let captionWidth: number;
    let captionAlign: "left" | "center" | "right";

    if (variant === "top-left") {
      captionY = safeInsetY + (y - safeInsetY) / 2;
      captionWidth = availableWidth * 0.74;
      captionAlign = "left";
    } else if (variant === "top-center") {
      captionY = safeInsetY + (y - safeInsetY) / 2 - lineStep * 0.2;
      captionWidth = availableWidth;
      captionAlign = requestedAlign ?? "center";
    } else if (bottomCorner) {
      captionY = mapBottom + lowerAreaHeight / 2;
      captionWidth = availableWidth * 0.74;
      captionAlign = "left";
    } else {
      captionY = lowerCenterY - lineStep * 0.85;
      captionWidth = availableWidth;
      captionAlign = requestedAlign ?? (variant === "left-bottom"
        ? "left"
        : variant === "right-bottom"
          ? "right"
          : "center");
    }

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
      textSide: "right",
    };
  } else {
    // ── LANDSCAPE (e.g. A4 Landscape: 29.7 x 21 cm) ──
    const isTextLeft = textSide === "left";
    const size = Math.max(1, posterHeight - safeInsetY * 2);
    const x = isTextLeft ? posterWidth - safeInsetX - size : safeInsetX;
    const y = safeInsetY;

    const captionXStart = isTextLeft ? safeInsetX : x + size + 1.2 * pxPerCmX;
    const captionWidth = Math.max(1, isTextLeft ? x - 1.2 * pxPerCmX - captionXStart : posterWidth - safeInsetX - captionXStart);

    // Corner details sit at the top or bottom of the side column; center-bottom is centered vertically
    const isTopCorner = variant === "top-left";
    const isBottomCorner = variant === "bottom-left";

    let captionY: number;
    if (isTopCorner) {
      captionY = safeInsetY + 1.2 * pxPerCmY;
    } else if (isBottomCorner) {
      captionY = posterHeight - safeInsetY - 4.5 * pxPerCmY;
    } else {
      captionY = y + size / 2 - 1.6 * pxPerCmY;
    }

    const captionAlign = requestedAlign ?? (isTopCorner || isBottomCorner || variant === "left-bottom" || isTextLeft
      ? "left"
      : variant === "right-bottom"
        ? "right"
        : "center");

    const captionX = captionAlign === "left"
      ? captionXStart
      : captionAlign === "right"
        ? captionXStart + captionWidth
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
      textSide: isTextLeft ? "left" : "right",
    };
  }
}

export interface DoubleMapSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Square diameter retained for circle and heart clip paths. */
  size: number;
}

export interface DoubleMapGeometry {
  posterWidth: number;
  posterHeight: number;
  safeInsetX: number;
  safeInsetY: number;
  shape: "square" | "circle" | "heart" | "rectangle";
  slots: DoubleMapSlot[];
  /** Caption region paired with each map slot (beside portrait maps, below landscape maps). */
  textBoxes: { x: number; y: number; w: number; h: number }[];
  captionAlign: "left" | "center" | "right";
}

/** Name block height as a share of the poster height (below each map). */
export const DOUBLE_NAME_BAND = 0.2;

/**
 * Computes equal map slots and their matching caption boxes. Portrait compositions
 * place the caption beside each map; landscape compositions place it below.
 */
export function getDoubleMapGeometry(
  posterWidth: number,
  posterHeight: number,
  widthCm: number,
  heightCm: number,
  mapInsetCm: number,
  gapCm: number,
  shape: "square" | "circle" | "heart" | "rectangle",
  requestedAlign?: "left" | "center" | "right",
  count = 2,
  captionSide: "left" | "right" = "right",
  minimumInsetCm = 0,
): DoubleMapGeometry {
  const pxPerCmX = posterWidth / Math.max(1, widthCm);
  const pxPerCmY = posterHeight / Math.max(1, heightCm);
  const minDim = Math.min(posterWidth, posterHeight);
  const safeInsetX = Math.max(0.035 * minDim, Math.max(minimumInsetCm, mapInsetCm + (gapCm || 0)) * pxPerCmX);
  const safeInsetY = Math.max(0.035 * minDim, Math.max(minimumInsetCm, mapInsetCm + (gapCm || 0)) * pxPerCmY);
  const vertical = posterHeight > posterWidth;
  const total = Math.max(1, Math.min(3, Math.floor(count)));
  const gap = 0.025 * (vertical ? posterHeight : posterWidth);
  const usableW = Math.max(1, posterWidth - safeInsetX * 2);
  const usableH = Math.max(1, posterHeight - safeInsetY * 2);
  const captionShare = 0.5;
  const bandH = DOUBLE_NAME_BAND * posterHeight;
  const cellW = vertical ? usableW : (usableW - gap * (total - 1)) / total;
  const cellH = vertical ? (usableH - gap * (total - 1)) / total : usableH;
  const mapCellW = vertical ? (usableW - gap) * (1 - captionShare) : cellW;
  const mapCellH = vertical ? cellH : Math.max(1, usableH - bandH);
  const slots: DoubleMapSlot[] = [];
  const textBoxes: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < total; i += 1) {
    if (vertical) {
      const rowTop = safeInsetY + i * (cellH + gap);
      const mapX = captionSide === "right" ? safeInsetX : safeInsetX + mapCellW + gap;
      const textX = captionSide === "right" ? safeInsetX + mapCellW + gap : safeInsetX;
      const textW = Math.max(1, usableW - mapCellW - gap);
      const width = shape === "rectangle" ? mapCellW : Math.min(mapCellW, cellH);
      const height = shape === "rectangle" ? cellH : width;
      const x = mapX + (mapCellW - width) / 2;
      const y = rowTop + (cellH - height) / 2;
      slots.push({ x, y, width, height, size: Math.min(width, height) });
      textBoxes.push({ x: textX, y: rowTop, w: textW, h: cellH });
    } else {
      const cellX = safeInsetX + i * (cellW + gap);
      const width = shape === "rectangle" ? cellW : Math.min(cellW, mapCellH);
      const height = shape === "rectangle" ? mapCellH : width;
      const x = cellX + (cellW - width) / 2;
      const y = safeInsetY + (mapCellH - height) / 2;
      slots.push({ x, y, width, height, size: Math.min(width, height) });
      textBoxes.push({ x: cellX, y: safeInsetY + mapCellH, w: cellW, h: Math.max(1, usableH - mapCellH) });
    }
  }
  return {
    posterWidth,
    posterHeight,
    safeInsetX,
    safeInsetY,
    shape,
    slots,
    textBoxes,
    captionAlign: requestedAlign ?? "center",
  };
}

/** Caption geometry of one map of a double layout, for the shared name block layout. */
export function doubleSlotCaptionGeometry(g: DoubleMapGeometry, index: number): SquareCaptionGeometry {
  const slot = g.slots[index];
  const box = g.textBoxes[index];
  const captionX = g.captionAlign === "left" ? box.x : g.captionAlign === "right" ? box.x + box.w : box.x + box.w / 2;
  return {
    posterWidth: g.posterWidth,
    posterHeight: g.posterHeight,
    x: slot.x,
    y: slot.y,
    size: slot.size,
    safeInsetX: g.safeInsetX,
    safeInsetY: g.safeInsetY,
    captionX,
    captionY: box.y,
    captionWidth: box.w,
    captionXStart: box.x,
    captionAlign: g.captionAlign,
    variant: "center-bottom",
    shape: g.shape === "circle" || g.shape === "heart" ? "circle" : "square",
    posterStyle: true,
    textBox: box,
  };
}
