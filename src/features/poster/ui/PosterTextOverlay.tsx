import { useLayoutEffect, useRef, useState } from "react";
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
  isCustomColor?: boolean;
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
  isCustomColor = false,
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
  const cityFontScale = computeCityFontScale(city, cityLayout.lines);
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
  const geometry = squareCaptionGeometry;
  const isLandscape = geometry ? geometry.posterWidth > geometry.posterHeight : false;
  const align = squareCaption ? (geometry?.captionAlign ?? "center") : (textAlign ?? "center");
  const captionY = geometry ? (geometry.captionY / geometry.posterHeight) * 100 : 75;
  const captionLineStep = geometry ? (geometry.posterHeight * 0.042 / geometry.posterHeight) * 100 : 4;
  const cityY = captionY;

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

    const parent = el.closest(".poster-text-overlay");
    if (!parent) return;
    const parentWidth = parent.getBoundingClientRect().width;

    if (parentWidth > 0 && maxLineWidth > 0) {
      const pct = (maxLineWidth / parentWidth) * 100;
      setCityTextWidthPercent(Math.min(92, Math.max(8, Number(pct.toFixed(2)))));
    }
  }, [city, cityLayout, fontFamily, fontSize, squareCaption, isLandscape, align]);

  const approxCharUnits = Math.max(...cityLayout.lines.map((line) => line.length), 4);
  const fallbackDividerWidth = squareCaption
    ? (isLandscape ? 22 : 18)
    : Math.min(38, Math.max(12, approxCharUnits * 1.5));
  const dividerWidth = cityTextWidthPercent ?? fallbackDividerWidth;

  let captionTextStyle: React.CSSProperties;
  let dividerStyle: React.CSSProperties;

  if (squareCaption && geometry) {
    if (!isLandscape) {
      const mapXPercent = (geometry.x / geometry.posterWidth) * 100;
      const mapWidthPercent = (geometry.size / geometry.posterWidth) * 100;

      if (align === "center") {
        captionTextStyle = {
          left: 0,
          right: 0,
          width: "100%",
          textAlign: "center",
          margin: "0 auto",
        };
        dividerStyle = {
          left: "50%",
          right: "auto",
          width: `${dividerWidth}%`,
          transform: "translate(-50%, -50%)",
        };
      } else if (align === "left") {
        captionTextStyle = {
          left: `${mapXPercent}%`,
          right: "auto",
          width: `${mapWidthPercent}%`,
          textAlign: "left",
        };
        dividerStyle = {
          left: `${mapXPercent}%`,
          right: "auto",
          width: `${dividerWidth}%`,
          transform: "translateY(-50%)",
        };
      } else {
        // align === "right"
        captionTextStyle = {
          left: `${mapXPercent}%`,
          right: "auto",
          width: `${mapWidthPercent}%`,
          textAlign: "right",
        };
        dividerStyle = {
          left: `${mapXPercent + mapWidthPercent - dividerWidth}%`,
          right: "auto",
          width: `${dividerWidth}%`,
          transform: "translateY(-50%)",
        };
      }
    } else {
      // Landscape: right column
      const rightColLeftPercent = (geometry.captionXStart / geometry.posterWidth) * 100;
      const rightColWidthPercent = (geometry.captionWidth / geometry.posterWidth) * 100;

      captionTextStyle = {
        left: `${rightColLeftPercent}%`,
        right: "auto",
        width: `${rightColWidthPercent}%`,
        textAlign: align,
      };

      if (align === "center") {
        dividerStyle = {
          left: `${rightColLeftPercent + rightColWidthPercent / 2}%`,
          right: "auto",
          width: `${dividerWidth}%`,
          transform: "translate(-50%, -50%)",
        };
      } else if (align === "left") {
        dividerStyle = {
          left: `${rightColLeftPercent}%`,
          right: "auto",
          width: `${dividerWidth}%`,
          transform: "translateY(-50%)",
        };
      } else {
        dividerStyle = {
          left: `${rightColLeftPercent + rightColWidthPercent - dividerWidth}%`,
          right: "auto",
          width: `${dividerWidth}%`,
          transform: "translateY(-50%)",
        };
      }
    }
  } else {
    captionTextStyle = {
      textAlign,
      left: 0,
      right: 0,
      width: "100%",
    };
    dividerStyle = {
      left: align === "left" ? "5%" : align === "right" ? `${95 - dividerWidth}%` : "50%",
      right: "auto",
      width: `${dividerWidth}%`,
      transform: align === "center" ? "translate(-50%, -50%)" : "translateY(-50%)",
    };
  }

  return (
    <div className={`poster-text-overlay${squareCaption ? " is-square-caption-text" : ""}`} style={{ color: safeTextColor }}>
      {showPosterText && (
        <>
          <div
            ref={cityRef}
            className="poster-city"
            style={{
              fontFamily: titleFont,
              ...captionTextStyle,
              top: squareCaption ? `${cityY}%` : `${(cityLayout.isMultiLine ? TEXT_CITY_Y_RATIO - 0.015 : TEXT_CITY_Y_RATIO) * 100}%`,
              fontSize: cityFontSize,
              lineHeight: 1.08,
            }}
          >
            {cityLayout.lines.map((line, idx) => (
              <span
                key={idx}
                className="poster-city-line"
                style={{
                  display: "inline-block",
                  maxWidth: "100%",
                  fontSize: idx === 0 && line.includes("CITY OF") ? "0.68em" : undefined,
                  fontWeight: idx === 0 && line.includes("CITY OF") ? 500 : 700,
                }}
              >
                {line}
                {idx < cityLayout.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </div>
          {city ? <hr
            className="poster-divider"
            style={{
              borderColor: safeTextColor,
              ...dividerStyle,
              top: squareCaption ? `${cityY + captionLineStep * 0.72}%` : `${TEXT_DIVIDER_Y_RATIO * 100}%`,
            }}
          /> : null}
          {country ? <p
            className="poster-country"
            style={{
              fontFamily: titleFont,
              ...captionTextStyle,
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
                ...captionTextStyle,
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
              ...captionTextStyle,
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
