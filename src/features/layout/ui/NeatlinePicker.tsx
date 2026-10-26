import { useEffect, useMemo, useState } from "react";
import "./neatline.css";

const CONFIG_STORAGE_KEY = "maparte_neatline_layers";
const LEGACY_STYLE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
export const NEATLINE_CHANGE_EVENT = "maparte:neatline:change";

export type LinePattern =
  | "single"
  | "double"
  | "triple"
  | "thick-thin"
  | "thin-thick"
  | "triple-sandwich"
  | "dashed"
  | "dotted"
  | "dash-dot"
  | "notched-corner"
  | "surveyor-ticks"
  | "greek-key"
  | "victorian-filigree"
  | "art-deco-stepped"
  | "nautical-compass"
  | "celtic-braid"
  | "diamond-lattice"
  | "antique-atlas"
  | "architectural-grid";

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

export const MIX_GRADIENT_PRESETS: MixGradientPreset[] = [
  { id: "sunset", from: "#f43f5e", to: "#fb923c" },
  { id: "ocean", from: "#06b6d4", to: "#3b82f6" },
  { id: "gold-copper", from: "#eab308", to: "#ea580c" },
  { id: "aurora", from: "#a855f7", to: "#06b6d4" },
  { id: "emerald-lime", from: "#059669", to: "#84cc16" },
  { id: "berry-velvet", from: "#e11d48", to: "#7c3aed" },
  { id: "cyber-neon", from: "#ec4899", to: "#06b6d4" },
  { id: "autumn-flame", from: "#dc2626", to: "#f59e0b" },
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
};

export const lineStyles: LineStyle[] = [
  // Original 3 baseline styles
  { id: "neatline-single", name: "Single line", kind: "line", pattern: "single" },
  { id: "neatline-double", name: "Double line", kind: "line", pattern: "double" },
  { id: "neatline-triple", name: "Triple line", kind: "line", pattern: "triple" },

  // 8 MS Word / Cartography Line Styles
  { id: "neatline-thick-thin", name: "Thick-Thin", kind: "line", pattern: "thick-thin" },
  { id: "neatline-thin-thick", name: "Thin-Thick", kind: "line", pattern: "thin-thick" },
  { id: "neatline-triple-sandwich", name: "Thin-Thick-Thin", kind: "line", pattern: "triple-sandwich" },
  { id: "neatline-dashed", name: "Modern Dashed", kind: "line", pattern: "dashed" },
  { id: "neatline-dotted", name: "Fine Dotted", kind: "line", pattern: "dotted" },
  { id: "neatline-dash-dot", name: "Dash-Dot", kind: "line", pattern: "dash-dot" },
  { id: "neatline-notched-corner", name: "Notched Corner", kind: "line", pattern: "notched-corner" },
  { id: "neatline-surveyor-ticks", name: "Surveyor Ticks", kind: "line", pattern: "surveyor-ticks" },

  // 8 New Ornamental Rectangular Frames (100% Clean Rectangular Inner Border)
  { id: "frame-greek-key", name: "Classic Greek Key", kind: "line", pattern: "greek-key" },
  { id: "frame-victorian-filigree", name: "Victorian Filigree", kind: "line", pattern: "victorian-filigree" },
  { id: "frame-art-deco-stepped", name: "Art Deco Stepped", kind: "line", pattern: "art-deco-stepped" },
  { id: "frame-nautical-compass", name: "Nautical Compass", kind: "line", pattern: "nautical-compass" },
  { id: "frame-celtic-braid", name: "Celtic Braid", kind: "line", pattern: "celtic-braid" },
  { id: "frame-diamond-lattice", name: "Diamond Lattice", kind: "line", pattern: "diamond-lattice" },
  { id: "frame-antique-atlas", name: "Antique Atlas", kind: "line", pattern: "antique-atlas" },
  { id: "frame-architectural-grid", name: "Architectural Grid", kind: "line", pattern: "architectural-grid" },
];
export const NEATLINE_STYLES = lineStyles;

export const DEFAULT_LINE_WIDTHS_CM: Record<LinePattern, number[]> = {
  single: [0.10],
  double: [0.10, 0.06],
  triple: [0.10, 0.06, 0.05],
  "thick-thin": [0.15, 0.06],
  "thin-thick": [0.06, 0.15],
  "triple-sandwich": [0.06, 0.14, 0.06],
  dashed: [0.10, 0.06],
  dotted: [0.06, 0.14],
  "dash-dot": [0.10, 0.06],
  "notched-corner": [0.08, 0.10],
  "surveyor-ticks": [0.08, 0.22, 0.08],
  "greek-key": [0.10, 0.08],
  "victorian-filigree": [0.10, 0.08],
  "art-deco-stepped": [0.12, 0.08],
  "nautical-compass": [0.10, 0.08],
  "celtic-braid": [0.10, 0.08],
  "diamond-lattice": [0.10, 0.08],
  "antique-atlas": [0.10, 0.08],
  "architectural-grid": [0.08, 0.10],
};

export const MAX_LINE_WIDTH_CM = 1.00;
export const MIN_LINE_WIDTH_CM = 0.05;

const DEFAULT_LINE_WIDTHS: Record<LinePattern, number[]> = Object.fromEntries(
  Object.entries(DEFAULT_LINE_WIDTHS_CM).map(([pattern, arr]) => [
    pattern,
    arr.map((cm) => cm * 48.0),
  ]),
) as Record<LinePattern, number[]>;

const MAX_LINE_WIDTH = MAX_LINE_WIDTH_CM * 48.0;

const LINE_COLORS: Record<"top" | "right" | "bottom" | "left", string> = {
  top: "#b44737",
  right: "#276b62",
  bottom: "#bd8735",
  left: "#526b9b",
};

const OUTER_MAT_MAX_CM = 0.10; // Exactly 1.0 mm outer margin from paper corners

export function hasPatternDesign(pattern: LinePattern): boolean {
  return [
    "notched-corner",
    "surveyor-ticks",
    "greek-key",
    "victorian-filigree",
    "art-deco-stepped",
    "nautical-compass",
    "celtic-braid",
    "diamond-lattice",
    "antique-atlas",
    "architectural-grid",
  ].includes(pattern);
}

export function getBorderCategoryTag(pattern: LinePattern): string {
  switch (pattern) {
    case "single":
      return "1-Line Minimal";
    case "double":
      return "2-Line Classic";
    case "triple":
      return "3-Line Stripe";
    case "thick-thin":
      return "Gallery Mat";
    case "thin-thick":
      return "Inset Frame";
    case "triple-sandwich":
      return "3-Tier Frame";
    case "dashed":
      return "Dashed Border";
    case "dotted":
      return "Pin-Dot Border";
    case "dash-dot":
      return "CAD Metric";
    case "notched-corner":
      return "Stepped Corners";
    case "surveyor-ticks":
      return "Military Grid";
    case "greek-key":
      return "Meander Motif";
    case "victorian-filigree":
      return "Ornamental Scroll";
    case "art-deco-stepped":
      return "Chevron Corners";
    case "nautical-compass":
      return "Mariner Rose";
    case "celtic-braid":
      return "Interlaced Wave";
    case "diamond-lattice":
      return "Lozenge Motif";
    case "antique-atlas":
      return "Fluted Corners";
    case "architectural-grid":
      return "Blueprint Corners";
    default:
      return "Line Border";
  }
}

export function getPatternSpanUnits(pattern: LinePattern, designScale = 1.0): number {
  const scale = Math.max(0.4, Math.min(3.0, designScale));
  switch (pattern) {
    case "single":
      return 0;
    case "double":
    case "thick-thin":
    case "thin-thick":
    case "dashed":
    case "dotted":
    case "dash-dot":
      return 10;
    case "triple":
    case "triple-sandwich":
      return 14;
    case "notched-corner":
      return Math.round(14 * scale);
    case "surveyor-ticks":
      return Math.round(16 * scale);
    case "greek-key":
    case "celtic-braid":
    case "diamond-lattice":
    case "architectural-grid":
      return Math.round(20 * scale);
    case "art-deco-stepped":
    case "victorian-filigree":
    case "nautical-compass":
    case "antique-atlas":
      return Math.round(22 * scale);
    default:
      return Math.round(12 * scale);
  }
}

/** Shared physical measurements for the mat, map opening, and border art. */
export function getPosterBorderMetrics(
  widthValue?: string | number,
  heightValue?: string | number,
  customGapCm?: number,
  lineId?: string,
  thicknesses?: Record<string, number[]>,
  designScale = 1.0,
) {
  const width = Number(widthValue) > 0 ? Number(widthValue) : 21;
  const height = Number(heightValue) > 0 ? Number(heightValue) : 29.7;
  const shortSide = Math.min(width, height);

  // Border sits right near the corners of the white background: 1 mm (0.10 cm)
  const outerMatCm = Math.min(OUTER_MAT_MAX_CM, Math.max(0.04, shortSide * 0.005));
  const usableWidthCm = Math.max(0.1, width - outerMatCm * 2);
  const usableHeightCm = Math.max(0.1, height - outerMatCm * 2);
  const innerW = 1000;
  const innerH = (innerW * usableHeightCm) / usableWidthCm;
  const unitScale = innerW / usableWidthCm;

  // Default clearance gap is 1 mm (0.10 cm) as requested: "लगभग 1 mm, 1 mm का गैप होना चाहिए"
  const gapCm =
    typeof customGapCm === "number" && Number.isFinite(customGapCm)
      ? Math.max(0.05, Math.min(0.60, customGapCm))
      : 0.10;

  let borderBandCm = 0;
  let spanUnits = 0;
  let edgeInset = 1.5;
  let offInner = edgeInset;

  const style = lineId && lineId !== "none" ? lineStyles.find((s) => s.id === lineId) : null;
  if (style) {
    const widths = widthsFor(style.id, thicknesses || {});
    const maxStroke = widths.length ? Math.max(...widths) : 2.0;
    edgeInset = maxStroke / 2 + 0.5;
    spanUnits = getPatternSpanUnits(style.pattern, designScale);
    offInner = edgeInset + spanUnits;
    const innerStrokeWidth = widths[widths.length - 1] ?? maxStroke;
    const innerEdgeUnits = offInner + innerStrokeWidth / 2;
    borderBandCm = innerEdgeUnits / unitScale;

    // On ultra-wide banners with very short heights (e.g. Reddit banner 4 cm, Twitter 6 cm),
    // cap the border band so the map opening never gets squashed to zero.
    const maxBandCm = Math.max(0.05, shortSide / 2 - outerMatCm - gapCm - 0.20);
    if (borderBandCm > maxBandCm) {
      borderBandCm = maxBandCm;
      const targetEdgeUnits = borderBandCm * unitScale;
      offInner = Math.max(edgeInset, targetEdgeUnits - innerStrokeWidth / 2);
      spanUnits = Math.max(0, offInner - edgeInset);
    }
  }

  // The map frame is placed exactly gapCm (default 1 mm) inside the innermost border stroke edge
  const mapInsetCm = outerMatCm + borderBandCm + gapCm;

  return {
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
    mapInsetX: `${(mapInsetCm / width) * 100}%`,
    mapInsetY: `${(mapInsetCm / height) * 100}%`,
    matInsetX: `${(outerMatCm / width) * 100}%`,
    matInsetY: `${(outerMatCm / height) * 100}%`,
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
    case "notched-corner":
    case "greek-key":
    case "victorian-filigree":
    case "art-deco-stepped":
    case "nautical-compass":
    case "celtic-braid":
    case "diamond-lattice":
    case "antique-atlas":
    case "architectural-grid":
      return 2;
    case "triple":
    case "triple-sandwich":
    case "surveyor-ticks":
      return 3;
    default:
      return 1;
  }
}

function isLineId(value: string): boolean {
  return value === "none" || lineStyles.some((style) => style.id === value);
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
    singleColor: "#9CC3DA",
    gradientFrom: "#f43f5e",
    gradientTo: "#fb923c",
    designScale: 1.0,
  };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NeatlineSelection>;
      const colorMode: BorderColorMode =
        parsed.colorMode === "mix" || parsed.colorMode === "single"
          ? parsed.colorMode
          : parsed.lineVariant === "colorful"
            ? "mix"
            : "single";

      return {
        ...empty,
        lineId: parsed.lineId && isLineId(parsed.lineId) ? parsed.lineId : "none",
        cornerId: "none",
        frameId: "none",
        lineVariant: colorMode === "mix" ? "colorful" : "plain",
        thicknesses: readThicknesses(),
        mapGapCm:
          typeof parsed.mapGapCm === "number" && Number.isFinite(parsed.mapGapCm)
            ? Math.max(0.05, Math.min(0.60, parsed.mapGapCm))
            : 0.1,
        colorMode,
        singleColor:
          parsed.singleColor && parsed.singleColor !== "#354b62"
            ? parsed.singleColor
            : "#9CC3DA",
        gradientFrom: parsed.gradientFrom || "#f43f5e",
        gradientTo: parsed.gradientTo || "#fb923c",
        designScale:
          typeof parsed.designScale === "number" && Number.isFinite(parsed.designScale)
            ? Math.max(0.5, Math.min(2.5, parsed.designScale))
            : 1.0,
      };
    }
    const legacy = window.localStorage.getItem(LEGACY_STYLE_KEY) || "none";
    if (isLineId(legacy)) empty.lineId = legacy;
    return empty;
  } catch {
    return empty;
  }
}

export function readNeatlineSelection(): NeatlineSelection {
  return readSelection();
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
    const cm = value > 1.05 ? value / 48.0 : value;
    return Math.min(MAX_LINE_WIDTH_CM, Math.max(MIN_LINE_WIDTH_CM, Math.round(cm * 100) / 100));
  });
}

export function widthsFor(
  styleId: string,
  thicknesses: Record<string, number[]>,
): number[] {
  const cmArr = thicknessesInCm(styleId, thicknesses);
  return cmArr.map((cm) => cm * 48.0);
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
    case "notched-corner":
      return index === 0 ? "Outer border line" : "Notched corner line";
    case "surveyor-ticks":
      return ["Outer line", "Tick band width", "Inner line"][index] ?? "Line";
    case "greek-key":
      return index === 0 ? "Outer border" : "Greek key meander";
    case "victorian-filigree":
      return index === 0 ? "Outer border" : "Filigree scrolls";
    case "art-deco-stepped":
      return index === 0 ? "Outer border" : "Stepped corners";
    case "nautical-compass":
      return index === 0 ? "Outer border" : "Ticks & compass";
    case "celtic-braid":
      return index === 0 ? "Outer border" : "Celtic wave braid";
    case "diamond-lattice":
      return index === 0 ? "Outer border" : "Diamond lattice";
    case "antique-atlas":
      return index === 0 ? "Outer border" : "Atlas flutes";
    case "architectural-grid":
      return index === 0 ? "Outer hairline" : "Technical grid";
    default:
      return `Line ${index + 1}`;
  }
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
  );
  const { innerW, innerH, edgeInset, offInner, spanUnits } = metrics;
  const widths = widthsFor(line.id, selection.thicknesses);
  const maxStroke = widths.length ? Math.max(...widths) : 1;
  const dScale = selection.designScale ?? 1.0;

  const isMix = selection.colorMode === "mix";
  const gradId = `neatline-grad-${className ? className.trim().replace(/\s+/g, "-") : "main"}`;
  const fromColor = selection.gradientFrom || "#f43f5e";
  const toColor = selection.gradientTo || "#fb923c";
  const singleColor = selection.singleColor || "#9CC3DA";

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
          ? [edgeInset, offInner]
          : line.pattern === "triple"
            ? [edgeInset, (edgeInset + offInner) / 2, offInner]
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
            strokeDasharray="14 8"
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
            strokeDasharray="1 8"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    case "dash-dot": {
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
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
            strokeDasharray="16 6 4 6"
            strokeLinecap="square"
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

    case "notched-corner": {
      const off0 = edgeInset;
      const n = Math.max(10, spanUnits - 2);
      const ix1 = off0 + 1;
      const iy1 = off0 + 1;
      const ix2 = innerW - off0 - 1;
      const iy2 = innerH - off0 - 1;
      const motifStroke = Math.max(1.2, Math.min(n / 4, 2.4 * dScale));
      const dotR = Math.max(1.8, Math.min(n / 4, 2.5 * dScale));

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
            x={offInner}
            y={offInner}
            width={innerW - offInner * 2}
            height={innerH - offInner * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
          />
          {/* Corner Squares strictly within outer/inner boundaries */}
          <rect x={ix1} y={iy1} width={n} height={n} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
          <rect x={ix2 - n} y={iy1} width={n} height={n} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
          <rect x={ix2 - n} y={iy2 - n} width={n} height={n} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
          <rect x={ix1} y={iy2 - n} width={n} height={n} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
          {/* Corner Dots */}
          <circle cx={ix1 + n / 2} cy={iy1 + n / 2} r={dotR} fill={secondaryColor} />
          <circle cx={ix2 - n / 2} cy={iy1 + n / 2} r={dotR} fill={secondaryColor} />
          <circle cx={ix2 - n / 2} cy={iy2 - n / 2} r={dotR} fill={secondaryColor} />
          <circle cx={ix1 + n / 2} cy={iy2 - n / 2} r={dotR} fill={secondaryColor} />
        </svg>
      );
    }

    case "surveyor-ticks": {
      const off0 = edgeInset;
      const offMid = (off0 + offInner) / 2;
      const bandWidth = Math.max(4, (spanUnits - 4) * 0.7);
      const dashLen = Math.max(8, Math.round(14 * dScale));
      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer baseline */}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
          />
          {/* Checkered alternating tick band strictly within track */}
          <rect
            x={offMid}
            y={offMid}
            width={innerW - offMid * 2}
            height={innerH - offMid * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={bandWidth}
            strokeDasharray={`${dashLen} ${dashLen}`}
          />
          {/* Inner 100% clean rectangular border */}
          <rect
            x={offInner}
            y={offInner}
            width={innerW - offInner * 2}
            height={innerH - offInner * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[2]}
          />
        </svg>
      );
    }

    
    case "greek-key": {
      const off0 = edgeInset;
      const step = spanUnits;
      const midYTop = (off0 + offInner) / 2;
      const midYBot = innerH - (off0 + offInner) / 2;
      const kw = Math.round(36 * dScale);
      const kh = Math.min(Math.round(16 * dScale), Math.max(8, step - 6));
      const motifStroke = Math.max(1.4, Math.min(kh / 3, 2.4 * dScale));

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer rectangular baseline */}
          <rect
            x={off0}
            y={off0}
            width={innerW - off0 * 2}
            height={innerH - off0 * 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={widths[0]}
          />
          {/* Inner 100% clean rectangular border */}
          <rect
            x={offInner}
            y={offInner}
            width={innerW - offInner * 2}
            height={innerH - offInner * 2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={widths[1]}
          />
          {/* Bold, classic Greek Key meander runs along top & bottom */}
          <g fill="none" stroke={secondaryColor} strokeWidth={motifStroke} strokeLinecap="square" strokeLinejoin="miter">
            {Array.from({ length: Math.floor((innerW - offInner * 2 - 20) / (kw + 6)) }, (_, i) => {
              const x = offInner + 10 + i * (kw + 6);
              return (
                <g key={`gk-tb-${i}`}>
                  <path d={`M ${x} ${midYTop - kh / 2} H ${x + kw} V ${midYTop + kh / 2} H ${x + 10} V ${midYTop} H ${x + 24} V ${midYTop - kh / 3}`} />
                  <path d={`M ${x} ${midYBot + kh / 2} H ${x + kw} V ${midYBot - kh / 2} H ${x + 10} V ${midYBot} H ${x + 24} V ${midYBot + kh / 3}`} />
                </g>
              );
            })}
          </g>
          {/* 4 Corner Square Meander Blocks */}
          {[
            [off0 + 2, off0 + 2],
            [innerW - offInner + 2, off0 + 2],
            [innerW - offInner + 2, innerH - offInner + 2],
            [off0 + 2, innerH - offInner + 2],
          ].map(([cx, cy], idx) => {
            const sz = Math.max(10, step - 4);
            const inSz = Math.max(6, sz - 4);
            const dotSz = Math.max(2, inSz - 4);
            return (
              <g key={`gk-c-${idx}`}>
                <rect x={cx} y={cy} width={sz} height={sz} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
                <rect x={cx + (sz - inSz) / 2} y={cy + (sz - inSz) / 2} width={inSz} height={inSz} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
                <rect x={cx + (sz - dotSz) / 2} y={cy + (sz - dotSz) / 2} width={dotSz} height={dotSz} fill={secondaryColor} />
              </g>
            );
          })}
        </svg>
      );
    }

    case "victorian-filigree": {
      const off0 = edgeInset;
      const step = spanUnits;
      const midX = innerW / 2;
      const midY = innerH / 2;
      const dW = Math.round(14 * dScale);
      const dH = Math.min(Math.round(20 * dScale), Math.max(10, step - 6));
      const motifStroke = Math.max(1.0, 1.4 * dScale);

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer double line */}
          <rect x={off0} y={off0} width={innerW - off0 * 2} height={innerH - off0 * 2} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
          <rect x={off0 + 3} y={off0 + 3} width={innerW - (off0 + 3) * 2} height={innerH - (off0 + 3) * 2} fill="none" stroke={primaryColor} strokeWidth={widths[1] * 0.75} />
          {/* Inner 100% clean rectangular border */}
          <rect x={offInner} y={offInner} width={innerW - offInner * 2} height={innerH - offInner * 2} fill="none" stroke={secondaryColor} strokeWidth={widths[1]} />

          {/* 4 Corner Ornate Filigree Flourishes strictly within bounds */}
          {[
            { x: off0 + 3, y: off0 + 3, sx: 1, sy: 1 },
            { x: innerW - off0 - 3, y: off0 + 3, sx: -1, sy: 1 },
            { x: innerW - off0 - 3, y: innerH - off0 - 3, sx: -1, sy: -1 },
            { x: off0 + 3, y: innerH - off0 - 3, sx: 1, sy: -1 },
          ].map(({ x, y, sx, sy }, idx) => (
            <g key={`vf-c-${idx}`} transform={`translate(${x}, ${y}) scale(${sx * dScale}, ${sy * dScale})`}>
              <path d="M 0 0 L 16 0 C 12 7, 7 12, 0 16 Z" fill={secondaryColor} fillOpacity="0.88" />
              <path d="M 3 3 Q 12 6, 14 14 T 3 3" fill="none" stroke="#fff" strokeWidth={motifStroke} />
              <circle cx="6" cy="6" r={Math.max(1.5, 2 * dScale)} fill="#fff" />
            </g>
          ))}

          {/* Prominent Card-Suit Center Diamond Medallions (Taash ka Diamond) */}
          <polygon points={`${midX},${(off0 + offInner) / 2 - dH / 2} ${midX + dW / 2},${(off0 + offInner) / 2} ${midX},${(off0 + offInner) / 2 + dH / 2} ${midX - dW / 2},${(off0 + offInner) / 2}`} fill={secondaryColor} />
          <polygon points={`${midX},${innerH - (off0 + offInner) / 2 - dH / 2} ${midX + dW / 2},${(off0 + offInner) / 2} ${midX},${innerH - (off0 + offInner) / 2 + dH / 2} ${midX - dW / 2},${innerH - (off0 + offInner) / 2}`} fill={secondaryColor} />
          <polygon points={`${(off0 + offInner) / 2 - dW / 2},${midY} ${(off0 + offInner) / 2},${midY - dH / 2} ${(off0 + offInner) / 2 + dW / 2},${midY} ${(off0 + offInner) / 2},${midY + dH / 2}`} fill={secondaryColor} />
          <polygon points={`${innerW - (off0 + offInner) / 2 - dW / 2},${midY} ${innerW - (off0 + offInner) / 2},${midY - dH / 2} ${innerW - (off0 + offInner) / 2 + dW / 2},${midY} ${innerW - (off0 + offInner) / 2},${midY + dH / 2}`} fill={secondaryColor} />
        </svg>
      );
    }

    case "art-deco-stepped": {
      const off0 = edgeInset;
      const step = spanUnits;
      const midX = innerW / 2;
      const midY = innerH / 2;

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer heavy line */}
          <rect x={off0} y={off0} width={innerW - off0 * 2} height={innerH - off0 * 2} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
          {/* Hairline guide */}
          <rect x={off0 + 3} y={off0 + 3} width={innerW - (off0 + 3) * 2} height={innerH - (off0 + 3) * 2} fill="none" stroke={secondaryColor} strokeWidth={1} />
          {/* Inner 100% clean rectangular border */}
          <rect x={offInner} y={offInner} width={innerW - offInner * 2} height={innerH - offInner * 2} fill="none" stroke={primaryColor} strokeWidth={widths[1]} />

          {/* 4 Corner Stepped Art Deco Blocks */}
          {[
            { x: off0 + 3, y: off0 + 3, sx: 1, sy: 1 },
            { x: innerW - off0 - 3, y: off0 + 3, sx: -1, sy: 1 },
            { x: innerW - off0 - 3, y: innerH - off0 - 3, sx: -1, sy: -1 },
            { x: off0 + 3, y: innerH - off0 - 3, sx: 1, sy: -1 },
          ].map(({ x, y, sx, sy }, idx) => (
            <g key={`ad-c-${idx}`} transform={`translate(${x}, ${y}) scale(${sx * dScale}, ${sy * dScale})`}>
              <polygon points="0,0 16,0 16,4 12,4 12,8 8,8 8,12 4,12 4,16 0,16" fill={primaryColor} />
              <polygon points="2,2 14,2 14,4 10,4 10,8 6,8 6,12 2,12" fill={secondaryColor} />
            </g>
          ))}

          {/* Bold Center Chevron Notches */}
          <polygon points={`${midX - 14 * dScale},${off0} ${midX},${(off0 + offInner) / 2} ${midX + 14 * dScale},${off0}`} fill={primaryColor} />
          <polygon points={`${midX - 14 * dScale},${innerH - off0} ${midX},${innerH - (off0 + offInner) / 2} ${midX + 14 * dScale},${innerH - off0}`} fill={primaryColor} />
          <polygon points={`${off0},${midY - 14 * dScale} ${(off0 + offInner) / 2},${midY} ${off0},${midY + 14 * dScale}`} fill={primaryColor} />
          <polygon points={`${innerW - off0},${midY - 14 * dScale} ${innerW - (off0 + offInner) / 2},${midY} ${innerW - off0},${midY + 14 * dScale}`} fill={primaryColor} />
        </svg>
      );
    }

    case "nautical-compass": {
      const off0 = edgeInset;
      const step = spanUnits;
      const topY = (off0 + offInner) / 2;
      const botY = innerH - (off0 + offInner) / 2;
      const leftX = (off0 + offInner) / 2;
      const rightX = innerW - (off0 + offInner) / 2;

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer frame */}
          <rect x={off0} y={off0} width={innerW - off0 * 2} height={innerH - off0 * 2} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
          {/* Inner 100% clean rectangular border */}
          <rect x={offInner} y={offInner} width={innerW - offInner * 2} height={innerH - offInner * 2} fill="none" stroke={secondaryColor} strokeWidth={widths[1]} />

          {/* Latitude / Longitude ticks along perimeter */}
          <g stroke={secondaryColor}>
            {Array.from({ length: Math.floor((innerW - offInner * 2) / 24) }, (_, i) => {
              const x = offInner + 12 + i * 24;
              const isMaj = i % 4 === 0;
              const len = isMaj ? 12 : 6;
              return (
                <g key={`nc-tb-${i}`}>
                  <line x1={x} y1={topY - len / 2} x2={x} y2={topY + len / 2} strokeWidth={isMaj ? 2.0 : 1.2} />
                  <line x1={x} y1={botY - len / 2} x2={x} y2={botY + len / 2} strokeWidth={isMaj ? 2.0 : 1.2} />
                </g>
              );
            })}
            {Array.from({ length: Math.floor((innerH - offInner * 2) / 24) }, (_, i) => {
              const y = offInner + 12 + i * 24;
              const isMaj = i % 4 === 0;
              const len = isMaj ? 12 : 6;
              return (
                <g key={`nc-lr-${i}`}>
                  <line x1={leftX - len / 2} y1={y} x2={leftX + len / 2} y2={y} strokeWidth={isMaj ? 2.0 : 1.2} />
                  <line x1={rightX - len / 2} y1={y} x2={rightX + len / 2} y2={y} strokeWidth={isMaj ? 2.0 : 1.2} />
                </g>
              );
            })}
          </g>

          {/* 4 Corner 8-point Compass Windrose Stars */}
          {[
            [leftX, topY],
            [rightX, topY],
            [rightX, botY],
            [leftX, botY],
          ].map(([cx, cy], idx) => {
            const starR = Math.max(6, Math.round(8 * dScale));
            const starInner = starR * 0.32;
            return (
              <g key={`nc-c-${idx}`}>
                <circle cx={cx} cy={cy} r={Math.max(8, step / 2 - 3)} fill="#fff" stroke={primaryColor} strokeWidth={Math.max(1, 1.4 * dScale)} />
                <polygon
                  points={`${cx},${cy - starR} ${cx + starInner},${cy - starInner} ${cx + starR},${cy} ${cx + starInner},${cy + starInner} ${cx},${cy + starR} ${cx - starInner},${cy + starInner} ${cx - starR},${cy} ${cx - starInner},${cy - starInner}`}
                  fill={secondaryColor}
                />
                <polygon
                  points={`${cx},${cy - starR} ${cx + starInner},${cy - starInner} ${cx},${cy} ${cx - starInner},${cy - starInner}`}
                  fill={primaryColor}
                />
                <circle cx={cx} cy={cy} r={Math.max(1.5, 2 * dScale)} fill="#fff" stroke={primaryColor} strokeWidth={1} />
              </g>
            );
          })}
        </svg>
      );
    }

    case "celtic-braid": {
      const off0 = edgeInset;
      const step = spanUnits;
      const topY = (off0 + offInner) / 2;
      const botY = innerH - (off0 + offInner) / 2;

      let pTop1 = `M ${offInner} ${topY}`;
      let pTop2 = `M ${offInner} ${topY}`;
      const waveStep = Math.max(16, Math.round(24 * dScale));
      const amp = Math.min(step / 2 - 2, 5 * dScale);
      for (let x = offInner; x <= innerW - offInner - waveStep; x += waveStep) {
        pTop1 += ` Q ${x + waveStep / 4} ${topY - amp}, ${x + waveStep / 2} ${topY} T ${x + waveStep} ${topY}`;
        pTop2 += ` Q ${x + waveStep / 4} ${topY + amp}, ${x + waveStep / 2} ${topY} T ${x + waveStep} ${topY}`;
      }

      let pBot1 = `M ${offInner} ${botY}`;
      let pBot2 = `M ${offInner} ${botY}`;
      for (let x = offInner; x <= innerW - offInner - waveStep; x += waveStep) {
        pBot1 += ` Q ${x + waveStep / 4} ${botY - amp}, ${x + waveStep / 2} ${botY} T ${x + waveStep} ${botY}`;
        pBot2 += ` Q ${x + waveStep / 4} ${botY + amp}, ${x + waveStep / 2} ${botY} T ${x + waveStep} ${botY}`;
      }

      const leftX = (off0 + offInner) / 2;
      const rightX = innerW - (off0 + offInner) / 2;
      const motifStroke = Math.max(1.4, 2.0 * dScale);

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer rect */}
          <rect x={off0} y={off0} width={innerW - off0 * 2} height={innerH - off0 * 2} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
          {/* Inner 100% clean rectangular border */}
          <rect x={offInner} y={offInner} width={innerW - offInner * 2} height={innerH - offInner * 2} fill="none" stroke={secondaryColor} strokeWidth={widths[1]} />

          {/* Intertwining Celtic Sine-wave Braid */}
          <path d={pTop1} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
          <path d={pTop2} fill="none" stroke={primaryColor} strokeWidth={motifStroke * 0.9} />
          <path d={pBot1} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
          <path d={pBot2} fill="none" stroke={primaryColor} strokeWidth={motifStroke * 0.9} />

          {/* 4 Corner Celtic Knot Rings */}
          {[
            [leftX, topY],
            [rightX, topY],
            [rightX, botY],
            [leftX, botY],
          ].map(([cx, cy], idx) => {
            const cSize = Math.max(8, step - 8);
            return (
              <g key={`cb-c-${idx}`}>
                <rect x={cx - cSize / 2} y={cy - cSize / 2} width={cSize} height={cSize} rx={3} fill="#fff" stroke={primaryColor} strokeWidth={motifStroke * 0.7} />
                <circle cx={cx} cy={cy} r={cSize * 0.35} fill="none" stroke={secondaryColor} strokeWidth={motifStroke} />
              </g>
            );
          })}
        </svg>
      );
    }

    case "diamond-lattice": {
      const off0 = edgeInset;
      const step = spanUnits;
      const topY = (off0 + offInner) / 2;
      const botY = innerH - (off0 + offInner) / 2;
      const leftX = (off0 + offInner) / 2;
      const rightX = innerW - (off0 + offInner) / 2;
      const dSize = Math.max(8, Math.round(10 * dScale));
      const dStep = Math.max(16, Math.round(24 * dScale));

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer rect */}
          <rect x={off0} y={off0} width={innerW - off0 * 2} height={innerH - off0 * 2} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
          {/* Inner 100% clean rectangular border */}
          <rect x={offInner} y={offInner} width={innerW - offInner * 2} height={innerH - offInner * 2} fill="none" stroke={secondaryColor} strokeWidth={widths[1]} />

          {/* Repeating Bold Rhombus Diamonds */}
          <g fill={secondaryColor}>
            {Array.from({ length: Math.floor((innerW - offInner * 2 - 20) / dStep) }, (_, i) => {
              const x = offInner + 10 + i * dStep;
              return (
                <g key={`dl-tb-${i}`}>
                  <polygon points={`${x},${topY - dSize / 2} ${x + dSize / 2},${topY} ${x},${topY + dSize / 2} ${x - dSize / 2},${topY}`} />
                  <polygon points={`${x},${botY - dSize / 2} ${x + dSize / 2},${botY} ${x},${botY + dSize / 2} ${x - dSize / 2},${botY}`} />
                </g>
              );
            })}
            {Array.from({ length: Math.floor((innerH - offInner * 2 - 20) / dStep) }, (_, i) => {
              const y = offInner + 10 + i * dStep;
              return (
                <g key={`dl-lr-${i}`}>
                  <polygon points={`${leftX},${y - dSize / 2} ${leftX + dSize / 2},${y} ${leftX},${y + dSize / 2} ${leftX - dSize / 2},${y}`} />
                  <polygon points={`${rightX},${y - dSize / 2} ${rightX + dSize / 2},${y} ${rightX},${y + dSize / 2} ${rightX - dSize / 2},${y}`} />
                </g>
              );
            })}
          </g>

          {/* 4 Corner Nested Diamond Rosettes */}
          {[
            [leftX, topY],
            [rightX, topY],
            [rightX, botY],
            [leftX, botY],
          ].map(([cx, cy], idx) => {
            const cSize = Math.max(8, step - 8);
            return (
              <g key={`dl-c-${idx}`}>
                <rect x={cx - cSize / 2} y={cy - cSize / 2} width={cSize} height={cSize} fill="#fff" stroke={primaryColor} strokeWidth={1.4} />
                <polygon points={`${cx},${cy - cSize * 0.38} ${cx + cSize * 0.38},${cy} ${cx},${cy + cSize * 0.38} ${cx - cSize * 0.38},${cy}`} fill={secondaryColor} />
                <circle cx={cx} cy={cy} r={1.5} fill="#fff" />
              </g>
            );
          })}
        </svg>
      );
    }

    case "antique-atlas": {
      const off0 = edgeInset;
      const step = spanUnits;

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer double line */}
          <rect x={off0} y={off0} width={innerW - off0 * 2} height={innerH - off0 * 2} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
          <rect x={off0 + 3} y={off0 + 3} width={innerW - (off0 + 3) * 2} height={innerH - (off0 + 3) * 2} fill="none" stroke={secondaryColor} strokeWidth={1.4} />
          {/* Inner 100% clean rectangular border */}
          <rect x={offInner} y={offInner} width={innerW - offInner * 2} height={innerH - offInner * 2} fill="none" stroke={primaryColor} strokeWidth={widths[1]} />

          {/* 4 Corner Radiating Flutes */}
          {[
            { x: off0, y: off0, sx: 1, sy: 1 },
            { x: innerW - off0, y: off0, sx: -1, sy: 1 },
            { x: innerW - off0, y: innerH - off0, sx: -1, sy: -1 },
            { x: off0, y: innerH - off0, sx: 1, sy: -1 },
          ].map(({ x, y, sx, sy }, idx) => (
            <g key={`aa-c-${idx}`} transform={`translate(${x}, ${y}) scale(${sx * dScale}, ${sy * dScale})`}>
              <path d={`M 0 ${step - 4} A ${step - 4} ${step - 4} 0 0 1 ${step - 4} 0`} fill="none" stroke={secondaryColor} strokeWidth={1.8} />
              <line x1="0" y1="0" x2={(step - 4) * 0.92} y2={(step - 4) * 0.3} stroke={primaryColor} strokeWidth={1.5} />
              <line x1="0" y1="0" x2={(step - 4) * 0.72} y2={(step - 4) * 0.72} stroke={secondaryColor} strokeWidth={1.6} />
              <line x1="0" y1="0" x2={(step - 4) * 0.3} y2={(step - 4) * 0.92} stroke={primaryColor} strokeWidth={1.5} />
              <circle cx="6" cy="6" r="2.5" fill={secondaryColor} />
            </g>
          ))}
        </svg>
      );
    }

    case "architectural-grid": {
      const off0 = edgeInset;
      const step = spanUnits;
      const topY = (off0 + offInner) / 2;
      const leftX = (off0 + offInner) / 2;
      const rightX = innerW - (off0 + offInner) / 2;
      const botY = innerH - (off0 + offInner) / 2;

      return (
        <svg
          className={`neatline-artwork ${className}`}
          viewBox={`0 0 ${innerW} ${innerH}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {gradientDef}
          {/* Outer hairline */}
          <rect x={off0} y={off0} width={innerW - off0 * 2} height={innerH - off0 * 2} fill="none" stroke={primaryColor} strokeWidth={widths[0]} />
          {/* Inner 100% clean rectangular border */}
          <rect x={offInner} y={offInner} width={innerW - offInner * 2} height={innerH - offInner * 2} fill="none" stroke={primaryColor} strokeWidth={widths[1]} />

          {/* Drafting Millimeter Micro-Ruler Ticks */}
          <g stroke={secondaryColor}>
            {Array.from({ length: Math.floor((innerW - offInner * 2) / 14) }, (_, i) => {
              const x = offInner + 7 + i * 14;
              const isMaj = i % 5 === 0;
              const len = isMaj ? 12 : 6;
              return <line key={`ag-t-${i}`} x1={x} y1={topY - len / 2} x2={x} y2={topY + len / 2} strokeWidth={isMaj ? 1.8 : 1.0} />;
            })}
            {Array.from({ length: Math.floor((innerH - offInner * 2) / 14) }, (_, i) => {
              const y = offInner + 7 + i * 14;
              const isMaj = i % 5 === 0;
              const len = isMaj ? 12 : 6;
              return <line key={`ag-l-${i}`} x1={leftX - len / 2} y1={y} x2={leftX + len / 2} y2={y} strokeWidth={isMaj ? 1.8 : 1.0} />;
            })}
          </g>

          {/* 4 Corner Blueprint Coordinate Crosshairs */}
          {[
            [leftX, topY],
            [rightX, topY],
            [rightX, botY],
            [leftX, botY],
          ].map(([cx, cy], idx) => {
            const crossR = Math.max(5, Math.round(8 * dScale));
            const circR = Math.max(4, Math.round(6 * dScale));
            const motifStroke = Math.max(1.0, 1.4 * dScale);
            return (
              <g key={`ag-c-${idx}`}>
                <circle cx={cx} cy={cy} r={circR} fill="#fff" stroke={secondaryColor} strokeWidth={motifStroke} />
                <line x1={cx - crossR} y1={cy} x2={cx + crossR} y2={cy} stroke={primaryColor} strokeWidth={Math.max(1.2, 1.6 * dScale)} />
                <line x1={cx} y1={cy - crossR} x2={cx + crossR} y2={cy + crossR} stroke={primaryColor} strokeWidth={Math.max(1.2, 1.6 * dScale)} />
                <circle cx={cx} cy={cy} r={Math.max(1.2, 1.8 * dScale)} fill={secondaryColor} />
              </g>
            );
          })}
        </svg>
      );
    }

    default:
      return null;
  }
}

function NeatlineSwatch({
  style,
  selection,
}: {
  style: BorderStyle;
  selection: NeatlineSelection;
}) {
  const isMix = selection.colorMode === "mix";
  const swatchGradId = `swatch-grad-${style.id}`;
  const fromColor = selection.gradientFrom || "#f43f5e";
  const toColor = selection.gradientTo || "#fb923c";

  // Blueprint blue lines matching LayoutCard
  const hasCustomColor = Boolean(
    selection.singleColor &&
      selection.singleColor !== "#354b62" &&
      selection.singleColor !== "#9CC3DA",
  );
  const p = isMix
    ? `url(#${swatchGradId})`
    : hasCustomColor
      ? (selection.singleColor as string)
      : "#9CC3DA";
  const s = isMix
    ? `url(#${swatchGradId})`
    : hasCustomColor
      ? (selection.singleColor as string)
      : "#4B91B7";

  const swatchGradientDef = isMix ? (
    <defs>
      <linearGradient
        id={swatchGradId}
        x1="0"
        y1="0"
        x2="64"
        y2="40"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor={fromColor} />
        <stop offset="100%" stopColor={toColor} />
      </linearGradient>
    </defs>
  ) : null;

  if (style.id === "none") {
    return (
      <span className="neatline-swatch" aria-hidden="true">
        <svg viewBox="0 0 64 40" preserveAspectRatio="none" className="neatline-swatch-artwork">
          <rect
            x="2"
            y="2"
            width="60"
            height="36"
            rx="4"
            fill="none"
            stroke="#9CC3DA"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.35"
          />
          <rect
            x="7"
            y="6"
            width="50"
            height="28"
            rx="2.5"
            fill="#4B91B7"
            opacity="0.75"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="neatline-swatch" aria-hidden="true">
      <svg viewBox="0 0 64 40" preserveAspectRatio="none" className="neatline-swatch-artwork">
        {swatchGradientDef}
        {(() => {
          switch (style.pattern) {
            case "single":
              return (
                <g>
                  <rect x="3" y="3" width="58" height="34" rx="3.5" fill="none" stroke={p} strokeWidth="2.2" />
                  <rect x="10" y="8" width="44" height="24" rx="2" fill={s} opacity="0.35" />
                </g>
              );

            case "double":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="7" y="7" width="50" height="26" rx="2.5" stroke={s} strokeWidth="1.2" />
                  <rect x="12" y="11" width="40" height="18" rx="1.5" fill={s} opacity="0.28" stroke="none" />
                </g>
              );

            case "triple":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.5" />
                  <rect x="6.5" y="6.5" width="51" height="27" rx="2.5" stroke={s} strokeWidth="1.0" />
                  <rect x="10" y="10" width="44" height="20" rx="2" stroke={p} strokeWidth="1.2" />
                  <rect x="14" y="13" width="36" height="14" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "thick-thin":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="2.6" />
                  <rect x="8" y="8" width="48" height="24" rx="2.5" stroke={s} strokeWidth="1.0" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "thin-thick":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.0" />
                  <rect x="7.5" y="7.5" width="49" height="25" rx="2.5" stroke={s} strokeWidth="2.4" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "triple-sandwich":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.0" />
                  <rect x="6.5" y="6.5" width="51" height="27" rx="2.5" stroke={s} strokeWidth="2.2" />
                  <rect x="10.5" y="10.5" width="43" height="19" rx="2" stroke={p} strokeWidth="1.0" />
                  <rect x="15" y="14" width="34" height="12" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "dashed":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" strokeDasharray="5 3" />
                  <rect x="8" y="8" width="48" height="24" rx="2.5" stroke={s} strokeWidth="1.1" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "dotted":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.5" />
                  <rect x="7.5" y="7.5" width="49" height="25" rx="2.5" stroke={s} strokeWidth="2" strokeDasharray="1 3.5" strokeLinecap="round" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "dash-dot":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" strokeDasharray="7 2 1.5 2" />
                  <rect x="8" y="8" width="48" height="24" rx="2.5" stroke={s} strokeWidth="1.0" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "notched-corner":
              return (
                <g fill="none">
                  <path d="M 9 3 H 55 L 61 9 V 31 L 55 37 H 9 L 3 31 V 9 Z" stroke={p} strokeWidth="1.8" />
                  <rect x="8" y="7.5" width="48" height="25" rx="2" stroke={s} strokeWidth="1.1" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "surveyor-ticks":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.4" />
                  <rect x="8" y="8" width="48" height="24" rx="2" stroke={s} strokeWidth="1.1" />
                  <line x1="16" y1="3" x2="16" y2="8" stroke={s} strokeWidth="1" />
                  <line x1="32" y1="3" x2="32" y2="8" stroke={s} strokeWidth="1.4" />
                  <line x1="48" y1="3" x2="48" y2="8" stroke={s} strokeWidth="1" />
                  <line x1="16" y1="32" x2="16" y2="37" stroke={s} strokeWidth="1" />
                  <line x1="32" y1="32" x2="32" y2="37" stroke={s} strokeWidth="1.4" />
                  <line x1="48" y1="32" x2="48" y2="37" stroke={s} strokeWidth="1" />
                  <line x1="3" y1="20" x2="8" y2="20" stroke={s} strokeWidth="1.4" />
                  <line x1="56" y1="20" x2="61" y2="20" stroke={s} strokeWidth="1.4" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "greek-key":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="9" y="8" width="46" height="24" rx="2" stroke={s} strokeWidth="1.2" />
                  <path d="M 4 8 H 7 V 5 M 60 8 H 57 V 5 M 4 32 H 7 V 35 M 60 32 H 57 V 35" stroke={s} strokeWidth="1.2" />
                  <polygon points="32,4 34,5.5 32,7 30,5.5" fill={s} stroke="none" />
                  <polygon points="32,33 34,34.5 32,36 30,34.5" fill={s} stroke="none" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "victorian-filigree":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="5.5" y="5.5" width="53" height="29" stroke={s} strokeWidth="0.8" opacity="0.65" />
                  <rect x="9.5" y="8.5" width="45" height="23" rx="2" stroke={p} strokeWidth="1.3" />
                  <polygon points="5.5,5.5 9.5,5.5 5.5,9.5" fill={s} stroke="none" />
                  <polygon points="58.5,5.5 54.5,5.5 58.5,9.5" fill={s} stroke="none" />
                  <polygon points="58.5,34.5 54.5,34.5 58.5,30.5" fill={s} stroke="none" />
                  <polygon points="5.5,34.5 9.5,34.5 5.5,30.5" fill={s} stroke="none" />
                  <polygon points="32,3.5 34,5.5 32,7.5 30,5.5" fill={s} stroke="none" />
                  <polygon points="32,32.5 34,34.5 32,36.5 30,34.5" fill={s} stroke="none" />
                  <rect x="13.5" y="12" width="37" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "art-deco-stepped":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="2.0" />
                  <rect x="9.5" y="8.5" width="45" height="23" rx="2" stroke={s} strokeWidth="1.3" />
                  <path d="M 5 5 H 9 V 6.5 H 7 V 8.5 H 5 Z" fill={s} stroke="none" />
                  <path d="M 59 5 H 55 V 6.5 H 57 V 8.5 H 59 Z" fill={s} stroke="none" />
                  <path d="M 59 35 H 55 V 33.5 H 57 V 31.5 H 59 Z" fill={s} stroke="none" />
                  <path d="M 5 35 H 9 V 33.5 H 7 V 31.5 H 5 Z" fill={s} stroke="none" />
                  <polygon points="28,3 32,6 36,3" fill={p} stroke="none" />
                  <polygon points="28,37 32,34 36,37" fill={p} stroke="none" />
                  <rect x="13.5" y="12" width="37" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "nautical-compass":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="9" y="8" width="46" height="24" rx="2" stroke={s} strokeWidth="1.2" />
                  <polygon points="6,4.5 7,6 6,7.5 5,6" fill={s} stroke="none" />
                  <polygon points="58,4.5 59,6 58,7.5 57,6" fill={s} stroke="none" />
                  <polygon points="6,32.5 7,34 6,35.5 5,34" fill={s} stroke="none" />
                  <polygon points="58,32.5 59,34 58,35.5 57,34" fill={s} stroke="none" />
                  <polygon points="32,3 33.5,5.5 32,8 30.5,5.5" fill={s} stroke="none" />
                  <polygon points="32,32 33.5,34.5 32,37 30.5,34.5" fill={s} stroke="none" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "celtic-braid":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="9" y="8" width="46" height="24" rx="2" stroke={s} strokeWidth="1.2" />
                  <path d="M 22 5.5 Q 27 3.5 32 5.5 Q 37 7.5 42 5.5" stroke={s} strokeWidth="1.1" />
                  <path d="M 22 34.5 Q 27 32.5 32 34.5 Q 37 36.5 42 34.5" stroke={s} strokeWidth="1.1" />
                  <circle cx="6" cy="6" r="1.4" fill={s} stroke="none" />
                  <circle cx="58" cy="6" r="1.4" fill={s} stroke="none" />
                  <circle cx="58" cy="34" r="1.4" fill={s} stroke="none" />
                  <circle cx="6" cy="34" r="1.4" fill={s} stroke="none" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "diamond-lattice":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="9" y="8" width="46" height="24" rx="2" stroke={s} strokeWidth="1.2" />
                  <polygon points="20,4.5 22,5.5 20,6.5 18,5.5" fill={s} stroke="none" />
                  <polygon points="32,4.5 34,5.5 32,6.5 30,5.5" fill={s} stroke="none" />
                  <polygon points="44,4.5 46,5.5 44,6.5 42,5.5" fill={s} stroke="none" />
                  <polygon points="20,33.5 22,34.5 20,35.5 18,34.5" fill={s} stroke="none" />
                  <polygon points="32,33.5 34,34.5 32,35.5 30,34.5" fill={s} stroke="none" />
                  <polygon points="44,33.5 46,34.5 44,35.5 42,34.5" fill={s} stroke="none" />
                  <polygon points="6,19 7,20 6,21 5,20" fill={s} stroke="none" />
                  <polygon points="58,19 59,20 58,21 57,20" fill={s} stroke="none" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "antique-atlas":
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="9" y="8" width="46" height="24" rx="2" stroke={s} strokeWidth="1.2" />
                  <rect x="4.5" y="4.5" width="3" height="3" stroke={s} strokeWidth="0.9" />
                  <rect x="56.5" y="4.5" width="3" height="3" stroke={s} strokeWidth="0.9" />
                  <rect x="4.5" y="32.5" width="3" height="3" stroke={s} strokeWidth="0.9" />
                  <rect x="56.5" y="32.5" width="3" height="3" stroke={s} strokeWidth="0.9" />
                  <circle cx="32" cy="5.5" r="1.3" fill={s} stroke="none" />
                  <circle cx="32" cy="34.5" r="1.3" fill={s} stroke="none" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            case "architectural-grid":
              return (
                <g fill="none">
                  <line x1="2" y1="5.5" x2="62" y2="5.5" stroke={p} strokeWidth="1.4" />
                  <line x1="2" y1="34.5" x2="62" y2="34.5" stroke={p} strokeWidth="1.4" />
                  <line x1="5.5" y1="2" x2="5.5" y2="38" stroke={p} strokeWidth="1.4" />
                  <line x1="58.5" y1="2" x2="58.5" y2="38" stroke={p} strokeWidth="1.4" />
                  <rect x="9" y="9" width="46" height="22" rx="1.5" stroke={s} strokeWidth="1.1" />
                  <rect x="13" y="12" width="38" height="16" rx="1" fill={s} opacity="0.25" stroke="none" />
                </g>
              );

            default:
              return (
                <g fill="none">
                  <rect x="3" y="3" width="58" height="34" rx="3.5" stroke={p} strokeWidth="1.8" />
                  <rect x="8" y="8" width="48" height="24" rx="2" stroke={s} strokeWidth="1.2" />
                  <rect x="13" y="12" width="38" height="16" rx="1.5" fill={s} opacity="0.25" stroke="none" />
                </g>
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
  const [isEditingThickness, setIsEditingThickness] = useState(false);

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

  const displayedStyles: BorderStyle[] = [
    { id: "none", name: "No border", kind: "line", pattern: "single" },
    ...lineStyles,
  ];
  const lineWidths = selectedLine
    ? widthsFor(selectedLine.id, selection.thicknesses)
    : [];
  const layerCount = selection.lineId !== "none" ? 1 : 0;

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
          mapGapCm: selection.mapGapCm ?? 0.1,
          colorMode: selection.colorMode ?? "single",
          singleColor: selection.singleColor ?? "#354b62",
          gradientFrom: selection.gradientFrom ?? "#f43f5e",
          gradientTo: selection.gradientTo ?? "#fb923c",
          designScale: selection.designScale ?? 1.0,
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
    setSelection((current) => ({
      ...current,
      lineId: style.id,
      cornerId: "none",
      frameId: "none",
    }));
    setIsEditingThickness(false);
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

  const updateDesignScale = (scale: number) => {
    const clampedScale = Math.min(2.5, Math.max(0.5, Math.round(scale * 10) / 10));
    setSelection((current) => ({
      ...current,
      designScale: clampedScale,
    }));
  };

  const updateMapGap = (value: number) => {
    setSelection((current) => ({
      ...current,
      mapGapCm: value,
    }));
  };

  const isSelected = (style: BorderStyle) => {
    if (style.id === "none") {
      return selection.lineId === "none";
    }
    return style.id === selection.lineId;
  };

  const swatchSelection = (style: BorderStyle): NeatlineSelection => ({
    ...selection,
    lineId: style.id,
    cornerId: "none",
    frameId: "none",
  });

  return (
    <section className="neatline-picker" aria-labelledby="neatline-heading">
      <div className="neatline-picker-heading">
        <div>
          <h3 id="neatline-heading">Borders</h3>
          <p>
            Choose no border or a designer line border · {width} × {height} cm
          </p>
        </div>
        <span className="neatline-count">
          {layerCount} {layerCount === 1 ? "layer" : "layers"}
        </span>
      </div>

      {selectedLine ? (
        <div className="neatline-color-section" role="region" aria-label="Border gradients and colors">
          <div className="neatline-color-header">
            <span className="neatline-color-title">Gradients</span>
            <div className="neatline-water-tabs" role="tablist" aria-label="Color mode">
              <button
                type="button"
                role="tab"
                aria-selected={selection.colorMode !== "mix"}
                className={`neatline-water-tab ${selection.colorMode !== "mix" ? "is-active" : ""}`}
                onClick={() => updateColorMode("single")}
              >
                <span className="neatline-rainbow-dot" />
                Single
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selection.colorMode === "mix"}
                className={`neatline-water-tab ${selection.colorMode === "mix" ? "is-active" : ""}`}
                onClick={() => updateColorMode("mix")}
              >
                <span className="neatline-grad-dot" />
                Mix
              </button>
            </div>
          </div>

          {selection.colorMode === "mix" ? (
            <div className="neatline-boxes-wrap">
              {/* 8 Gradient Rectangular Boxes in 4x2 batch */}
              <div className="neatline-water-grid-4x2" role="group" aria-label="Gradient presets">
                {MIX_GRADIENT_PRESETS.map((preset) => {
                  const isActive =
                    selection.gradientFrom?.toLowerCase() === preset.from.toLowerCase() &&
                    selection.gradientTo?.toLowerCase() === preset.to.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`neatline-water-box ${isActive ? "is-active" : ""}`}
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
                      title={`${preset.from} ➔ ${preset.to}`}
                      aria-label="Preset Gradient"
                      onClick={() => updateMixGradient(preset.from, preset.to)}
                    />
                  );
                })}
              </div>

              {/* Bottom Custom Dual Mix Box */}
              <div className="neatline-custom-mix-bar">
                <div
                  className="neatline-water-dual-box"
                  style={{
                    background: `linear-gradient(90deg, ${selection.gradientFrom || "#f43f5e"}, ${selection.gradientTo || "#fb923c"})`,
                  }}
                >
                  <label className="neatline-water-half left-half" title="Click to pick Start Color">
                    <input
                      type="color"
                      value={selection.gradientFrom || "#f43f5e"}
                      onChange={(e) => updateMixGradient(e.target.value, selection.gradientTo || "#fb923c")}
                    />
                    <span className="neatline-water-pip" style={{ background: selection.gradientFrom || "#f43f5e" }} />
                  </label>
                  <span className="neatline-water-divider" />
                  <label className="neatline-water-half right-half" title="Click to pick End Color">
                    <input
                      type="color"
                      value={selection.gradientTo || "#fb923c"}
                      onChange={(e) => updateMixGradient(selection.gradientFrom || "#f43f5e", e.target.value)}
                    />
                    <span className="neatline-water-pip" style={{ background: selection.gradientTo || "#fb923c" }} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="neatline-boxes-wrap">
              {/* 7 Rainbow Colors: 4 on top row, 3 on bottom row */}
              <div className="neatline-rainbow-batch" role="group" aria-label="Rainbow colors">
                <div className="neatline-rainbow-row row-4">
                  {RAINBOW_COLORS.slice(0, 4).map((c) => {
                    const isActive = selection.singleColor?.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`neatline-water-box ${isActive ? "is-active" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.hex}
                        aria-label="Rainbow color"
                        onClick={() => updateSingleColor(c.hex)}
                      />
                    );
                  })}
                </div>
                <div className="neatline-rainbow-row row-3">
                  {RAINBOW_COLORS.slice(4, 7).map((c) => {
                    const isActive = selection.singleColor?.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`neatline-water-box ${isActive ? "is-active" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.hex}
                        aria-label="Rainbow color"
                        onClick={() => updateSingleColor(c.hex)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Bottom Custom Single Color Box */}
              <div className="neatline-custom-mix-bar">
                <label
                  className="neatline-water-single-box"
                  title="Click to pick custom color"
                  style={{ background: selection.singleColor || "#9CC3DA" }}
                >
                  <input
                    type="color"
                    value={selection.singleColor || "#9CC3DA"}
                    onChange={(e) => updateSingleColor(e.target.value)}
                  />
                  <span className="neatline-water-pip" style={{ background: selection.singleColor || "#9CC3DA" }} />
                </label>
              </div>
            </div>
          )}
        </div>
      ) : null}

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
              <span className="neatline-card-name">{style.name}</span>
              <span className="neatline-card-meta">
                {style.id === "none" ? "Full Bleed Map" : getBorderCategoryTag(style.pattern)}
              </span>
            </div>
            <div className="neatline-card-symbol-wrap">
              <NeatlineSwatch style={style} selection={swatchSelection(style)} />
            </div>
          </button>
        ))}
      </div>

      {selectedLine ? (
        <div className="neatline-edit-wrap">
          <button
            type="button"
            className="neatline-edit-button"
            aria-expanded={isEditingThickness}
            onClick={() => setIsEditingThickness((open) => !open)}
          >
            {isEditingThickness
              ? "Close border settings"
              : "Adjust thickness & map spacing"}
          </button>

          {isEditingThickness ? (
            <fieldset className="neatline-adjustments">
              <legend>Border thickness &amp; spacing</legend>

              {/* Line thickness sliders: 0.05 cm to 1.00 cm (0.5 mm to 10.0 mm) */}
              {thicknessesInCm(selectedLine.id, selection.thicknesses).map((cmVal, index) => {
                return (
                  <label
                    className="neatline-adjustment"
                    key={`${selectedLine.id}-${index}`}
                  >
                    <span className="neatline-adjustment-label">
                      {lineLabel(selectedLine.pattern, index)}
                    </span>
                    <input
                      type="range"
                      min={MIN_LINE_WIDTH_CM}
                      max={MAX_LINE_WIDTH_CM}
                      step="0.05"
                      value={cmVal}
                      onChange={(event) =>
                        updateThickness(index, Number(event.target.value))
                      }
                      aria-label={`${lineLabel(selectedLine.pattern, index)} thickness in cm`}
                    />
                    <output>{cmVal.toFixed(2)} cm ({(cmVal * 10).toFixed(1)} mm)</output>
                  </label>
                );
              })}

              {/* Design size & thickness slider for ornamental patterns */}
              {hasPatternDesign(selectedLine.pattern) ? (
                <label className="neatline-adjustment" key="design-scale-slider">
                  <span className="neatline-adjustment-label">
                    Design size &amp; thickness
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={selection.designScale ?? 1.0}
                    onChange={(event) =>
                      updateDesignScale(Number(event.target.value))
                    }
                    aria-label="Design pattern size and thickness scale"
                  />
                  <output>
                    {((selection.designScale ?? 1.0) * 100).toFixed(0)}% ({(selection.designScale ?? 1.0).toFixed(1)}x)
                  </output>
                </label>
              ) : null}

              {/* Map spacing gap slider (0.1 to 0.5 cm) requested by user */}
              <label className="neatline-adjustment" key="map-gap-slider">
                <span className="neatline-adjustment-label">Map spacing (gap)</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.05"
                  value={selection.mapGapCm ?? 0.1}
                  onChange={(event) => updateMapGap(Number(event.target.value))}
                  aria-label="Map spacing gap in mm"
                />
                <output>{((selection.mapGapCm ?? 0.1) * 10).toFixed(1)} mm</output>
              </label>
              <p className="neatline-adjustments-note">
                {hasPatternDesign(selectedLine.pattern)
                  ? "Adjust line thickness (0.05–1.0 cm), design pattern size & stroke, or map spacing."
                  : "Adjust line thickness (0.05–1.0 cm) and map spacing (Default: 1.0 mm)."}
              </p>
            </fieldset>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
