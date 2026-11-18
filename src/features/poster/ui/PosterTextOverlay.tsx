import { useLayoutEffect, useRef, useState } from "react";
import { formatCoordinates } from "@/shared/geo/posterBounds";
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
  getPosterFontScale,
  computeCityFontScale,
  computeCityLetterSpacing,
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
  isCustomColor?: boolean;
  posterWidthCm?: number;
  posterHeightCm?: number;
}

/**
 * DOM-based poster text overlay (sharp at any resolution, GPU-composited).
 * Uses a unified `.poster-caption-stack` flow layout guaranteeing exact physical mm gaps
 * (strictly 2.5 mm between words and underline) across all world cities and layouts.
 */
export default function PosterTextOverlay({
  city,
  country,
  lat,
  lon,
  fontFamily,
  fontSize,
  textAlign = "center",
  textColor,
  landColor,
  showPosterText,
  includeCredits,
  showOverlay,
  customDate,
  squareCaption = false,
  squareCaptionGeometry,
  isCustomColor = false,
  posterWidthCm = 21,
  posterHeightCm = 29.7,
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

  const geometry = squareCaptionGeometry;
  const isLandscape = geometry ? geometry.posterWidth > geometry.posterHeight : posterWidthCm > posterHeightCm;
  const isNarrowBox = Boolean(squareCaption && isLandscape);
  const captionVariant = geometry?.variant ?? "center-bottom";

  const align: "left" | "center" | "right" = squareCaption
    ? (geometry?.captionAlign ?? textAlign ?? "center")
    : (textAlign ?? "center");

  const aspectRatio = posterWidthCm && posterHeightCm ? posterWidthCm / Math.max(0.1, posterHeightCm) : 0.707;
  const cityLayout = resolveCityDisplay(city, aspectRatio, isNarrowBox);
  const cityFontScale = computeCityFontScale(city, cityLayout.lines, isNarrowBox);
  const maxLineLength = Math.max(...cityLayout.lines.map((l) => l.length), 1);
  const cityLetterSpacing = computeCityLetterSpacing(maxLineLength, isNarrowBox);

  const cityFontSize = `${toCqMin(CITY_FONT_BASE_PX * fontScale) * cityFontScale}cqmin`;
  const countryFontSize = `${toCqMin(COUNTRY_FONT_BASE_PX * fontScale)}cqmin`;
  const coordsFontSize = `${toCqMin(COORDS_FONT_BASE_PX * fontScale)}cqmin`;
  const taglineFontSize = `${toCqMin(68 * fontScale)}cqmin`;
  const attributionFontSize = `${toCqMin(ATTRIBUTION_FONT_BASE_PX * fontScale)}cqmin`;
  const maparteFontSize = `${toCqMin(80 * fontScale)}cqmin`;
  const safeTextColor = ensureContrastTextColor(textColor, landColor, isCustomColor);
  const attributionColor = computeAttributionColor(safeTextColor, landColor, showOverlay);
  const attributionOpacity = showOverlay ? 0.65 : 0.95;
  const hasTagline = Boolean(customDate && customDate.trim());

  // Physical calibrated gaps in container query height (cqh) units:
  // 100cqh = poster height. Therefore, gap in cqh = (gap_cm / posterHeightCm) * 100cqh.
  const hCm = Math.max(1, posterHeightCm);
  const dividerGapCqh = `${Number(((PHYSICAL_DIVIDER_GAP_MM / 10) / hCm * 100).toFixed(4))}cqh`;
  const countryGapCqh = `${Number(((PHYSICAL_COUNTRY_GAP_MM / 10) / hCm * 100).toFixed(4))}cqh`;
  const taglineGapCqh = `${Number(((PHYSICAL_TAGLINE_GAP_MM / 10) / hCm * 100).toFixed(4))}cqh`;
  const coordsGapCqh = `${Number(((PHYSICAL_COORDS_GAP_MM / 10) / hCm * 100).toFixed(4))}cqh`;

  const cityRef = useRef<HTMLDivElement | null>(null);
  const [cityTextWidthPercent, setCityTextWidthPercent] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const el = cityRef.current;
    if (!el) return;
    // Measure the widest rendered line of the city title
    const lineSpans = el.querySelectorAll<HTMLElement>(".poster-city-line");
    let maxLineWidth = 0;
    if (lineSpans.length > 0) {
      lineSpans.forEach((span) => {
        const w = span.getBoundingClientRect().width;
        if (w > maxLineWidth) maxLineWidth = w;
      });
    } else {
      maxLineWidth = el.getBoundingClientRect().width;
    }

    const parent = el.closest(".poster-caption-stack");
    if (!parent) return;
    const parentWidth = parent.getBoundingClientRect().width;

    if (parentWidth > 0 && maxLineWidth > 0) {
      const pct = (maxLineWidth / parentWidth) * 100;
      setCityTextWidthPercent(Math.min(96, Math.max(8, Number(pct.toFixed(2)))));
    }
  }, [city, cityLayout, fontFamily, fontSize, squareCaption, isLandscape, align]);

  const approxCharUnits = Math.max(...cityLayout.lines.map((line) => line.length), 4);
  const fallbackDividerWidth = squareCaption
    ? (isLandscape ? 28 : 22)
    : Math.min(48, Math.max(12, approxCharUnits * 2.2));
  const dividerWidth = cityTextWidthPercent ?? fallbackDividerWidth;

  let stackPositionStyle: React.CSSProperties;

  if (squareCaption && geometry) {
    if (!isLandscape) {
      if (captionVariant === "top-left") {
        stackPositionStyle = {
          top: `${(geometry.captionY / geometry.posterHeight) * 100}%`,
          left: `${(geometry.safeInsetX / geometry.posterWidth) * 100}%`,
          width: `${(geometry.captionWidth / geometry.posterWidth) * 100}%`,
          transform: "none",
          alignItems: "flex-start",
          textAlign: "left",
        };
      } else {
        const mapBottom = geometry.y + geometry.size;
        const contentBottom = geometry.posterHeight - geometry.safeInsetY;
        const lowerAreaHeight = contentBottom - mapBottom;
        const lowerCenterY = mapBottom + lowerAreaHeight / 2;

        stackPositionStyle = {
          top: `${(lowerCenterY / geometry.posterHeight) * 100}%`,
          transform: "translateY(-50%)",
          left: `${(geometry.x / geometry.posterWidth) * 100}%`,
          width: `${(geometry.size / geometry.posterWidth) * 100}%`,
          alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          textAlign: align,
        };
      }
    } else {
      // Landscape: right column
      const rightColLeftPercent = (geometry.captionXStart / geometry.posterWidth) * 100;
      const rightColWidthPercent = (geometry.captionWidth / geometry.posterWidth) * 100;

      stackPositionStyle = {
        left: `${rightColLeftPercent}%`,
        width: `${rightColWidthPercent}%`,
        top: "50%",
        transform: "translateY(-50%)",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        textAlign: align,
        paddingInline: "4px",
      };
    }
  } else {
    // Standard Layouts (Portrait / Landscape / Social)
    const standardTopPercent = (cityLayout.isMultiLine ? TEXT_CITY_Y_RATIO - 0.015 : TEXT_CITY_Y_RATIO) * 100;
    stackPositionStyle = {
      top: `${standardTopPercent}%`,
      transform: "translateY(-50%)",
      left: align === "left" ? "5%" : align === "right" ? "5%" : 0,
      width: align === "center" ? "100%" : "90%",
      marginInline: align === "center" ? "auto" : undefined,
      alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
      textAlign: align,
      paddingInline: align === "center" ? "4%" : 0,
    };
  }

  const dividerMarginLeft = align === "right" ? "auto" : align === "center" ? "auto" : 0;
  const dividerMarginRight = align === "left" ? "auto" : align === "center" ? "auto" : 0;

  return (
    <div className={`poster-text-overlay${squareCaption ? " is-square-caption-text" : ""}`} style={{ color: safeTextColor }}>
      {showPosterText && (
        <div className="poster-caption-stack" style={stackPositionStyle}>
          <div
            ref={cityRef}
            className="poster-city"
            style={{
              fontFamily: titleFont,
              fontSize: cityFontSize,
              lineHeight: 1.08,
              textAlign: align,
            }}
          >
            {cityLayout.lines.map((line, idx) => (
              <span
                key={idx}
                className="poster-city-line"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  fontSize: idx === 0 && line.includes("CITY OF") ? "0.68em" : undefined,
                  fontWeight: idx === 0 && line.includes("CITY OF") ? 500 : 700,
                  letterSpacing: cityLetterSpacing,
                }}
              >
                {line}
              </span>
            ))}
          </div>

          {city ? (
            <hr
              className="poster-divider"
              style={{
                borderColor: safeTextColor,
                width: `${dividerWidth}%`,
                marginTop: dividerGapCqh,
                marginLeft: dividerMarginLeft,
                marginRight: dividerMarginRight,
              }}
            />
          ) : null}

          {country ? (
            <p
              className="poster-country"
              style={{
                fontFamily: titleFont,
                fontSize: countryFontSize,
                marginTop: countryGapCqh,
                textAlign: align,
                letterSpacing: "0.22em",
              }}
            >
              {country.toUpperCase()}
            </p>
          ) : null}

          {hasTagline && (
            <p
              className="poster-tagline"
              style={{
                fontFamily: bodyFont,
                fontSize: taglineFontSize,
                marginTop: taglineGapCqh,
                textAlign: align,
                letterSpacing: "0.08em",
              }}
            >
              {customDate}
            </p>
          )}

          <p
            className="poster-coords"
            style={{
              fontFamily: bodyFont,
              fontSize: coordsFontSize,
              marginTop: coordsGapCqh,
              textAlign: align,
              letterSpacing: "0.08em",
            }}
          >
            {formatCoordinates(lat, lon)}
          </p>
        </div>
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
            bottom: squareCaption && geometry ? `${(geometry.safeInsetY / geometry.posterHeight) * 100}%` : "calc(2.5% + 0.2mm)",
            left: squareCaption && geometry ? `${(geometry.safeInsetX / geometry.posterWidth) * 100}%` : "calc(2.5% + 0.2mm)",
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
