import { formatCoordinates } from "@/shared/geo/posterBounds";
import { APP_CREDIT_URL } from "@/core/config";
import type { SquareCaptionGeometry } from "@/features/layout/domain/squareCaptionGeometry";
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
  formatCityLabel,
  getPosterFontScale,
  computeCityFontScale,
  computeAttributionColor,
} from "@/features/poster/domain/textLayout";

interface PosterTextOverlayProps {
  city: string;
  country: string;
  lat: number;
  lon: number;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  landColor: string;
  showPosterText: boolean;
  includeCredits: boolean;
  showOverlay: boolean;
  customDate?: string;
  squareCaption?: boolean;
  squareCaptionGeometry?: SquareCaptionGeometry | null;
}

/**
 * DOM-based poster text overlay (sharp at any resolution, GPU-composited).
 * Renders city name, divider, country, coordinates, and attribution
 * positioned to match the canvas export layout exactly.
 */
export default function PosterTextOverlay({
  city,
  country,
  lat,
  lon,
  fontFamily,
  fontSize,
  textColor,
  landColor,
  showPosterText,
  includeCredits,
  showOverlay,
  customDate,
  squareCaption = false,
  squareCaptionGeometry,
}: PosterTextOverlayProps) {
  const toCqMin = (px: number) => (px / TEXT_DIMENSION_REFERENCE_PX) * 100;
  const fontScale = getPosterFontScale(fontSize);

  const titleFont = fontFamily
    ? `"${fontFamily}", "Space Grotesk", sans-serif`
    : '"Space Grotesk", sans-serif';
  const bodyFont = fontFamily
    ? `"${fontFamily}", "IBM Plex Mono", monospace`
    : '"IBM Plex Mono", monospace';

  const cityLabel = formatCityLabel(city);
  const cityFontSize = `${toCqMin(CITY_FONT_BASE_PX * fontScale) * computeCityFontScale(city)}cqmin`;
  const countryFontSize = `${toCqMin(COUNTRY_FONT_BASE_PX * fontScale)}cqmin`;
  const coordsFontSize = `${toCqMin(COORDS_FONT_BASE_PX * fontScale)}cqmin`;
  const taglineFontSize = `${toCqMin(68 * fontScale)}cqmin`;
  const attributionFontSize = `${toCqMin(ATTRIBUTION_FONT_BASE_PX * fontScale)}cqmin`;
  const attributionColor = computeAttributionColor(textColor, landColor, showOverlay);
  const attributionOpacity = showOverlay ? 0.55 : 0.9;
  const hasTagline = Boolean(customDate && customDate.trim());
  const geometry = squareCaptionGeometry;
  const captionVariant = geometry?.variant ?? "center-bottom";
  const captionX = geometry ? (geometry.captionX / geometry.posterWidth) * 100 : 50;
  const captionY = geometry ? (geometry.captionY / geometry.posterHeight) * 100 : 75;
  const captionWidth = geometry ? (geometry.captionWidth / geometry.posterWidth) * 100 : 90;
  const align = geometry?.captionAlign ?? "center";
  const captionLeft = align === "left" ? captionX : align === "right" ? captionX - captionWidth : captionX - captionWidth / 2;
  const captionLineStep = geometry ? (geometry.posterHeight * 0.042 / geometry.posterHeight) * 100 : 4;
  const cityY = captionY;
  const captionTextStyle = {
    left: `${captionLeft}%`,
    right: "auto",
    width: `${captionWidth}%`,
    textAlign: align,
    paddingInline: captionVariant === "top-left" ? "0" : "0.4%",
  } as const;
  const captionDividerLeft = align === "left" ? captionX : align === "right" ? captionX - captionWidth * 0.16 : captionX - captionWidth * 0.08;

  return (
    <div className={`poster-text-overlay${squareCaption ? " is-square-caption-text" : ""}`} style={{ color: textColor }}>
      {showPosterText && (
        <>
          <p
            className="poster-city"
            style={{
              fontFamily: titleFont,
              ...(squareCaption ? captionTextStyle : {}),
              top: squareCaption ? `${cityY}%` : `${TEXT_CITY_Y_RATIO * 100}%`,
              fontSize: cityFontSize,
            }}
          >
            {cityLabel}
          </p>
          {city && country ? <hr
            className="poster-divider"
            style={{
              borderColor: textColor,
              ...(squareCaption ? { left: `${captionDividerLeft}%`, right: "auto", width: `${captionWidth * 0.16}%` } : {}),
              top: squareCaption ? `${cityY + captionLineStep * 0.72}%` : `${TEXT_DIVIDER_Y_RATIO * 100}%`,
            }}
          /> : null}
          {country ? <p
            className="poster-country"
            style={{
              fontFamily: titleFont,
              ...(squareCaption ? captionTextStyle : {}),
              top: squareCaption ? `${cityY + captionLineStep * 1.08}%` : `${(hasTagline ? 0.896 : TEXT_COUNTRY_Y_RATIO) * 100}%`,
              fontSize: countryFontSize,
            }}
          >
            {country.toUpperCase()}
          </p> : null}
          {hasTagline && (
            <p
              className="poster-tagline"
              style={{
                fontFamily: bodyFont,
                ...(squareCaption ? captionTextStyle : {}),
                top: squareCaption ? `${cityY + captionLineStep * 1.52}%` : `${(country ? .918 : .89) * 100}%`,
                fontSize: taglineFontSize,
                letterSpacing: "0.06em",
              }}
            >
              {customDate}
            </p>
          )}
          <p
            className="poster-coords"
            style={{
              fontFamily: bodyFont,
              ...(squareCaption ? captionTextStyle : {}),
              top: squareCaption ? `${cityY + captionLineStep * (hasTagline ? 2.0 : country ? 1.58 : 1.08)}%` : `${(hasTagline ? (country ? .938 : .918) : (country ? TEXT_COORDS_Y_RATIO : .9)) * 100}%`,
              fontSize: coordsFontSize,
            }}
          >
            {formatCoordinates(lat, lon)}
          </p>
        </>
      )}

      {includeCredits && (
        <span
          className="poster-credits"
          style={{
            fontFamily: bodyFont,
            color: attributionColor,
            opacity: attributionOpacity,
            fontSize: attributionFontSize,
            bottom: squareCaption ? "var(--square-safe-y, 1.7%)" : `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
            left: squareCaption ? "var(--square-safe-x, 2.4%)" : `${TEXT_EDGE_MARGIN_RATIO * 100}%`,
            right: squareCaption ? "auto" : undefined,
            textAlign: squareCaption ? "left" : undefined,
          }}
        >
          {APP_CREDIT_URL}
        </span>
      )}
    </div>
  );
}
