import { useLayoutEffect, useRef, useState } from "react";
import { formatCoordinates } from "@/shared/geo/posterBounds";
import { APP_CREDIT_URL } from "@/core/config";
import type { SquareCaptionGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import type { FrameLayoutGeometry } from "@/features/layout/domain/frameLayoutGeometry";
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
  headingFontFamily?: string;
  headingFontSize?: number;
  midlineFontFamily?: string;
  midlineFontSize?: number;
  bottomLineFontFamily?: string;
  bottomLineFontSize?: number;
  textAlign?: "left" | "center" | "right";
  textPosition?: "top" | "center" | "bottom";
  textColor: string;
  landColor: string;
  showPosterText: boolean;
  includeCredits: boolean;
  showOverlay: boolean;
  customDate?: string;
  squareCaption?: boolean;
  /** Circle layout: the map slot is round, text placement comes from the geometry. */
  circleCaption?: boolean;
  squareCaptionGeometry?: SquareCaptionGeometry | null;
  frameLayoutGeometry?: FrameLayoutGeometry | null;
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
  headingFontFamily: headingFontFamilyProp,
  headingFontSize: headingFontSizeProp,
  midlineFontFamily: midlineFontFamilyProp,
  midlineFontSize: midlineFontSizeProp,
  bottomLineFontFamily: bottomLineFontFamilyProp,
  bottomLineFontSize: bottomLineFontSizeProp,
  textAlign = "center",
  textPosition = "bottom",
  textColor,
  landColor,
  showPosterText,
  includeCredits,
  showOverlay,
  customDate,
  squareCaption = false,
  circleCaption = false,
  squareCaptionGeometry,
  frameLayoutGeometry,
  isCustomColor = false,
  posterWidthCm = 21,
  posterHeightCm = 29.7,
}: PosterTextOverlayProps) {
  const toCqMin = (px: number) => (px / TEXT_DIMENSION_REFERENCE_PX) * 100;
  const fontScale = getPosterFontScale(fontSize);
  const headingScale = getPosterFontScale(headingFontSizeProp ?? fontSize);
  const midlineScale = getPosterFontScale(midlineFontSizeProp ?? fontSize);
  const bottomLineScale = getPosterFontScale(bottomLineFontSizeProp ?? fontSize);

  const headingFamily = headingFontFamilyProp?.trim() || fontFamily;
  const midlineFamily = midlineFontFamilyProp?.trim() || fontFamily;
  const bottomLineFamily = bottomLineFontFamilyProp?.trim() || fontFamily;

  const fontStack = (family: string, body = false) => {
    const isSerif = /serif|times|cormorant|baskerville|lora|merriweather|playfair/i.test(family || "");
    if (body) {
      return isSerif
        ? `"${family}", 'Times New Roman', Times, serif`
        : (family ? `"${family}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace');
    }
    return family
      ? `"${family}", ${isSerif ? "'Times New Roman', Times, serif" : '"Space Grotesk", sans-serif'}`
      : '"Space Grotesk", sans-serif';
  };

  const headingFont = fontStack(headingFamily);
  const midlineFont = fontStack(midlineFamily);
  const bottomLineFont = fontStack(bottomLineFamily, true);
  const bodyFont = fontStack(fontFamily, true);

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

  const cityFontSize = `${toCqMin(CITY_FONT_BASE_PX * headingScale) * cityFontScale}cqmin`;
  const countryFontSize = `${toCqMin(COUNTRY_FONT_BASE_PX * midlineScale)}cqmin`;
  const coordsFontSize = `${toCqMin(COORDS_FONT_BASE_PX * bottomLineScale)}cqmin`;
  const taglineFontSize = `${toCqMin(68 * bottomLineScale)}cqmin`;
  const attributionFontSize = `${toCqMin(ATTRIBUTION_FONT_BASE_PX * fontScale)}cqmin`;
  const maparteFontSize = `${toCqMin(80 * fontScale)}cqmin`;
  const safeTextColor = ensureContrastTextColor(textColor, landColor, isCustomColor);
  const attributionColor = frameLayoutGeometry?.style === "dark"
    ? "#ffffff"
    : computeAttributionColor(safeTextColor, landColor, showOverlay);
  const attributionOpacity = frameLayoutGeometry?.style === "dark" ? 0.95 : (showOverlay ? 0.65 : 0.95);
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

  // Trailing letter-spacing (in em) that browsers add after the last glyph. It is
  // compensated below so the visible name is optically centred / flush, and
  // removed from the measured width so the rule matches the visible letters.
  const letterSpacingEm = Number.parseFloat(cityLetterSpacing) || 0;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const el = cityRef.current;
    if (!el) return;

    const measure = () => {
      const stack = el.parentElement;
      if (!stack) return;
      // Widest visible line of the title, measured on the text itself (the line
      // elements are blocks, so their own box would report the full column width).
      let widest = 0;
      const lines = el.querySelectorAll<HTMLElement>(".poster-city-line");
      lines.forEach((line) => {
        const range = document.createRange();
        range.selectNodeContents(line);
        const textWidth = range.getBoundingClientRect().width;
        const style = window.getComputedStyle(line);
        const trailing = Number.parseFloat(style.letterSpacing) || 0;
        const padding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
        const ink = Math.max(0, textWidth - padding - trailing);
        if (ink > widest) widest = ink;
      });
      const stackStyle = window.getComputedStyle(stack);
      const contentWidth =
        stack.getBoundingClientRect().width -
        (Number.parseFloat(stackStyle.paddingLeft) || 0) -
        (Number.parseFloat(stackStyle.paddingRight) || 0);
      if (contentWidth > 0 && widest > 0) {
        setCityTextWidthPercent(Number(Math.min(100, (widest / contentWidth) * 100).toFixed(3)));
      }
    };

    measure();
    let cancelled = false;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(() => { if (!cancelled) measure(); }).catch(() => undefined);
    fonts?.addEventListener?.("loadingdone", measure);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    if (el.parentElement) observer?.observe(el.parentElement);
    return () => {
      cancelled = true;
      fonts?.removeEventListener?.("loadingdone", measure);
      observer?.disconnect();
    };
  }, [city, cityLayout, fontFamily, fontSize, headingFamily, headingScale, squareCaption, isLandscape, align, cityLetterSpacing, showPosterText, geometry?.captionWidth]);

  const approxCharUnits = Math.max(...cityLayout.lines.map((line) => line.length), 4);
  const fallbackDividerWidth = squareCaption
    ? (isLandscape ? 28 : 22)
    : Math.min(48, Math.max(12, approxCharUnits * 2.2));
  const dividerWidth = cityTextWidthPercent ?? fallbackDividerWidth;

  let stackPositionStyle: React.CSSProperties;

  if (squareCaption && geometry) {
    if (!isLandscape) {
      if (captionVariant === "top-left" || captionVariant === "bottom-left") {
        stackPositionStyle = {
          top: `${(geometry.captionY / geometry.posterHeight) * 100}%`,
          left: `${(geometry.safeInsetX / geometry.posterWidth) * 100}%`,
          width: `${(geometry.captionWidth / geometry.posterWidth) * 100}%`,
          transform: "translateY(-50%)",
          alignItems: "flex-start",
          textAlign: "left",
        };
      } else if (captionVariant === "top-center") {
        stackPositionStyle = {
          top: `${(geometry.captionY / geometry.posterHeight) * 100}%`,
          transform: "translateY(-50%)",
          left: `${(geometry.x / geometry.posterWidth) * 100}%`,
          width: `${(geometry.size / geometry.posterWidth) * 100}%`,
          alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          textAlign: align,
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
      // Landscape: side column (left or right)
      const colLeftPercent = (geometry.captionXStart / geometry.posterWidth) * 100;
      const colWidthPercent = (geometry.captionWidth / geometry.posterWidth) * 100;
      const isTopCorner = captionVariant === "top-left";
      const isBottomCorner = captionVariant === "bottom-left";

      stackPositionStyle = {
        left: `${colLeftPercent}%`,
        width: `${colWidthPercent}%`,
        top: isTopCorner
          ? `${(geometry.captionY / geometry.posterHeight) * 100}%`
          : isBottomCorner
            ? `${(geometry.captionY / geometry.posterHeight) * 100}%`
            : "50%",
        transform: isTopCorner || isBottomCorner ? "none" : "translateY(-50%)",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        textAlign: align,
        paddingInline: "4px",
      };
    }
  } else if (frameLayoutGeometry && frameLayoutGeometry.style !== "full-map") {
    const fg = frameLayoutGeometry;
    if (fg.style === "box") {
      stackPositionStyle = {
        top: `${(fg.captionY / fg.posterHeight) * 100}%`,
        left: `${((fg.captionX - fg.captionWidth / 2) / fg.posterWidth) * 100}%`,
        width: `${(fg.captionWidth / fg.posterWidth) * 100}%`,
        transform: "translateY(-50%)",
        alignItems: "center",
        textAlign: "center",
        paddingInline: "4%",
        zIndex: 5,
      };
    } else {
      const topCenterY = fg.y + fg.height + fg.captionHeight / 2;
      stackPositionStyle = {
        top: `${(topCenterY / fg.posterHeight) * 100}%`,
        left: `${(fg.x / fg.posterWidth) * 100}%`,
        width: `${(fg.width / fg.posterWidth) * 100}%`,
        transform: "translateY(-50%)",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        textAlign: align,
        paddingInline: "2%",
      };
    }
  } else {
    // Standard Layouts (Portrait / Landscape / Social)
    const position = textPosition ?? "bottom";
    let standardTopPercent: number;
    if (position === "top") {
      standardTopPercent = 14;
    } else if (position === "center") {
      standardTopPercent = 50;
    } else {
      standardTopPercent = (cityLayout.isMultiLine ? TEXT_CITY_Y_RATIO - 0.015 : TEXT_CITY_Y_RATIO) * 100;
    }

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

  const effectiveTextColor = frameLayoutGeometry?.style === "dark"
    ? "#ffffff"
    : frameLayoutGeometry?.style === "box"
      ? "#111111"
      : safeTextColor;

  return (
    <div className={`poster-text-overlay${squareCaption ? " is-square-caption-text" : ""}${circleCaption ? " is-circle-caption-text" : ""}`} style={{ color: effectiveTextColor }}>
      {showPosterText && (
        <div className="poster-caption-stack" style={stackPositionStyle}>
          <div
            ref={cityRef}
            className="poster-city"
            style={{
              fontFamily: headingFont,
              fontSize: cityFontSize,
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
                  paddingLeft: align === "center" ? `${letterSpacingEm}em` : undefined,
                  marginRight: align === "right" ? `${-letterSpacingEm}em` : undefined,
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
                fontFamily: midlineFont,
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
                fontFamily: bottomLineFont,
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
              fontFamily: bottomLineFont,
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
            bottom: squareCaption && geometry
              ? isLandscape
                ? `${((geometry.posterHeight - (geometry.y + geometry.size) + geometry.size * 0.02) / geometry.posterHeight) * 100}%`
                : `${(geometry.safeInsetY / geometry.posterHeight) * 100}%`
              : "calc(2.5% + 0.2mm)",
            left: squareCaption && geometry
              ? isLandscape
                ? `${((geometry.x + geometry.size * 0.025) / geometry.posterWidth) * 100}%`
                : `${(geometry.safeInsetX / geometry.posterWidth) * 100}%`
              : "calc(2.5% + 0.2mm)",
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
