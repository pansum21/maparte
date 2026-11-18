import { formatCoordinates } from "@/shared/geo/posterBounds";
import type { Coordinate } from "@/shared/geo/types";
import { APP_CREDIT_URL } from "@/core/config";
import type { SquareCaptionGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import {
  TEXT_DIMENSION_REFERENCE_PX,
  TEXT_CITY_Y_RATIO,
  CITY_FONT_BASE_PX,
  COUNTRY_FONT_BASE_PX,
  COORDS_FONT_BASE_PX,
  ATTRIBUTION_FONT_BASE_PX,
  PHYSICAL_DIVIDER_GAP_MM,
  PHYSICAL_COUNTRY_GAP_MM,
  PHYSICAL_TAGLINE_GAP_MM,
  PHYSICAL_COORDS_GAP_MM,
  resolveCityDisplay,
  computeCityFontScale,
  computeCityLetterSpacing,
  computeAttributionColor,
  ensureContrastTextColor,
  getPosterFontScale,
} from "@/features/poster/domain/textLayout";

export interface DrawPosterTextOptions {
  heightCm?: number;
  widthCm?: number;
  isNarrowBox?: boolean;
  squareCaptionGeometry?: SquareCaptionGeometry;
}

export function drawPosterText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: { ui?: { text?: string }; map?: { land?: string } },
  center: Coordinate,
  city: string,
  country: string,
  fontFamily: string | undefined,
  showPosterText: boolean,
  showOverlay: boolean,
  includeCredits: boolean = true,
  customDate?: string,
  fontSize: number = 16,
  textAlign: CanvasTextAlign = "center",
  options?: DrawPosterTextOptions,
): void {
  const landColor = theme.map?.land || (theme.ui as any)?.bg || "#808080";
  const rawTextColor = theme.ui?.text || "#111111";
  const textColor = ensureContrastTextColor(rawTextColor, landColor);
  const fontScale = getPosterFontScale(fontSize);
  const attributionColor = computeAttributionColor(textColor, landColor, showOverlay);
  const attributionAlpha = showOverlay ? 0.65 : 0.95;

  const cleanFont = (fontFamily || "Times New Roman").replace(/['"]/g, "").trim();
  const isSerif = /serif|times|cormorant|baskerville|lora|merriweather|playfair/i.test(cleanFont);
  const fontFallback = isSerif ? "'Times New Roman', Times, serif" : "'Space Grotesk', sans-serif";
  const titleFontFamily = cleanFont ? `"${cleanFont}", ${fontFallback}` : "'Times New Roman', Times, serif";
  const bodyFontFamily = isSerif ? `"${cleanFont}", 'Times New Roman', Times, serif` : '"IBM Plex Mono", monospace';

  const dimScale = Math.min(width, height) / TEXT_DIMENSION_REFERENCE_PX;
  const squareGeom = options?.squareCaptionGeometry;
  const isSquare = Boolean(squareGeom);
  const isLandscapeSquare = Boolean(isSquare && squareGeom!.posterWidth > squareGeom!.posterHeight);
  const isNarrowBox = options?.isNarrowBox ?? isLandscapeSquare;

  const targetWidth = isSquare
    ? (isLandscapeSquare ? squareGeom!.captionWidth : squareGeom!.size)
    : width;
  const maxContentWidth = targetWidth * 0.92;

  const posterHCm = options?.heightCm || 29.7;
  const pxPerMm = height / (Math.max(1, posterHCm) * 10);
  const gapDividerPx = PHYSICAL_DIVIDER_GAP_MM * pxPerMm; // Strictly 2.5 mm in canvas px!
  const gapCountryPx = PHYSICAL_COUNTRY_GAP_MM * pxPerMm; // Strictly 2.8 mm in canvas px!
  const gapTaglinePx = PHYSICAL_TAGLINE_GAP_MM * pxPerMm; // Strictly 2.4 mm in canvas px!
  const gapCoordsPx = PHYSICAL_COORDS_GAP_MM * pxPerMm; // Strictly 2.4 mm in canvas px!

  if (showPosterText) {
    const aspectRatio = width / Math.max(1, height);
    const cityLayout = resolveCityDisplay(city, aspectRatio, isNarrowBox);
    const cityFontScale = computeCityFontScale(city, cityLayout.lines, isNarrowBox);
    let cityFontSize = CITY_FONT_BASE_PX * dimScale * fontScale * cityFontScale;

    // Auto-fit city label: ensure it never overflows target content area
    ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
    const longestCityLine = cityLayout.lines.reduce((max, l) => (l.length > max.length ? l : max), "");
    const measuredCityWidth = ctx.measureText(longestCityLine).width;
    if (measuredCityWidth > maxContentWidth && measuredCityWidth > 0) {
      cityFontSize = Math.max(12 * dimScale * fontScale, cityFontSize * (maxContentWidth / measuredCityWidth));
    }

    const hasTagline = Boolean(customDate && customDate.trim());
    let countryFontSize = COUNTRY_FONT_BASE_PX * dimScale * fontScale;
    ctx.font = `600 ${countryFontSize}px ${titleFontFamily}`;
    const measuredCountryWidth = ctx.measureText(country.toUpperCase()).width;
    if (measuredCountryWidth > maxContentWidth && measuredCountryWidth > 0) {
      countryFontSize = Math.max(10 * dimScale * fontScale, countryFontSize * (maxContentWidth / measuredCountryWidth));
    }

    const coordsString = formatCoordinates(center.lat, center.lon);
    let coordinateFontSize = COORDS_FONT_BASE_PX * dimScale * fontScale;
    ctx.font = `500 ${coordinateFontSize}px ${bodyFontFamily}`;
    const measuredCoordsWidth = ctx.measureText(coordsString).width;
    if (measuredCoordsWidth > maxContentWidth && measuredCoordsWidth > 0) {
      coordinateFontSize = Math.max(8 * dimScale * fontScale, coordinateFontSize * (maxContentWidth / measuredCoordsWidth));
    }

    const taglineFontSize = 68 * dimScale * fontScale;
    const maxLineLength = Math.max(...cityLayout.lines.map((l) => l.length), 1);
    const letterSpacingPx = Math.round(cityFontSize * (maxLineLength > 12 ? 0.06 : maxLineLength > 8 ? 0.10 : 0.15));

    // Calculate total height of the typography stack to anchor it perfectly
    const cityLineSpacing = cityFontSize * 1.08;
    const totalCityHeight = cityLayout.lines.length * cityLineSpacing;
    const countryHeight = country ? countryFontSize * 1.15 : 0;
    const taglineHeight = hasTagline ? taglineFontSize * 1.15 : 0;
    const coordsHeight = coordinateFontSize * 1.15;

    const totalStackHeight =
      totalCityHeight +
      (city ? gapDividerPx : 0) +
      (country ? gapCountryPx + countryHeight : 0) +
      (hasTagline ? gapTaglinePx + taglineHeight : 0) +
      gapCoordsPx + coordsHeight;

    let anchorX: number;
    let startY: number;
    const effectiveAlign: CanvasTextAlign = isSquare ? squareGeom!.captionAlign : textAlign;

    if (isSquare) {
      if (!isLandscapeSquare) {
        if (squareGeom!.variant === "top-left") {
          anchorX = squareGeom!.captionX;
          startY = squareGeom!.captionY;
        } else {
          const mapBottom = squareGeom!.y + squareGeom!.size;
          const contentBottom = squareGeom!.posterHeight - squareGeom!.safeInsetY;
          const lowerCenterY = mapBottom + (contentBottom - mapBottom) / 2;
          startY = lowerCenterY - totalStackHeight / 2;
          anchorX = effectiveAlign === "left"
            ? squareGeom!.x
            : effectiveAlign === "right"
              ? squareGeom!.x + squareGeom!.size
              : squareGeom!.posterWidth / 2;
        }
      } else {
        // Landscape square caption
        startY = (squareGeom!.y + squareGeom!.size / 2) - totalStackHeight / 2;
        anchorX = effectiveAlign === "left"
          ? squareGeom!.captionXStart
          : effectiveAlign === "right"
            ? squareGeom!.posterWidth - squareGeom!.safeInsetX
            : squareGeom!.captionXStart + squareGeom!.captionWidth / 2;
      }
    } else {
      // Standard layout
      anchorX = effectiveAlign === "left" ? width * 0.05 : effectiveAlign === "right" ? width * 0.95 : width * 0.5;
      const nominalCityCenterY = height * (cityLayout.isMultiLine ? TEXT_CITY_Y_RATIO - 0.015 : TEXT_CITY_Y_RATIO);
      startY = nominalCityCenterY - cityLineSpacing * 0.5;
    }

    ctx.fillStyle = textColor;
    ctx.textAlign = effectiveAlign;
    ctx.textBaseline = "top";

    let currY = startY;

    // 1. Draw city lines
    for (let i = 0; i < cityLayout.lines.length; i++) {
      const lineText = cityLayout.lines[i];
      const isPrefix = i === 0 && lineText.includes("CITY OF");
      const currentSize = isPrefix ? Math.round(cityFontSize * 0.68) : cityFontSize;
      ctx.font = `${isPrefix ? "500" : "700"} ${currentSize}px ${titleFontFamily}`;
      if ("letterSpacing" in ctx) {
        (ctx as any).letterSpacing = `${letterSpacingPx}px`;
      }
      ctx.fillText(lineText, anchorX, currY);
      currY += cityLineSpacing;
    }

    // 2. Draw underline divider (strictly 2.5 mm below the city title)
    if (city) {
      currY += gapDividerPx;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = Math.max(1, 1.5 * dimScale);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      const dividerWidth = Math.min(maxContentWidth, Math.max(targetWidth * 0.08, measuredCityWidth));
      const dividerStart = effectiveAlign === "left"
        ? anchorX
        : effectiveAlign === "right"
          ? anchorX - dividerWidth
          : anchorX - dividerWidth / 2;
      ctx.moveTo(dividerStart, currY);
      ctx.lineTo(dividerStart + dividerWidth, currY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 3. Draw country subtitle (strictly 2.8 mm below the divider)
    if (country) {
      currY += gapCountryPx;
      if ("letterSpacing" in ctx) {
        (ctx as any).letterSpacing = `${Math.round(countryFontSize * 0.22)}px`;
      }
      ctx.font = `600 ${countryFontSize}px ${titleFontFamily}`;
      ctx.fillText(country.toUpperCase(), anchorX, currY);
      currY += countryFontSize * 1.15;
    }

    // 4. Draw optional tagline / custom date
    if (hasTagline) {
      currY += gapTaglinePx;
      ctx.globalAlpha = 0.88;
      if ("letterSpacing" in ctx) {
        (ctx as any).letterSpacing = `${Math.round(taglineFontSize * 0.08)}px`;
      }
      ctx.font = `500 ${taglineFontSize}px ${bodyFontFamily}`;
      ctx.fillText(customDate!.trim(), anchorX, currY);
      currY += taglineFontSize * 1.15;
      ctx.globalAlpha = 1;
    }

    // 5. Draw coordinates
    currY += gapCoordsPx;
    ctx.globalAlpha = 0.95;
    if ("letterSpacing" in ctx) {
      (ctx as any).letterSpacing = `${Math.round(coordinateFontSize * 0.08)}px`;
    }
    ctx.font = `500 ${coordinateFontSize}px ${bodyFontFamily}`;
    ctx.fillText(coordsString, anchorX, currY);
    ctx.globalAlpha = 1;

    if ("letterSpacing" in ctx) {
      (ctx as any).letterSpacing = "0px";
    }
  }

  // Attribution layout: ensure maparte.com is always kept >= 0.2mm away from border
  if (!isSquare) {
    const appText = APP_CREDIT_URL;
    let attributionFontSize = ATTRIBUTION_FONT_BASE_PX * dimScale * fontScale;
    ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;

    const pointTwoMmPx = Math.max(3, Math.round((width / 210) * 0.2));
    const borderInnerX = Math.round(width * 0.045);
    const borderInnerY = Math.round(height * 0.045);

    const credX = borderInnerX + pointTwoMmPx;
    const attrY = height - (borderInnerY + pointTwoMmPx);

    if (includeCredits) {
      const maparteFontSize = Math.max(attributionFontSize * 1.5, Math.round(55 * dimScale * fontScale));
      ctx.fillStyle = attributionColor;
      ctx.globalAlpha = Math.min(1, attributionAlpha + 0.2);
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.font = `600 ${maparteFontSize}px ${bodyFontFamily}`;
      ctx.fillText(appText, credX, attrY);
      ctx.globalAlpha = 1;
    }
  }
}
