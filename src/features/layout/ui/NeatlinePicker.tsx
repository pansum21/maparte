import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./neatline.css";

const CONFIG_STORAGE_KEY = "maparte_neatline_layers";
const LEGACY_STYLE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
export const NEATLINE_CHANGE_EVENT = "maparte:neatline:change";
export const NEATLINE_RESET_EVENT = "maparte:neatline:reset";
const MIN_MAP_GAP_CM = 0.0;
const MAX_MAP_GAP_CM = 1.00;
const BORDER_CONTROL_STEP_CM = 0.01;
const GAP_CONTROL_STEP_CM = 0.01;
const SLIDER_MAX_LINE_WIDTH_CM = 0.40;
const SLIDER_MAX_GAP_CM = 0.35;
const BORDER_UNITS_PER_CM = 48;

function stepWithinRange(value: number, delta: number, min: number, max: number, step: number) {
  const stepsFromMin = Math.round((value - min) / step) + delta;
  return Math.min(max, Math.max(min, Number((min + stepsFromMin * step).toFixed(2))));
}

export type LinePattern =
  | "single"
  | "double"
  | "thick-thin"
  | "thin-thick"
  | "dashed"
  | "dotted"
  | "dash-dot"
  | "corner-crosshairs"
  | "wide-gallery"
  | "triple"
  | "triple-sandwich"
  | "line-dash-dot"
  | "dot-dash-line";

export type LineStyle = {
  id: string;
  name: string;
  kind: "line";
  pattern: LinePattern;
};
export type BorderStyle = LineStyle;
export type ArtVariant = "plain" | "colorful";
export type CornerPosition = "all";
export type BorderColorMode = "single" | "mix";

export interface ColorCapsuleItem {
  id: string;
  hex: string;
}

export interface MixGradientPreset {
  id: string;
  from: string;
  to: string;
}

export const RAINBOW_COLORS: ColorCapsuleItem[] = [
  { id: "red", hex: "#ef4444" },
  { id: "orange", hex: "#f97316" },
  { id: "yellow", hex: "#eab308" },
  { id: "green", hex: "#22c55e" },
  { id: "blue", hex: "#3b82f6" },
  { id: "indigo", hex: "#4f46e5" },
  { id: "violet", hex: "#9333ea" },
];

export const SINGLE_COLOR_SWATCHES: { id: string; hex: string; name: string }[] = [
  { id: "black", hex: "#000000", name: "Black" },
  { id: "gray", hex: "#6b7280", name: "Gray" },
  { id: "light-gray", hex: "#d1d5db", name: "Light Gray" },
];

export const MIX_GRADIENT_PRESETS: MixGradientPreset[] = [
  { id: "noir", from: "#000000", to: "#475569" },
  { id: "charcoal-silver", from: "#0f172a", to: "#94a3b8" },
  { id: "onyx-white", from: "#000000", to: "#e2e8f0" },
  { id: "black-gold", from: "#0a0a0a", to: "#d4af37" },
];

export type NeatlineSelection = {
  lineId: string;
  /** Kept only to safely migrate old saved projects; corner art is no longer offered. */
  cornerId: string;
  frameId: string;
  cornerPosition: CornerPosition;
  thicknesses: Record<string, number[]>;
  lineVariant: ArtVariant;
  cornerVariant: "plain";
  mapGapCm?: number;
  colorMode?: BorderColorMode;
  singleColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  designScale?: number;
  showWhiteMat?: boolean;
};

export const lineStyles: LineStyle[] = [
  // 1-Line
  { id: "neatline-single", name: "Single line", kind: "line", pattern: "single" },

  // 2-Line Sequence
  { id: "neatline-double", name: "Double line", kind: "line", pattern: "double" },
  { id: "neatline-thick-thin", name: "Thick-Thin", kind: "line", pattern: "thick-thin" },
  { id: "neatline-thin-thick", name: "Thin-Thick", kind: "line", pattern: "thin-thick" },
  { id: "neatline-dashed", name: "Modern Dashed", kind: "line", pattern: "dashed" },
  { id: "neatline-dotted", name: "Fine Dotted", kind: "line", pattern: "dotted" },
  { id: "neatline-dash-dot", name: "Dash-Dot", kind: "line", pattern: "dash-dot" },
  { id: "neatline-corner-crosshairs", name: "Corner Crosshairs", kind: "line", pattern: "corner-crosshairs" },
  { id: "neatline-wide-gallery", name: "Wide Gallery", kind: "line", pattern: "wide-gallery" },

  // 3-Line Sequence
  { id: "neatline-triple", name: "Triple line", kind: "line", pattern: "triple" },
  { id: "neatline-triple-sandwich", name: "Thin-Thick-Thin", kind: "line", pattern: "triple-sandwich" },
  { id: "neatline-line-dash-dot", name: "Line-Dash-Dot", kind: "line", pattern: "line-dash-dot" },
  { id: "neatline-dot-dash-line", name: "Dot-Dash-Line", kind: "line", pattern: "dot-dash-line" },
];
export const NEATLINE_STYLES = lineStyles;

export const DEFAULT_LINE_WIDTHS_CM: Record<LinePattern, number[]> = {
  single: [0.10],
  double: [0.10, 0.06],
  "thick-thin": [0.15, 0.06],
  "thin-thick": [0.06, 0.15],
  dashed: [0.10, 0.06],
  dotted: [0.06, 0.14],
  "dash-dot": [0.10, 0.06],
  "corner-crosshairs": [0.10, 0.05],
  "wide-gallery": [0.04, 0.18],
  triple: [0.10, 0.06, 0.05],
  "triple-sandwich": [0.06, 0.14, 0.06],
  "line-dash-dot": [0.08, 0.08, 0.10],
  "dot-dash-line": [0.10, 0.08, 0.08],
};

export const MAX_LINE_WIDTH_CM = 1.00;
export const MIN_LINE_WIDTH_CM = 0.05;

const DEFAULT_LINE_WIDTHS: Record<LinePattern, number[]> = Object.fromEntries(
  Object.entries(DEFAULT_LINE_WIDTHS_CM).map(([pattern, arr]) => [
    pattern,
    arr.map((cm) => cm * BORDER_UNITS_PER_CM),
  ]),
) as Record<LinePattern, number[]>;

const LINE_COLORS: Record<"top" | "right" | "bottom" | "left", string> = {
  top: "#b44737",
  right: "#276b62",
  bottom: "#bd8735",
  left: "#526b9b",
};

const OUTER_EDGE_CLEARANCE_CM = 0.001; // 0.01 mm between the outer stroke and paper edge

export function hasPatternDesign(_pattern: LinePattern): boolean {
  return false;
}

export function getBorderCategoryTag(pattern: LinePattern): string {
  switch (pattern) {
    case "single":
      return "1-Line Minimal";
    case "double":
      return "2-Line Classic";
    case "thick-thin":
      return "Gallery Mat";
    case "thin-thick":
      return "Inset Frame";
    case "dashed":
      return "Dashed Border";
    case "dotted":
      return "Pin-Dot Border";
    case "dash-dot":
      return "CAD Metric";
    case "corner-crosshairs":
      return "Swiss Precision";
    case "wide-gallery":
      return "Luxury Gallery";
    case "triple":
      return "3-Line Stripe";
    case "triple-sandwich":
      return "3-Tier Frame";
    case "line-dash-dot":
      return "3-Layer Hybrid";
    case "dot-dash-line":
      return "3-Layer Inverse";
    default:
      return "Line Border";
  }
}

export function getPatternSpanUnits(
  pattern: LinePattern,
  widths: number[] = [],
  designScale = 1.0,
): number {
  const clearGap = pattern === "wide-gallery" ? 18.0 * designScale : 6.0 * designScale;
  switch (pattern) {
    case "single":
      return 0;
    case "double":
    case "thick-thin":
    case "thin-thick":
    case "dashed":
    case "dotted":
    case "dash-dot":
    case "corner-crosshairs":
    case "wide-gallery": {
      const w0 = widths[0] ?? 4.8;
      const w1 = widths[1] ?? 4.8;
      return (w0 + w1) / 2 + clearGap;
    }
    case "triple":
    case "triple-sandwich": {
      const w0 = widths[0] ?? 4.8;
      const w1 = widths[1] ?? 4.8;
      const w2 = widths[2] ?? 4.8;
      return (w0 + 2 * w1 + w2) / 2 + 2 * clearGap;
    }
    default: {
      const w0 = widths[0] ?? 4.8;
      const w1 = widths[1] ?? 4.8;
      return (w0 + w1) / 2 + clearGap;
    }
  }
}

/** Center positions for each printed line, leaving the same clear gap between every pair. */
function getBorderLayerOffsets(
  pattern: LinePattern,
  widths: number[],
  edgeInset: number,
  designScale = 1.0,
): number[] {
  const clearGap = pattern === "wide-gallery" ? 18.0 * designScale : 6.0 * designScale;
  if (pattern === "single") return [edgeInset];

  const offsets = [edgeInset];
  for (let index = 0; index < lineCount(pattern) - 1; index += 1) {
    const currentWidth = widths[index] ?? widths[0] ?? 4.8;
    const nextWidth = widths[index + 1] ?? currentWidth;
    offsets.push(
      (offsets[index] ?? edgeInset) + currentWidth / 2 + clearGap + nextWidth / 2,
    );
  }
  return offsets;
}

/** Shared physical measurements for the mat, map opening, and border art. */
export function getPosterBorderMetrics(
  widthValue?: string | number,
  heightValue?: string | number,
  customGapCm?: number,
  lineId?: string,
  thicknesses?: Record<string, number[]>,
  designScale = 1.0,
  showWhiteMatParam?: boolean,
) {
  const width = Number(widthValue) > 0 ? Number(widthValue) : 21;
  const height = Number(heightValue) > 0 ? Number(heightValue) : 29.7;
  const shortSide = Math.min(width, height);
  const hasBorder = Boolean(lineId && lineId !== "none");
  // Use a fixed unit scale so physical line widths stay identical on every
  // poster size. A fixed 1000-unit viewBox made wide layouts render borders
  // much too thick and small layouts render them too thin.
  const innerW = width * BORDER_UNITS_PER_CM;

  // Automatically activate white mat behind border when any border is selected.
  // When no border ("none"), full bleed without white mat.
  const showWhiteMat = Boolean(hasBorder && showWhiteMatParam === true);

  // Default gap is 0.1cm (1.0 mm between map and innermost thin line).
  const gapCm =
    typeof customGapCm === "number" && Number.isFinite(customGapCm)
      ? Math.max(MIN_MAP_GAP_CM, Math.min(MAX_MAP_GAP_CM, customGapCm))
      : 0.1;

  // Sleek, modern white border width (~3.5mm - 5mm on standard posters, not broad 10mm / 1cm)
  const targetMatRatio = 0.022;
  const targetMapInset = Math.max(0.40, Math.min(0.85, shortSide * targetMatRatio));
  const outerMarginCm = OUTER_EDGE_CLEARANCE_CM;

  if (!showWhiteMat) {
    if (!hasBorder) {
      const innerH = (innerW * height) / width;
      return {
        showWhiteMat: false,
        outerMatCm: 0,
        frameArtInsetCm: 0,
        borderBandCm: 0,
        mapInsetCm: 0,
        gapCm: 0,
        spanUnits: 0,
        edgeInset: 1.5,
        offInner: 1.5,
        unitScale: BORDER_UNITS_PER_CM,
        innerW,
        innerH,
        mapInsetX: "0%",
        mapInsetY: "0%",
        matInsetX: "0%",
        matInsetY: "0%",
        mapInsetXRatio: 0,
        mapInsetYRatio: 0,
        matInsetXRatio: 0,
        matInsetYRatio: 0,
        usableWidthCm: width,
        usableHeightCm: height,
      };
    }

    // Keep the outer stroke 0.1 mm from the paper edge. The map opening is
    // measured from the actual inner stroke edge, so a zero gap touches it.
    const outerBorderCm = outerMarginCm;
    // Border artwork fills the whole poster box; the 0.1 mm paper margin is
    // part of its viewBox, not an extra inset around the SVG.
    const usableWidthCm = width;
    const usableHeightCm = height;
    const innerH = (innerW * usableHeightCm) / usableWidthCm;
    const unitScale = BORDER_UNITS_PER_CM;

    let spanUnits = 0;
    let edgeInset = 1.5;
    let offInner = edgeInset;
    let borderBandCm = 0;

    const style = lineStyles.find((s) => s.id === lineId);
    if (style) {
      const widths = widthsFor(style.id, thicknesses || {});
      const outerStrokeWidth = widths[0] ?? 2.0;
      edgeInset = outerStrokeWidth / 2 + outerBorderCm * unitScale;
      const offsets = getBorderLayerOffsets(style.pattern, widths, edgeInset, designScale);
      offInner = offsets[offsets.length - 1] ?? edgeInset;
      const rawSpan = offInner - edgeInset;
      spanUnits = rawSpan;
      offInner = edgeInset + spanUnits;
      const innerStrokeWidth = widths[widths.length - 1] ?? outerStrokeWidth;
      const outerEdgeUnits = edgeInset - outerStrokeWidth / 2;
      const innerEdgeUnits = offInner + innerStrokeWidth / 2;
      borderBandCm = (innerEdgeUnits - outerEdgeUnits) / unitScale;
    }

    const mapInsetCm = outerBorderCm + borderBandCm + gapCm;
    const mapInsetXRatio = mapInsetCm / width;
    const mapInsetYRatio = mapInsetCm / height;
    const matInsetXRatio = 0;
    const matInsetYRatio = 0;

    return {
      showWhiteMat: false,
      outerMatCm: outerBorderCm,
      frameArtInsetCm: 0,
      borderBandCm,
      mapInsetCm,
      gapCm,
      spanUnits,
      edgeInset,
      offInner,
      unitScale,
      innerW,
      innerH,
      mapInsetX: `${mapInsetXRatio * 100}%`,
      mapInsetY: `${mapInsetYRatio * 100}%`,
      matInsetX: `${matInsetXRatio * 100}%`,
      matInsetY: `${matInsetYRatio * 100}%`,
      mapInsetXRatio,
      mapInsetYRatio,
      matInsetXRatio,
      matInsetYRatio,
      usableWidthCm,
      usableHeightCm,
    };
  }

  // When white mat is ON:
  // An elegant, sleek white gallery paper sheet (~4mm) frames the map.
  if (!hasBorder) {
    const mapInsetCm = targetMapInset;
    const outerMatCm = mapInsetCm;
    const usableWidthCm = Math.max(0.1, width - outerMatCm * 2);
    const usableHeightCm = Math.max(0.1, height - outerMatCm * 2);
    const innerH = (innerW * usableHeightCm) / usableWidthCm;
    const unitScale = BORDER_UNITS_PER_CM;
    const mapInsetXRatio = mapInsetCm / width;
    const mapInsetYRatio = mapInsetCm / height;
    const matInsetXRatio = mapInsetXRatio;
    const matInsetYRatio = mapInsetYRatio;

    return {
      showWhiteMat: true,
      outerMatCm,
      frameArtInsetCm: 0,
      borderBandCm: 0,
      mapInsetCm,
      gapCm: 0,
      spanUnits: 0,
      edgeInset: 1.5,
      offInner: 1.5,
      unitScale,
      innerW,
      innerH,
      mapInsetX: `${mapInsetXRatio * 100}%`,
      mapInsetY: `${mapInsetYRatio * 100}%`,
      matInsetX: `${matInsetXRatio * 100}%`,
      matInsetY: `${matInsetYRatio * 100}%`,
      mapInsetXRatio,
      mapInsetYRatio,
      matInsetXRatio,
      matInsetYRatio,
      usableWidthCm,
      usableHeightCm,
    };
  }

  // White mat ON + Border selected: keep a 0.1 mm paper-edge clearance;
  // the innermost stroke meets the map unless the user adds an inner gap.
  const outerMatCm = outerMarginCm;
  // SVG spans the full paper; the outside clearance is measured inside this
  // coordinate space so every responsive transform preserves it exactly.
  const usableWidthCm = width;
  const usableHeightCm = height;
  let innerH = (innerW * usableHeightCm) / usableWidthCm;
  const unitScale = BORDER_UNITS_PER_CM;

  let spanUnits = 0;
  let edgeInset = 1.5;
  let offInner = edgeInset;
  let innerStrokeWidth = 2.0;
  let outerStrokeWidth = 2.0;

  const style = lineStyles.find((s) => s.id === lineId);
  if (style) {
    const widths = widthsFor(style.id, thicknesses || {});
    outerStrokeWidth = widths[0] ?? 2.0;
    edgeInset = outerStrokeWidth / 2 + outerMatCm * unitScale;
    const offsets = getBorderLayerOffsets(style.pattern, widths, edgeInset, designScale);
    offInner = offsets[offsets.length - 1] ?? edgeInset;
    const rawSpan = offInner - edgeInset;
    spanUnits = rawSpan;
    offInner = edgeInset + spanUnits;
    innerStrokeWidth = widths[widths.length - 1] ?? outerStrokeWidth;
  }
  const outerEdgeUnits = edgeInset - outerStrokeWidth / 2;
  const innerEdgeUnits = offInner + innerStrokeWidth / 2;
  const borderBandCm = (innerEdgeUnits - outerEdgeUnits) / unitScale;

  // A zero gap puts the map edge directly against the innermost stroke.
  const mapInsetCm = outerMatCm + borderBandCm + gapCm;
  const mapInsetXRatio = mapInsetCm / width;
  const mapInsetYRatio = mapInsetCm / height;
  const matInsetXRatio = 0;
  const matInsetYRatio = 0;

  return {
    showWhiteMat: true,
    outerMatCm,
    frameArtInsetCm: 0,
    borderBandCm,
    mapInsetCm,
    gapCm,
    spanUnits,
    edgeInset,
    offInner,
    unitScale,
    innerW,
    innerH,
    mapInsetX: `${mapInsetXRatio * 100}%`,
    mapInsetY: `${mapInsetYRatio * 100}%`,
    matInsetX: `${matInsetXRatio * 100}%`,
    matInsetY: `${matInsetYRatio * 100}%`,
    mapInsetXRatio,
    mapInsetYRatio,
    matInsetXRatio,
    matInsetYRatio,
    usableWidthCm,
    usableHeightCm,
  };
}

function lineCount(pattern: LinePattern): number {
  switch (pattern) {
    case "single":
      return 1;
    case "double":
    case "thick-thin":
    case "thin-thick":
    case "dashed":
    case "dotted":
    case "dash-dot":
    case "corner-crosshairs":
    case "wide-gallery":
      return 2;
    case "triple":
    case "triple-sandwich":
    case "line-dash-dot":
    case "dot-dash-line":
      return 3;
    default:
      return 1;
  }
}

function isLineId(value: string): boolean {
  return Boolean(value && value !== "none" && lineStyles.some((style) => style.id === value));
}

function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(
      window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}",
    );
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, number[]>)
      : {};
  } catch {
    return {};
  }
}

function readSelection(): NeatlineSelection {
  const empty: NeatlineSelection = {
    lineId: "none",
    cornerId: "none",
    frameId: "none",
    cornerPosition: "all",
    thicknesses: readThicknesses(),
    lineVariant: "plain",
    cornerVariant: "plain",
    mapGapCm: 0.1,
    colorMode: "single",
    singleColor: "#0f172a",
    gradientFrom: "#000000",
    gradientTo: "#475569",
    designScale: 1.0,
    showWhiteMat: false,
  };
  if (typeof window === "undefined") return empty;
  try {
    // 1. Check URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const urlBorder = searchParams.get("border") || searchParams.get("neatline");
    const urlGap = searchParams.get("mapGap") || searchParams.get("gap");
    const urlTheme = searchParams.get("theme") || "";
    const isDark = urlTheme.includes("midnight") || urlTheme.includes("noir") || urlTheme.includes("asphalt");
    const defaultColor = isDark ? "#dfba73" : "#0f172a";

    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NeatlineSelection>;
      const colorMode: BorderColorMode =
        parsed.colorMode === "mix" || parsed.colorMode === "single"
          ? parsed.colorMode
          : parsed.lineVariant === "colorful"
            ? "mix"
            : "single";

      let lineId = "none";
      if (urlBorder && isLineId(urlBorder)) {
        lineId = urlBorder;
      } else if (parsed.lineId && isLineId(parsed.lineId)) {
        lineId = parsed.lineId;
      }
      const showWhiteMat = false;

      return {
        ...empty,
        lineId,
        cornerId: "none",
        frameId: "none",
        lineVariant: colorMode === "mix" ? "colorful" : "plain",
        thicknesses: readThicknesses(),
        mapGapCm:
          urlGap && !isNaN(Number(urlGap))
            ? Math.max(MIN_MAP_GAP_CM, Math.min(MAX_MAP_GAP_CM, Number(urlGap)))
            : typeof parsed.mapGapCm === "number" && Number.isFinite(parsed.mapGapCm)
              ? Math.max(MIN_MAP_GAP_CM, Math.min(MAX_MAP_GAP_CM, parsed.mapGapCm))
              : 0.1,
        colorMode,
        singleColor:
          parsed.singleColor && parsed.singleColor !== "#354b62"
            ? parsed.singleColor
            : "#000000",
        gradientFrom: parsed.gradientFrom || "#000000",
        gradientTo: parsed.gradientTo || "#475569",
        designScale:
          typeof parsed.designScale === "number" && Number.isFinite(parsed.designScale)
            ? Math.max(0.5, Math.min(2.5, parsed.designScale))
            : 1.0,
        showWhiteMat,
      };
    }
    if (urlBorder && isLineId(urlBorder)) {
      empty.lineId = urlBorder;
      empty.showWhiteMat = false;
      empty.mapGapCm = 0.1;
      empty.singleColor = defaultColor;
      return empty;
    }
    const legacy = window.localStorage.getItem(LEGACY_STYLE_KEY);
    if (legacy && legacy !== "none" && isLineId(legacy)) {
      empty.lineId = legacy;
      empty.showWhiteMat = false;
      empty.mapGapCm = 0.1;
    }
    return empty;
  } catch {
    return empty;
  }
}

export function readNeatlineSelection(): NeatlineSelection {
  return readSelection();
}

export function resetNeatlineSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CONFIG_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STYLE_KEY);
  window.localStorage.removeItem(THICKNESS_STORAGE_KEY);
  const empty = readSelection();
  window.dispatchEvent(new Event(NEATLINE_RESET_EVENT));
  window.dispatchEvent(
    new CustomEvent<NeatlineSelection>(NEATLINE_CHANGE_EVENT, { detail: empty }),
  );
}

export function thicknessesInCm(
  styleId: string,
  thicknesses: Record<string, number[]>,
): number[] {
  const style = lineStyles.find((item) => item.id === styleId);
  if (!style) return [];
  const saved = thicknesses[styleId] || [];
  const defaults = DEFAULT_LINE_WIDTHS_CM[style.pattern] || [0.10];
  return Array.from({ length: lineCount(style.pattern) }, (_, index) => {
    const value = Number(saved[index]);
    if (!Number.isFinite(value)) return defaults[index] ?? 0.10;
    // Migrate legacy SVG-unit values (> 1.05) to cm
    const cm = value > 1.05 ? value / BORDER_UNITS_PER_CM : value;
    return Math.min(MAX_LINE_WIDTH_CM, Math.max(MIN_LINE_WIDTH_CM, Math.round(cm * 100) / 100));
  });
}

export function widthsFor(
  styleId: string,
  thicknesses: Record<string, number[]>,
): number[] {
  const cmArr = thicknessesInCm(styleId, thicknesses);
  return cmArr.map((cm) => cm * BORDER_UNITS_PER_CM);
}

function lineLabel(pattern: LinePattern, index: number): string {
  switch (pattern) {
    case "single":
      return "Line thickness";
    case "double":
      return index === 0 ? "Outer line" : "Inner line";
    case "triple":
      return ["Outer line", "Middle line", "Inner line"][index] ?? "Line";
    case "thick-thin":
      return index === 0 ? "Outer thick line" : "Inner thin line";
    case "thin-thick":
      return index === 0 ? "Outer thin line" : "Inner thick line";
    case "triple-sandwich":
      return ["Outer thin line", "Center thick line", "Inner thin line"][index] ?? "Line";
    case "dashed":
      return index === 0 ? "Dashed line thickness" : "Inner solid line";
    case "dotted":
      return index === 0 ? "Outer solid line" : "Dot size";
    case "dash-dot":
      return index === 0 ? "Dash-Dot line thickness" : "Inner solid line";
    case "corner-crosshairs":
      return index === 0 ? "Outer crosshair frame" : "Inner precision line";
    case "wide-gallery":
      return index === 0 ? "Outer hairline" : "Inner gallery frame";
    case "line-dash-dot":
      return ["Outer solid line", "Middle dashed line", "Inner dotted line"][index] ?? "Line";
    case "dot-dash-line":
      return ["Outer dotted line", "Middle dashed line", "Inner solid line"][index] ?? "Line";
    default:
      return `Line ${index + 1}`;
  }
}

function AdjustmentInfo({ label, help }: { label: string; help: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  return (
    <span className="neatline-info-wrap">
      <button
        type="button"
        className="neatline-info-button"
        aria-label={`Info: ${label}`}
        aria-expanded={open}
        aria-controls={tooltipId}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ? (
        <span className="neatline-info-tooltip" id={tooltipId} role="tooltip">
          {help}
        </span>
      ) : null}
    </span>
  );
}

export function NeatlineArtwork({
  selection,
  className = "",
  widthCm,
  heightCm,
}: {
  selection: NeatlineSelection;
  className?: string;
  widthCm?: string;
  heightCm?: string;
}) {
  const line = lineStyles.find((style) => style.id === selection.lineId);
  if (!line) return null;

  const metrics = getPosterBorderMetrics(
    widthCm,
    heightCm,
    selection.mapGapCm,
    selection.lineId,
    selection.thicknesses,
    selection.designScale,
    selection.showWhiteMat,
  );
  const { innerW, innerH, edgeInset, offInner } = metrics;
  const designScale = selection.designScale ?? 1.0;
  const widths = widthsFor(line.id, selection.thicknesses);
  const layerOffsets = getBorderLayerOffsets(
    line.pattern,
    widths,
    edgeInset,
    selection.designScale ?? 1.0,
  );
  const maxStroke = widths.length ? Math.max(...widths) : 1;
  const isMix = selection.colorMode === "mix";
  const gradId = `neatline-grad-${className ? className.trim().replace(/\s+/g, "-") : "main"}`;
  const fromColor = selection.gradientFrom || "#f43f5e";
  const toColor = selection.gradientTo || "#fb923c";
  const singleColor = selection.singleColor || "#0f172a";

  const strokeColor = isMix ? `url(#${gradId})` : singleColor;
  const primaryColor = strokeColor;
  const secondaryColor = strokeColor;

  const gradientDef = isMix ? (
    <defs>
      <linearGradient
        id={gradId}
        x1="0"
        y1="0"
        x2={innerW}
        y2={innerH}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor={fromColor} />
        <stop offset="100%" stopColor={toColor} />
      </linearGradient>
    </defs>
  ) : null;

  // Render based on pattern
  switch (line.pattern) {
    case "single":
    case "double":
    case "triple": {
      const offsets =
        line.pattern === "double"
          ? layerOffsets
          : line.pattern === "triple"
            ? layerOffsets
            : [edgeInset];

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {offsets.map((offset, index) => {
            const start = offset;
            const endX = innerW - offset;
            const endY = innerH - offset;
            const edgePaths = [
              { edge: "top" as const, d: `M ${start} ${offset} H ${endX}` },
              { edge: "right" as const, d: `M ${endX} ${offset} V ${endY}` },
              { edge: "bottom" as const, d: `M ${endX} ${endY} H ${start}` },
              { edge: "left" as const, d: `M ${start} ${endY} V ${offset}` },
            ];
            return (
              <g
                key={`line-${index}`}
                fill="none"
                strokeWidth={widths[index] ?? maxStroke}
                strokeLinecap="square"
                strokeLinejoin="miter"
                shapeRendering="geometricPrecision"
              >
                {edgePaths.map(({ edge, d }) => (
                  <path
                    key={edge}
                    d={d}
                    data-edge={edge}
                    stroke={selection.lineVariant === "colorful" && !selection.colorMode ? LINE_COLORS[edge] : strokeColor}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      );
    }

    case "thick-thin":
    case "thin-thick": {
      const off0 = edgeInset;
      const off1 = offInner;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            data-edge="outer"
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
          />
          <rect
            data-edge="inner"
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
          />
        </svg>
      );
    }

    case "triple-sandwich": {
      const off0 = edgeInset;
      const off1 = (off0 + offInner) / 2;
      const off2 = offInner;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
          />
          <rect
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
          />
          <rect
            x={off2}
            y={off2}
            width={innerW - off2 * 2}
            height={innerH - off2 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[2]}
          />
        </svg>
      );
    }

    case "dashed": {
      const off0 = edgeInset;
      const off1 = offInner;
      const w0 = widths[0];
      const visualDash = Math.max(12 * designScale, w0 * 3.2);
      const visualGap = Math.max(8 * designScale, w0 * 1.8);
      const segLen = Math.max(0.1, visualDash - w0);
      const gapLen = visualGap + w0;
      const dashArray = `${segLen.toFixed(2)} ${gapLen.toFixed(2)}`;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
            strokeDasharray={dashArray}
            strokeLinecap="round"
          />
          <rect
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
            strokeOpacity="0.6"
          />
        </svg>
      );
    }

    case "dotted": {
      const off0 = edgeInset;
      const off1 = offInner;
      const w1 = widths[1];
      const visualGap = Math.max(7 * designScale, w1 * 1.6);
      const gapLen = w1 + visualGap;
      const dotArray = `0.01 ${gapLen.toFixed(2)}`;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
          />
          <rect
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
            strokeDasharray={dotArray}
            strokeLinecap="round"
          />
        </svg>
      );
    }

    case "dash-dot": {
      const off0 = edgeInset;
      const off1 = offInner;
      const w0 = widths[0];
      const visualDash = Math.max(14 * designScale, w0 * 3.5);
      const visualGap = Math.max(7 * designScale, w0 * 1.6);
      const dotLen = 0.01;
      const segLen = Math.max(0.1, visualDash - w0);
      const gapLen = visualGap + w0;
      const dashDotArray = `${segLen.toFixed(2)} ${gapLen.toFixed(2)} ${dotLen} ${gapLen.toFixed(2)}`;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
            strokeDasharray={dashDotArray}
            strokeLinecap="round"
          />
          <rect
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
            strokeOpacity="0.6"
          />
        </svg>
      );
    }
    
    case "line-dash-dot": {
      const off0 = layerOffsets[0] ?? edgeInset;
      const off1 = layerOffsets[1] ?? (edgeInset + offInner) / 2;
      const off2 = layerOffsets[2] ?? offInner;
      const w1 = widths[1];
      const w2 = widths[2];
      const dashArray = `${Math.max(0.1, Math.max(12 * designScale, w1 * 3.2) - w1).toFixed(2)} ${(Math.max(8 * designScale, w1 * 1.8) + w1).toFixed(2)}`;
      const dotArray = `0.01 ${(w2 + Math.max(7 * designScale, w2 * 1.6)).toFixed(2)}`;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
          />
          <rect
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
            strokeDasharray={dashArray}
            strokeLinecap="round"
          />
          <rect
            x={off2}
            y={off2}
            width={innerW - off2 * 2}
            height={innerH - off2 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[2]}
            strokeDasharray={dotArray}
            strokeLinecap="round"
          />
        </svg>
      );
    }

    case "dot-dash-line": {
      const off0 = layerOffsets[0] ?? edgeInset;
      const off1 = layerOffsets[1] ?? (edgeInset + offInner) / 2;
      const off2 = layerOffsets[2] ?? offInner;
      const w0 = widths[0];
      const w1 = widths[1];
      const dotArray = `0.01 ${(w0 + Math.max(7 * designScale, w0 * 1.6)).toFixed(2)}`;
      const dashArray = `${Math.max(0.1, Math.max(12 * designScale, w1 * 3.2) - w1).toFixed(2)} ${(Math.max(8 * designScale, w1 * 1.8) + w1).toFixed(2)}`;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
            strokeDasharray={dotArray}
            strokeLinecap="round"
          />
          <rect
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
            strokeDasharray={dashArray}
            strokeLinecap="round"
          />
          <rect
            x={off2}
            y={off2}
            width={innerW - off2 * 2}
            height={innerH - off2 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[2]}
          />
        </svg>
      );
    }

    case "corner-crosshairs": {
      const off0 = edgeInset;
      const off1 = offInner;
      const gap = off1 - off0;
      const w0 = widths[0];
      const w1 = widths[1];
      const crosshairWidth = Math.max(
        1.5 * designScale,
        Math.min(Math.max(2.2 * designScale, w0 * 0.5), 4.5 * designScale)
      );
      const maxOuterArm = Math.max(4 * designScale, gap - w0 / 2 - 2.5 * designScale);
      const tickArm = Math.max(
        6 * designScale,
        Math.min(maxOuterArm, Math.max(crosshairWidth * 3.5, gap * 0.75))
      );
      const innerDash = Math.max(8 * designScale, w1 * 3.2 * designScale);
      const innerGap = Math.max(6 * designScale, w1 * 2.0 * designScale);
      const innerDashArray = `${innerDash.toFixed(2)} ${innerGap.toFixed(2)}`;
      const cornerOffset = (innerGap / 2).toFixed(2);

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            data-edge="outer"
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={w0}
          />
          <rect
            data-edge="inner"
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={w1}
            strokeDasharray={innerDashArray}
            strokeLinecap="butt"
            strokeDashoffset={cornerOffset}
          />
          <line
            x1={off1 - tickArm}
            y1={off1}
            x2={off1 + tickArm}
            y2={off1}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
          <line
            x1={off1}
            y1={off1 - tickArm}
            x2={off1}
            y2={off1 + tickArm}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
          <line
            x1={innerW - off1 - tickArm}
            y1={off1}
            x2={innerW - off1 + tickArm}
            y2={off1}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
          <line
            x1={innerW - off1}
            y1={off1 - tickArm}
            x2={innerW - off1}
            y2={off1 + tickArm}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
          <line
            x1={off1 - tickArm}
            y1={innerH - off1}
            x2={off1 + tickArm}
            y2={innerH - off1}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
          <line
            x1={off1}
            y1={innerH - off1 - tickArm}
            x2={off1}
            y2={innerH - off1 + tickArm}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
          <line
            x1={innerW - off1 - tickArm}
            y1={innerH - off1}
            x2={innerW - off1 + tickArm}
            y2={innerH - off1}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
          <line
            x1={innerW - off1}
            y1={innerH - off1 - tickArm}
            x2={innerW - off1}
            y2={innerH - off1 + tickArm}
            stroke={primaryColor}
            strokeWidth={crosshairWidth}
            strokeLinecap="butt"
          />
        </svg>
      );
    }

    case "wide-gallery": {
      const off0 = edgeInset;
      const off1 = offInner;
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          <rect
            data-edge="outer"
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
          />
          <rect
            data-edge="inner"
            x={off1}
            y={off1}
            width={innerW - off1 * 2}
            height={innerH - off1 * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
          />
        </svg>
      );
    }
    default:
      return null;
  }
}

function NeatlineSwatch({
  style,
}: {
  style: BorderStyle;
  selection?: NeatlineSelection;
}) {
  // Always render in pristine architectural blueprint blue palette matching LayoutCard
  const p = "#9CC3DA"; // Sky Blueprint Blue (Outer / Primary)
  const s = "#4B91B7"; // Cyan Blueprint Blue (Inner / Motifs)

  if (style.id === "none") {
    return (
      <span className="neatline-swatch" aria-hidden="true">
        <svg viewBox="0 0 64 38" preserveAspectRatio="none" className="neatline-swatch-artwork">
          <rect
            x="2"
            y="2"
            width="60"
            height="34"
            rx="4"
            fill="none"
            stroke="#9CC3DA"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.35"
          />
          <rect
            x="14"
            y="6"
            width="36"
            height="26"
            rx="3"
            fill="#4B91B7"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="neatline-swatch" aria-hidden="true">
      <svg viewBox="0 0 64 38" preserveAspectRatio="xMidYMid meet" className="neatline-swatch-artwork">
        {(() => {
          switch (style.pattern) {
            // --- GROUP A: NORMAL CORNERS (Clean Top-Left Corner Profile) ---
            case "single":
              return (
                <path
                  d="M 62 8 H 10 V 38"
                  fill="none"
                  stroke={p}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );

            case "double":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 7 H 9 V 38" stroke={p} strokeWidth="2.4" />
                  <path d="M 62 17 H 19 V 38" stroke={s} strokeWidth="1.6" />
                </g>
              );

            case "triple":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 6 H 8 V 38" stroke={p} strokeWidth="1.8" />
                  <path d="M 62 13 H 15 V 38" stroke={s} strokeWidth="1.2" />
                  <path d="M 62 20 H 22 V 38" stroke={p} strokeWidth="1.8" />
                </g>
              );

            case "thick-thin":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 7 H 9 V 38" stroke={p} strokeWidth="4.2" />
                  <path d="M 62 18 H 20 V 38" stroke={s} strokeWidth="1.4" />
                </g>
              );

            case "thin-thick":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 7 H 9 V 38" stroke={p} strokeWidth="1.4" />
                  <path d="M 62 18 H 20 V 38" stroke={s} strokeWidth="4.2" />
                </g>
              );

            case "triple-sandwich":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 6 H 8 V 38" stroke={p} strokeWidth="1.2" />
                  <path d="M 62 13 H 15 V 38" stroke={s} strokeWidth="3.8" />
                  <path d="M 62 20 H 22 V 38" stroke={p} strokeWidth="1.2" />
                </g>
              );

            case "dashed":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 7 H 9 V 38" stroke={p} strokeWidth="2.4" strokeDasharray="6 4" />
                  <path d="M 62 17 H 19 V 38" stroke={s} strokeWidth="1.4" />
                </g>
              );

            case "dotted":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 7 H 9 V 38" stroke={p} strokeWidth="1.6" />
                  <path d="M 62 17 H 19 V 38" stroke={s} strokeWidth="2.4" strokeDasharray="1 5" />
                </g>
              );

            case "dash-dot":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 7 H 9 V 38" stroke={p} strokeWidth="2.2" strokeDasharray="9 3 2 3" />
                  <path d="M 62 17 H 19 V 38" stroke={s} strokeWidth="1.4" />
                </g>
              );

            case "corner-crosshairs":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="14" x2="62" y2="14" stroke={p} strokeWidth="2.2" />
                  <line x1="16" y1="4" x2="16" y2="38" stroke={p} strokeWidth="2.2" />
                  <path d="M 62 22 H 24 V 38" stroke={s} strokeWidth="1.2" strokeDasharray="3 3" />
                  <circle cx="24" cy="22" r="1.5" fill={s} />
                </g>
              );

            case "wide-gallery":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 4 H 6 V 38" stroke={p} strokeWidth="1.0" />
                  <path d="M 62 18 H 20 V 38" stroke={s} strokeWidth="3.2" />
                </g>
              );

              case "line-dash-dot":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 6 H 8 V 38" stroke={p} strokeWidth="1.6" />
                  <path d="M 62 13 H 15 V 38" stroke={s} strokeWidth="1.6" strokeDasharray="6 4" />
                  <path d="M 62 20 H 22 V 38" stroke={p} strokeWidth="2.0" strokeDasharray="1 4" />
                </g>
              );

            case "dot-dash-line":
              return (
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 62 6 H 8 V 38" stroke={p} strokeWidth="2.0" strokeDasharray="1 4" />
                  <path d="M 62 13 H 15 V 38" stroke={s} strokeWidth="1.6" strokeDasharray="6 4" />
                  <path d="M 62 20 H 22 V 38" stroke={p} strokeWidth="1.6" />
                </g>
              );

            default:
              return (
                <path
                  d="M 62 8 H 10 V 38"
                  fill="none"
                  stroke={p}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
          }
        })()}
      </svg>
    </span>
  );
}

export function NeatlinePicker({
  width,
  height,
}: {
  width: string;
  height: string;
}) {
  const [selection, setSelection] = useState<NeatlineSelection>(readSelection);
  const [mobileSection, setMobileSection] = useState<"styles" | "adjust">("styles");

  const updateColorMode = (mode: BorderColorMode) => {
    setSelection((current) => ({
      ...current,
      colorMode: mode,
      lineVariant: mode === "mix" ? "colorful" : "plain",
    }));
  };

  const updateSingleColor = (hex: string) => {
    setSelection((current) => ({
      ...current,
      colorMode: "single",
      singleColor: hex,
      lineVariant: "plain",
    }));
  };

  const updateMixGradient = (from: string, to: string) => {
    setSelection((current) => ({
      ...current,
      colorMode: "mix",
      gradientFrom: from,
      gradientTo: to,
      lineVariant: "colorful",
    }));
  };
  const selectedLine = useMemo(
    () => lineStyles.find((style) => style.id === selection.lineId),
    [selection.lineId],
  );

  const displayedStyles: BorderStyle[] = lineStyles;
  const lineWidths = selectedLine
    ? widthsFor(selectedLine.id, selection.thicknesses)
    : [];
  const layerCount = selection.lineId !== "none" ? 1 : 0;

  useEffect(() => {
    const reset = () => setSelection(readSelection());
    window.addEventListener(NEATLINE_RESET_EVENT, reset);
    return () => window.removeEventListener(NEATLINE_RESET_EVENT, reset);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CONFIG_STORAGE_KEY,
        JSON.stringify({
          lineId: selection.lineId,
          cornerId: "none",
          frameId: "none",
          cornerPosition: "all",
          lineVariant: selection.lineVariant,
          mapGapCm: selection.mapGapCm ?? 0.0,
          colorMode: selection.colorMode ?? "single",
          singleColor: selection.singleColor ?? "#354b62",
          gradientFrom: selection.gradientFrom ?? "#f43f5e",
          gradientTo: selection.gradientTo ?? "#fb923c",
          designScale: selection.designScale ?? 1.0,
          showWhiteMat: Boolean(selection.showWhiteMat),
        }),
      );
      window.localStorage.setItem(
        THICKNESS_STORAGE_KEY,
        JSON.stringify(selection.thicknesses),
      );
      window.localStorage.setItem(LEGACY_STYLE_KEY, selection.lineId);
    } catch {
      /* preserve the active session if storage is unavailable */
    }
    window.dispatchEvent(
      new CustomEvent<NeatlineSelection>(NEATLINE_CHANGE_EVENT, {
        detail: selection,
      }),
    );
  }, [selection]);

  const selectStyle = (style: BorderStyle) => {
    // If clicking the already selected border, toggle it off!
    if (selection.lineId === style.id) {
      setSelection((current) => ({
        ...current,
        lineId: "none",
        cornerId: "none",
        frameId: "none",
        showWhiteMat: false,
      }));
      return;
    }

    setSelection((current) => ({
      ...current,
      lineId: style.id,
      cornerId: "none",
      frameId: "none",
      showWhiteMat: false,
    }));
  };

  const updateThickness = (lineIndex: number, valCm: number) => {
    if (!selectedLine) return;
    const clampedCm = Math.min(MAX_LINE_WIDTH_CM, Math.max(MIN_LINE_WIDTH_CM, Math.round(valCm * 100) / 100));
    setSelection((current) => {
      const nextCm = thicknessesInCm(selectedLine.id, current.thicknesses);
      nextCm[lineIndex] = clampedCm;
      return {
        ...current,
        thicknesses: { ...current.thicknesses, [selectedLine.id]: nextCm },
      };
    });
  };

  const adjustThickness = (lineIndex: number, delta: number) => {
    if (!selectedLine) return;
    const current = thicknessesInCm(selectedLine.id, selection.thicknesses)[lineIndex];
    updateThickness(
      lineIndex,
      stepWithinRange(current, delta, MIN_LINE_WIDTH_CM, SLIDER_MAX_LINE_WIDTH_CM, BORDER_CONTROL_STEP_CM),
    );
  };

  const updateDesignScale = (scale: number) => {
    const clampedScale = Math.min(2.5, Math.max(0.5, Math.round(scale * 10) / 10));
    setSelection((current) => ({
      ...current,
      designScale: clampedScale,
    }));
  };

  const adjustDesignScale = (delta: number) =>
    updateDesignScale(
      stepWithinRange(selection.designScale ?? 1, delta, 0.5, 2.5, 0.1),
    );

  const updateMapGap = (value: number) => {
    setSelection((current) => ({
      ...current,
      mapGapCm: Math.min(
        MAX_MAP_GAP_CM,
        Math.max(MIN_MAP_GAP_CM, Number(value.toFixed(2))),
      ),
    }));
  };

  const adjustMapGap = (delta: number) =>
    updateMapGap(
      stepWithinRange(
        selection.mapGapCm ?? 0.0,
        delta,
        MIN_MAP_GAP_CM,
        SLIDER_MAX_GAP_CM,
        GAP_CONTROL_STEP_CM,
      ),
    );

  const isSelected = (style: BorderStyle) => style.id === selection.lineId;

  const swatchSelection = (style: BorderStyle): NeatlineSelection => ({
    ...selection,
    lineId: style.id,
    cornerId: "none",
    frameId: "none",
  });

  return (
    <section className={`neatline-picker ${selectedLine ? "has-selected-border" : ""} is-mobile-${mobileSection}`} aria-label="Borders">
      <div className="neatline-mobile-tabs" role="tablist" aria-label="Border controls">
        <button type="button" role="tab" aria-selected={mobileSection === "styles"} className={mobileSection === "styles" ? "is-active" : ""} onClick={() => setMobileSection("styles")}>Border Style</button>
        <button type="button" role="tab" aria-selected={mobileSection === "adjust"} className={mobileSection === "adjust" ? "is-active" : ""} onClick={() => setMobileSection("adjust")}>Adjust &amp; Customize</button>
      </div>
      {/* BORDERS BOX */}
      <div className="neatline-section-box neatline-borders-box">
        <div className="neatline-section-box-header">
          <span className="neatline-section-box-title">Border Style</span>
          <span className="neatline-section-box-subtitle">
            {selectedLine ? selectedLine.name : "Clean Full Bleed"}
          </span>
        </div>
        <div
          className="neatline-options"
          role="group"
          aria-label="Choose a border"
        >
          {displayedStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              data-border-style={style.id}
              title={style.name}
              aria-pressed={isSelected(style)}
              className={`neatline-card neatline-option ${isSelected(style) ? "is-selected" : ""}`}
              onClick={() => selectStyle(style)}
            >
              <div className="neatline-card-copy">
                <span className="neatline-card-name">
                  {style.name.replace(/^(Classic|Vintage|Designer|Ornate)\s+/i, "")}
                </span>
              </div>
              <NeatlineSwatch style={style} selection={swatchSelection(style)} />
            </button>
          ))}
        </div>
      </div>

      {/* ADJUSTMENTS BOX (Color, Thickness & Spacing) */}
      <div className="neatline-section-box neatline-adjust-box">
        <div className="neatline-section-box-header">
          <span className="neatline-section-box-title">Adjust &amp; Customize</span>
          <span className="neatline-section-box-subtitle">
            {selectedLine?.name ?? ""}
          </span>
        </div>

        {selectedLine ? (
          <>
          {/* Sub-block A: Border Color */}
          <div className="neatline-color-subblock">
            <div className="neatline-color-header">
              <span className="neatline-color-title">Border Color</span>
              <div className="neatline-color-tabs" role="tablist">
                <button
                  type="button"
                  className={`neatline-color-tab ${selection.colorMode !== "mix" ? "is-active" : ""}`}
                  onClick={() => updateColorMode("single")}
                >
                  Single
                </button>
                <button
                  type="button"
                  className={`neatline-color-tab ${selection.colorMode === "mix" ? "is-active" : ""}`}
                  onClick={() => updateColorMode("mix")}
                >
                  Gradient
                </button>
              </div>
            </div>

            {selection.colorMode === "mix" ? (
              <div className="neatline-palette-wrap">
                <div className="neatline-grad-grid">
                  {MIX_GRADIENT_PRESETS.map((preset) => {
                    const isActive =
                      selection.gradientFrom === preset.from &&
                      selection.gradientTo === preset.to;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`neatline-grad-chip ${isActive ? "is-active" : ""}`}
                        style={{
                          background: `linear-gradient(90deg, ${preset.from}, ${preset.to})`,
                        }}
                        onClick={() => updateMixGradient(preset.from, preset.to)}
                        title={preset.id}
                        aria-label={preset.id}
                      />
                    );
                  })}
                </div>

                {/* Custom dual gradient inputs */}
                <div className="neatline-custom-grad-row">
                  <span className="neatline-custom-label">Custom:</span>
                  <div className="neatline-custom-grad-split">
                    <label className="neatline-custom-grad-bar-half" title="Choose first gradient color">
                      <span
                        className="neatline-custom-grad-fill"
                        style={{ background: selection.gradientFrom || "#f43f5e" }}
                      />
                      <input
                        type="color"
                        value={selection.gradientFrom || "#f43f5e"}
                        onChange={(e) =>
                          updateMixGradient(e.target.value, selection.gradientTo || "#fb923c")
                        }
                      />
                    </label>
                    <label className="neatline-custom-grad-bar-half" title="Choose second gradient color">
                      <span
                        className="neatline-custom-grad-fill"
                        style={{ background: selection.gradientTo || "#fb923c" }}
                      />
                      <input
                        type="color"
                        value={selection.gradientTo || "#fb923c"}
                        onChange={(e) =>
                          updateMixGradient(selection.gradientFrom || "#f43f5e", e.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="neatline-palette-wrap">
                <div className="neatline-single-grid">
                  {SINGLE_COLOR_SWATCHES.map((item) => {
                    const isActive =
                      (selection.singleColor || "#000000").toLowerCase() ===
                      item.hex.toLowerCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`neatline-single-chip ${isActive ? "is-active" : ""}`}
                        style={{ background: item.hex }}
                        onClick={() => updateSingleColor(item.hex)}
                        title={item.name}
                        aria-label={item.name}
                      />
                    );
                  })}

                  <label
                    className="neatline-single-chip neatline-custom-chip"
                    title="Pick custom color"
                    style={{ background: selection.singleColor || "#000000" }}
                  >
                    <input
                      type="color"
                      value={selection.singleColor || "#000000"}
                      onChange={(e) => updateSingleColor(e.target.value)}
                    />
                    <span className="neatline-picker-icon">More</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Sub-block B: Thickness & Spacing Sliders */}
          <div className="neatline-sliders-subblock">
            <div className="neatline-sliders-header">
              <span className="neatline-sliders-title">Thickness &amp; Spacing</span>
            </div>

            <fieldset className="neatline-adjustments">
              <legend>Border thickness &amp; spacing</legend>
              {/* All physical spacing values are displayed in centimeters. */}
              {thicknessesInCm(selectedLine.id, selection.thicknesses).map((cmVal, index) => (
                <div className="neatline-adjustment" key={`${selectedLine.id}-${index}`}>
                  <div className="neatline-adjustment-heading">
                    <span className="neatline-adjustment-label">
                      {lineLabel(selectedLine.pattern, index)}
                    </span>
                    <AdjustmentInfo
                      label={lineLabel(selectedLine.pattern, index)}
                      help="Adjusts the printed thickness of this layer. Spacing between other layers remains intact."
                    />
                  </div>
                  <div className="neatline-adjustment-control">
                    <button
                      type="button"
                      className="neatline-adjustment-step"
                      onClick={() => adjustThickness(index, -1)}
                      disabled={cmVal <= MIN_LINE_WIDTH_CM}
                      aria-label={`Decrease ${lineLabel(selectedLine.pattern, index)} thickness`}
                    >−</button>
                    <input
                      type="range"
                      min={MIN_LINE_WIDTH_CM}
                      max={SLIDER_MAX_LINE_WIDTH_CM}
                      step={BORDER_CONTROL_STEP_CM}
                      value={cmVal}
                      onChange={(event) => updateThickness(index, Number(event.target.value))}
                      aria-label={`${lineLabel(selectedLine.pattern, index)} thickness in cm`}
                    />
                    <button
                      type="button"
                      className="neatline-adjustment-step"
                      onClick={() => adjustThickness(index, 1)}
                      disabled={cmVal >= SLIDER_MAX_LINE_WIDTH_CM}
                      aria-label={`Increase ${lineLabel(selectedLine.pattern, index)} thickness`}
                    >+</button>
                    <output>{cmVal.toFixed(2)} cm</output>
                  </div>
                </div>
              ))}

              {hasPatternDesign(selectedLine.pattern) ? (
                <div className="neatline-adjustment" key="design-scale-slider">
                  <div className="neatline-adjustment-heading">
                    <span className="neatline-adjustment-label">Design size &amp; pattern</span>
                    <AdjustmentInfo
                      label="Design size and pattern"
                      help="Scales the pattern detail without changing the overall poster dimensions."
                    />
                  </div>
                  <div className="neatline-adjustment-control">
                    <button
                      type="button"
                      className="neatline-adjustment-step"
                      onClick={() => adjustDesignScale(-1)}
                      disabled={(selection.designScale ?? 1) <= 0.5}
                      aria-label="Decrease design size"
                    >−</button>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={selection.designScale ?? 1.0}
                      onChange={(event) => updateDesignScale(Number(event.target.value))}
                      aria-label="Design pattern size and thickness scale"
                    />
                    <button
                      type="button"
                      className="neatline-adjustment-step"
                      onClick={() => adjustDesignScale(1)}
                      disabled={(selection.designScale ?? 1) >= 2.5}
                      aria-label="Increase design size"
                    >+</button>
                    <output>{(selection.designScale ?? 1.0).toFixed(1)}×</output>
                  </div>
                </div>
              ) : null}

              <div className="neatline-adjustment" key="map-gap-slider">
                <div className="neatline-adjustment-heading">
                  <span className="neatline-adjustment-label">Map spacing (gap)</span>
                  <AdjustmentInfo
                    label="Map spacing"
                    help="At 0.00 cm, the innermost border meets the map boundary. Increasing this adds breathing space between the border and map."
                  />
                </div>
                <div className="neatline-adjustment-control">
                  <button
                    type="button"
                    className="neatline-adjustment-step"
                    onClick={() => adjustMapGap(-1)}
                    disabled={(selection.mapGapCm ?? 0.0) <= MIN_MAP_GAP_CM}
                    aria-label="Decrease map spacing"
                  >−</button>
                  <input
                    type="range"
                    min={MIN_MAP_GAP_CM}
                    max={SLIDER_MAX_GAP_CM}
                    step={GAP_CONTROL_STEP_CM}
                    value={selection.mapGapCm ?? 0.0}
                    onChange={(event) => updateMapGap(Number(event.target.value))}
                    aria-label="Map spacing gap in centimeters"
                  />
                  <button
                    type="button"
                    className="neatline-adjustment-step"
                    onClick={() => adjustMapGap(1)}
                    disabled={(selection.mapGapCm ?? 0.0) >= SLIDER_MAX_GAP_CM}
                    aria-label="Increase map spacing"
                  >+</button>
                  <output>{(selection.mapGapCm ?? 0.0).toFixed(2)} cm</output>
                </div>
              </div>
              <p className="neatline-adjustments-note">
                {hasPatternDesign(selectedLine.pattern)
                  ? "Adjust line thickness (0.02–0.40 cm), map spacing (0.00–0.35 cm), or design size (0.5–2.5×)."
                  : "Adjust line thickness (0.02–0.40 cm) and map spacing (0.00–0.35 cm)."}
              </p>
            </fieldset>
          </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
