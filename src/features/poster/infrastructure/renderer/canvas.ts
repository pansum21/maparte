import {
  MAX_PIXELS,
  MAX_SIDE,
  MOBILE_MAX_PIXELS,
  MOBILE_MAX_SIDE,
  OUTPUT_DPI,
} from "./constants";
import type { CanvasSize } from "../../domain/types";

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
  );
}

export function resolveCanvasSize(
  widthInches: number,
  heightInches: number,
  targetDpi: number = OUTPUT_DPI,
): CanvasSize {
  const dpi = Math.max(300, targetDpi);
  const requestedWidth = Math.max(1080, Math.round(widthInches * dpi));
  const requestedHeight = Math.max(1080, Math.round(heightInches * dpi));
  const totalPixels = requestedWidth * requestedHeight;

  const isMobile = isMobileDevice();
  const maxPixels = isMobile ? MOBILE_MAX_PIXELS : MAX_PIXELS;
  const maxSide = isMobile ? MOBILE_MAX_SIDE : MAX_SIDE;

  const areaFactor =
    totalPixels > maxPixels ? Math.sqrt(maxPixels / totalPixels) : 1;
  const sideFactor =
    Math.max(requestedWidth, requestedHeight) > maxSide
      ? maxSide / Math.max(requestedWidth, requestedHeight)
      : 1;

  const factor = Math.min(areaFactor, sideFactor, 1);
  const width = Math.max(600, Math.round(requestedWidth * factor));
  const height = Math.max(600, Math.round(requestedHeight * factor));

  return {
    width,
    height,
    requestedWidth,
    requestedHeight,
    downscaleFactor: factor,
  };
}
