import { MAX_PIXELS, MAX_SIDE, OUTPUT_DPI } from "./constants";
import type { CanvasSize } from "../../domain/types";

export interface CanvasLimits {
  maxPixels: number;
  maxSide: number;
}

export function getCanvasLimits(): CanvasLimits {
  return { maxPixels: MAX_PIXELS, maxSide: MAX_SIDE };
}

export function resolveCanvasSize(
  widthInches: number,
  heightInches: number,
  targetDpi: number = OUTPUT_DPI,
  limits: CanvasLimits = getCanvasLimits(),
): CanvasSize {
  const safeWidthInches = Number.isFinite(widthInches) && widthInches > 0 ? widthInches : 1;
  const safeHeightInches = Number.isFinite(heightInches) && heightInches > 0 ? heightInches : 1;
  const dpi = Number.isFinite(targetDpi) && targetDpi > 0 ? targetDpi : OUTPUT_DPI;
  const requestedWidth = Math.max(1, Math.floor(safeWidthInches * dpi));
  const requestedHeight = Math.max(1, Math.floor(safeHeightInches * dpi));
  const totalPixels = requestedWidth * requestedHeight;
  const maxPixels = Math.max(1, limits.maxPixels);
  const maxSide = Math.max(1, limits.maxSide);

  const areaFactor =
    totalPixels > maxPixels ? Math.sqrt(maxPixels / totalPixels) : 1;
  const sideFactor =
    Math.max(requestedWidth, requestedHeight) > maxSide
      ? maxSide / Math.max(requestedWidth, requestedHeight)
      : 1;

  let factor = Math.min(areaFactor, sideFactor, 1);
  let width = Math.max(1, Math.round(requestedWidth * factor));
  let height = Math.max(1, Math.round(requestedHeight * factor));
  while (width * height > maxPixels || Math.max(width, height) > maxSide) {
    factor *= 0.999;
    width = Math.max(1, Math.floor(requestedWidth * factor));
    height = Math.max(1, Math.floor(requestedHeight * factor));
  }

  return {
    width,
    height,
    requestedWidth,
    requestedHeight,
    downscaleFactor: factor,
    requestedDpi: dpi,
    effectiveDpiX: width / safeWidthInches,
    effectiveDpiY: height / safeHeightInches,
    effectiveDpi: Math.floor(Math.min(width / safeWidthInches, height / safeHeightInches)),
  };
}
