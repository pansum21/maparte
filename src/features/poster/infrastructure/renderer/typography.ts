import { formatCoordinates } from "@/shared/geo/posterBounds";
import type { Coordinate } from "@/shared/geo/types";
import { APP_CREDIT_URL } from "@/core/config";
import {
  TEXT_DIMENSION_REFERENCE_PX,
  TEXT_CITY_Y_RATIO,
  TEXT_DIVIDER_Y_RATIO,
  TEXT_COUNTRY_Y_RATIO,
  TEXT_COORDS_Y_RATIO,
  TEXT_EDGE_MARGIN_RATIO,
  CITY_FONT_BASE_PX,
  COUNTRY_FONT_BASE_PX,
  COORDS_FONT_BASE_PX,
  ATTRIBUTION_FONT_BASE_PX,
  isLatinScript,
  formatCityLabel,
  resolveCityDisplay,
  computeCityFontScale,
  computeAttributionColor,
  ensureContrastTextColor,
  getPosterFontScale,
} from "@/features/poster/domain/textLayout";

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
  const maxContentWidth = width * 0.88;

  if (showPosterText) {
    const aspectRatio = width / Math.max(1, height);
    const cityLayout = resolveCityDisplay(city, aspectRatio);
    let cityFontSize = CITY_FONT_BASE_PX * dimScale * fontScale * (cityLayout.isMultiLine ? 0.85 : computeCityFontScale(city));

    // Auto-fit city label: measure text and ensure it never overflows canvas edges
    ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
    const longestCityLine = cityLayout.lines.reduce((max, l) => l.length > max.length ? l : max, "");
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
    const cityY = height * TEXT_CITY_Y_RATIO;
    const countryY = height * (hasTagline ? 0.896 : TEXT_COUNTRY_Y_RATIO);
    const taglineY = height * (country ? .918 : .89);
    const coordinatesY = height * (hasTagline ? (country ? .938 : .918) : (country ? TEXT_COORDS_Y_RATIO : .9));

    ctx.fillStyle = textColor;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";
    const anchorX = textAlign === "left" ? width * 0.05 : textAlign === "right" ? width * 0.95 : width * 0.5;

    if (cityLayout.isMultiLine) {
      const lineSpacing = cityFontSize * 1.08;
      const y1 = cityY - (lineSpacing * 0.46);
      const y2 = cityY + (lineSpacing * 0.54);
      const isPrefix = cityLayout.lines[0].includes("CITY OF");
      const size1 = isPrefix ? Math.round(cityFontSize * 0.68) : cityFontSize;

      ctx.font = `${isPrefix ? "500" : "700"} ${size1}px ${titleFontFamily}`;
      ctx.fillText(cityLayout.lines[0], anchorX, y1);

      ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
      ctx.fillText(cityLayout.lines[1], anchorX, y2);
    } else {
      ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
      if ("letterSpacing" in ctx) {
        (ctx as any).letterSpacing = `${Math.round(cityFontSize * 0.16)}px`;
      }
      ctx.fillText(cityLayout.lines[0], anchorX, cityY);
    }

    const dividerY = cityLayout.isMultiLine ? (cityY + (cityFontSize * 0.54) + (countryY - (cityY + cityFontSize * 0.54)) * 0.4) : (height * TEXT_DIVIDER_Y_RATIO);
    if (city && country) {
      ctx.strokeStyle = textColor;
      ctx.lineWidth = Math.max(1, 1.5 * dimScale);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      const dividerWidth = Math.min(width * 0.92, Math.max(width * 0.08, measuredCityWidth));
      const dividerStart = textAlign === "left" ? width * 0.05 : textAlign === "right" ? width * 0.95 - dividerWidth : width * 0.5 - dividerWidth / 2;
      ctx.moveTo(dividerStart, dividerY);
      ctx.lineTo(dividerStart + dividerWidth, dividerY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if ("letterSpacing" in ctx) {
      (ctx as any).letterSpacing = `${Math.round(countryFontSize * 0.22)}px`;
    }
    ctx.font = `600 ${countryFontSize}px ${titleFontFamily}`;
    ctx.fillText(country.toUpperCase(), anchorX, countryY);

    if (hasTagline) {
      ctx.globalAlpha = 0.88;
      if ("letterSpacing" in ctx) {
        (ctx as any).letterSpacing = `${Math.round(taglineFontSize * 0.08)}px`;
      }
      ctx.font = `500 ${taglineFontSize}px ${bodyFontFamily}`;
      ctx.fillText(customDate!.trim(), anchorX, taglineY);
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 0.95;
    if ("letterSpacing" in ctx) {
      (ctx as any).letterSpacing = `${Math.round(coordinateFontSize * 0.10)}px`;
    }
    ctx.font = `500 ${coordinateFontSize}px ${bodyFontFamily}`;
    ctx.fillText(coordsString, anchorX, coordinatesY);
    ctx.globalAlpha = 1;
    if ("letterSpacing" in ctx) {
      (ctx as any).letterSpacing = "0px";
    }
  }

  // Attribution layout: ensure maparte.com is always kept >= 3mm away from border
  const osmText = "\u00a9 OpenStreetMap contributors";
  const appText = APP_CREDIT_URL;

  let attributionFontSize = ATTRIBUTION_FONT_BASE_PX * dimScale * fontScale;
  ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;
  const appWidth = includeCredits ? ctx.measureText(appText).width : 0;
  ctx.globalAlpha = 1;

  // 0.2mm precision calculation in pixels (at 300 DPI: ~2.4px)
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
