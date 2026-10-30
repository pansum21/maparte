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
  computeCityFontScale,
  computeAttributionColor,
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
): void {
  const textColor = theme.ui?.text || "#111111";
  const landColor = theme.map?.land || "#808080";
  const fontScale = getPosterFontScale(fontSize);
  const attributionColor = computeAttributionColor(textColor, landColor, showOverlay);
  const attributionAlpha = showOverlay ? 0.55 : 0.9;
  const titleFontFamily = fontFamily
    ? `"${fontFamily}", "Space Grotesk", sans-serif`
    : '"Space Grotesk", sans-serif';
  const bodyFontFamily = fontFamily
    ? `"${fontFamily}", "IBM Plex Mono", monospace`
    : '"IBM Plex Mono", monospace';

  const dimScale = Math.min(width, height) / TEXT_DIMENSION_REFERENCE_PX;
  const maxContentWidth = width * 0.88;

  if (showPosterText) {
    const cityLabel = formatCityLabel(city);
    let cityFontSize = CITY_FONT_BASE_PX * dimScale * fontScale * computeCityFontScale(city);

    // Auto-fit city label: measure text and ensure it never overflows canvas edges
    ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
    const measuredCityWidth = ctx.measureText(cityLabel).width;
    if (measuredCityWidth > maxContentWidth && measuredCityWidth > 0) {
      cityFontSize = Math.max(12 * dimScale * fontScale, cityFontSize * (maxContentWidth / measuredCityWidth));
    }

    const hasTagline = Boolean(customDate && customDate.trim());
    let countryFontSize = COUNTRY_FONT_BASE_PX * dimScale * fontScale;
    ctx.font = `300 ${countryFontSize}px ${titleFontFamily}`;
    const measuredCountryWidth = ctx.measureText(country.toUpperCase()).width;
    if (measuredCountryWidth > maxContentWidth && measuredCountryWidth > 0) {
      countryFontSize = Math.max(10 * dimScale * fontScale, countryFontSize * (maxContentWidth / measuredCountryWidth));
    }

    const coordsString = formatCoordinates(center.lat, center.lon);
    let coordinateFontSize = COORDS_FONT_BASE_PX * dimScale * fontScale;
    ctx.font = `400 ${coordinateFontSize}px ${bodyFontFamily}`;
    const measuredCoordsWidth = ctx.measureText(coordsString).width;
    if (measuredCoordsWidth > maxContentWidth && measuredCoordsWidth > 0) {
      coordinateFontSize = Math.max(8 * dimScale * fontScale, coordinateFontSize * (maxContentWidth / measuredCoordsWidth));
    }

    const taglineFontSize = 68 * dimScale * fontScale;
    const cityY = height * TEXT_CITY_Y_RATIO;
    const lineY = height * TEXT_DIVIDER_Y_RATIO;
    const countryY = height * (hasTagline ? 0.896 : TEXT_COUNTRY_Y_RATIO);
    const taglineY = height * (country ? .918 : .89);
    const coordinatesY = height * (hasTagline ? (country ? .938 : .918) : (country ? TEXT_COORDS_Y_RATIO : .9));

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${cityFontSize}px ${titleFontFamily}`;
    ctx.fillText(cityLabel, width * 0.5, cityY);

    if (city && country) {
    ctx.strokeStyle = textColor;
    ctx.lineWidth = Math.max(1, 3 * dimScale);
    ctx.beginPath();
    ctx.moveTo(width * 0.4, lineY);
    ctx.lineTo(width * 0.6, lineY);
    ctx.stroke();
    }

    ctx.font = `300 ${countryFontSize}px ${titleFontFamily}`;
    ctx.fillText(country.toUpperCase(), width * 0.5, countryY);

    if (hasTagline) {
      ctx.globalAlpha = 0.88;
      ctx.font = `500 ${taglineFontSize}px ${bodyFontFamily}`;
      ctx.fillText(customDate!.trim(), width * 0.5, taglineY);
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 0.75;
    ctx.font = `400 ${coordinateFontSize}px ${bodyFontFamily}`;
    ctx.fillText(coordsString, width * 0.5, coordinatesY);
    ctx.globalAlpha = 1;
  }

  // Attribution layout: ensure left and right attributions never collide or overlap
  const osmText = "\u00a9 OpenStreetMap contributors";
  const appText = `✦ MAPARTE • ${APP_CREDIT_URL}`;

  let attributionFontSize = ATTRIBUTION_FONT_BASE_PX * dimScale * fontScale;
  ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;
  const osmWidth = ctx.measureText(osmText).width;
  const appWidth = includeCredits ? ctx.measureText(appText).width : 0;
  const edgeMargin = width * TEXT_EDGE_MARGIN_RATIO;
  const availableAttributionWidth = width - (edgeMargin * 2) - (includeCredits ? width * 0.04 : 0);
  const requiredAttributionWidth = osmWidth + appWidth;

  if (requiredAttributionWidth > availableAttributionWidth && requiredAttributionWidth > 0) {
    attributionFontSize = Math.max(7 * dimScale * fontScale, attributionFontSize * (availableAttributionWidth / requiredAttributionWidth));
  }

  ctx.fillStyle = attributionColor;
  ctx.globalAlpha = attributionAlpha;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;
  ctx.fillText(
    osmText,
    width * (1 - TEXT_EDGE_MARGIN_RATIO),
    height * (1 - TEXT_EDGE_MARGIN_RATIO),
  );
  ctx.globalAlpha = 1;

  if (includeCredits) {
    ctx.fillStyle = attributionColor;
    ctx.globalAlpha = attributionAlpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.font = `300 ${attributionFontSize}px ${bodyFontFamily}`;
    ctx.fillText(
      appText,
      width * TEXT_EDGE_MARGIN_RATIO,
      height * (1 - TEXT_EDGE_MARGIN_RATIO),
    );
    ctx.globalAlpha = 1;
  }
}
