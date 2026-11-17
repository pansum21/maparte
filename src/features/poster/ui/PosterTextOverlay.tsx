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
  resolveCityDisplay,
  getPosterFontScale,
  computeCityFontScale,
  computeAttributionColor,
  ensureContrastTextColor,
} from "@/features/poster/domain/textLayout";

interface PosterTextOverlayProps {
  city: string;
  country: string;
  lat: number;
  lon: number;
  fontFamily: string;
  fontSize: number;
  textAlign: "left" | "center" | "right";
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
  textAlign,
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

  const isSerif = /serif|times|cormorant|baskerville|lora|merriweather|playfair/i.test(fontFamily || "");
  const titleFont = fontFamily
    ? `"${fontFamily}", ${isSerif ? "'Times New Roman', Times, serif" : '"Space Grotesk", sans-serif'}`
    : '"Space Grotesk", sans-serif';
  const bodyFont = isSerif
    ? `"${fontFamily}", 'Times New Roman', Times, serif`
    : (fontFamily ? `"${fontFamily}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace');

  const cityLayout = resolveCityDisplay(city);
  const cityFontSize = `${toCqMin(CITY_FONT_BASE_PX * fontScale) * (cityLayout.isMultiLine ? 0.85 : computeCityFontScale(city))}cqmin`;
  const countryFontSize = `${toCqMin(COUNTRY_FONT_BASE_PX * fontScale)}cqmin`;
  const coordsFontSize = `${toCqMin(COORDS_FONT_BASE_PX * fontScale)}cqmin`;
  const taglineFontSize = `${toCqMin(68 * fontScale)}cqmin`;
  const attributionFontSize = `${toCqMin(ATTRIBUTION_FONT_BASE_PX * fontScale)}cqmin`;
  const maparteFontSize = `${toCqMin(80 * fontScale)}cqmin`;
  const safeTextColor = ensureContrastTextColor(textColor, landColor);
  const attributionColor = computeAttributionColor(safeTextColor, landColor, showOverlay);
  const attributionOpacity = showOverlay ? 0.65 : 0.95;
  const hasTagline = Boolean(customDate && customDate.trim());
  const geometry = squareCaptionGeometry;
  const captionVariant = geometry?.variant ?? "center-bottom";
  const captionX = geometry ? (geometry.captionX / geometry.posterWidth) * 100 : 50;
  const captionY = geometry ? (geometry.captionY / geometry.posterHeight) * 100 : 75;
  const captionWidth = geometry ? (geometry.captionWidth / geometry.posterWidth) * 100 : 90;
  const align = textAlign ?? geometry?.captionAlign ?? "center";
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
  const standardDividerWidth = Math.min(42, Math.max(14, Math.max(...cityLayout.lines.map((line) => line.length), 4) * 1.18));
  const captionDividerWidth = geometry ? captionWidth * 0.16 : standardDividerWidth;
  const captionDividerLeft = geometry
    ? align === "left" ? captionX : align === "right" ? captionX - captionWidth * 0.16 : captionX - captionWidth * 0.08
    : align === "left" ? 5 : align === "right" ? 95 - standardDividerWidth : 50 - standardDividerWidth / 2;

  return (
    <div className={`poster-text-overlay${squareCaption ? " is-square-caption-text" : ""}`} style={{ color: safeTextColor }}>
      {showPosterText && (
        <>
          <div
            className="poster-city"
            style={{
              fontFamily: titleFont,
              ...(squareCaption ? captionTextStyle : { textAlign }),
              top: squareCaption ? `${cityY}%` : `${(cityLayout.isMultiLine ? TEXT_CITY_Y_RATIO - 0.015 : TEXT_CITY_Y_RATIO) * 100}%`,
              fontSize: cityFontSize,
              lineHeight: 1.08,
            }}
          >
            {cityLayout.lines.map((line, idx) => (
              <span key={idx} style={{ display: "block", fontSize: idx === 0 && line.includes("CITY OF") ? "0.68em" : undefined, fontWeight: idx === 0 && line.includes("CITY OF") ? 500 : 700 }}>
                {line}
              </span>
            ))}
          </div>
          {city && country ? <hr
            className="poster-divider"
            style={{
              borderColor: textColor,
              left: `${captionDividerLeft}%`,
              right: "auto",
              width: `${captionDividerWidth}%`,
              top: squareCaption ? `${cityY + captionLineStep * 0.72}%` : `${TEXT_DIVIDER_Y_RATIO * 100}%`,
            }}
          /> : null}
          {country ? <p
            className="poster-country"
            style={{
              fontFamily: titleFont,
              ...(squareCaption ? captionTextStyle : { textAlign }),
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
                ...(squareCaption ? captionTextStyle : { textAlign }),
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
              ...(squareCaption ? captionTextStyle : { textAlign }),
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
            opacity: Math.min(1, attributionOpacity + 0.15),
            fontSize: maparteFontSize,
            fontWeight: 600,
            letterSpacing: "0.08em",
            bottom: squareCaption ? "var(--square-safe-y, 1.7%)" : "calc(2.5% + 0.2mm)",
            left: squareCaption ? "var(--square-safe-x, 2.4%)" : "calc(2.5% + 0.2mm)",
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
