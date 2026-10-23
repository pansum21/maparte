import { useEffect, useId, useMemo, useState } from "react";
import "./neatline.css";

const CONFIG_STORAGE_KEY = "maparte_neatline_layers";
const LEGACY_STYLE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
export const NEATLINE_CHANGE_EVENT = "maparte:neatline:change";

type LinePattern = "single" | "double" | "triple" | "dashed" | "dotted" | "double-dotted";
type LineStyle = { id: string; name: string; kind: "line"; pattern: LinePattern };
type ArtStyle = { id: string; name: string; kind: "ornament" | "corner" | "frame"; asset: string; variant?: "plain" | "colorful" };
type BorderStyle = LineStyle | ArtStyle;
type ArtVariant = "plain" | "colorful";
export type CornerPosition = "all" | "top" | "bottom" | "left" | "right" | "diagonal-a" | "diagonal-b" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type OrnamentPosition = "top" | "bottom" | "left" | "right" | "both" | "all-sides";
export type NeatlineSelection = {
  lineId: string;
  ornamentId: string;
  cornerId: string;
  frameId: string;
  cornerPosition: CornerPosition;
  ornamentPosition: OrnamentPosition;
  thicknesses: Record<string, number[]>;
  lineVariant: ArtVariant;
  cornerVariant: ArtVariant;
};

const lineStyles: LineStyle[] = [
  { id: "neatline-single", name: "Single line", kind: "line", pattern: "single" },
  { id: "neatline-double", name: "Double line", kind: "line", pattern: "double" },
  { id: "neatline-triple", name: "Triple line", kind: "line", pattern: "triple" },
  { id: "neatline-dashed", name: "Dashed line", kind: "line", pattern: "dashed" },
  { id: "neatline-dotted", name: "Dotted line", kind: "line", pattern: "dotted" },
  { id: "neatline-double-dotted", name: "Double dotted", kind: "line", pattern: "double-dotted" },
];
const decorativeStyles: ArtStyle[] = [
  ...Array.from({ length: 11 }, (_, i) => ({
    id: `border-flourish-${String(i + 1).padStart(2, "0")}`,
    name: `Ornament ${i + 1}`,
    kind: "ornament" as const,
    asset: `/assets/borders/flourish-${String(i + 1).padStart(2, "0")}.svg`,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `border-geometric-${String(i + 1).padStart(2, "0")}`,
    name: `Geometric ${i + 1}`,
    kind: "ornament" as const,
    asset: `/assets/borders/geometric-${String(i + 1).padStart(2, "0")}.svg`,
  })),
];
const cornerStyles: ArtStyle[] = Array.from({ length: 12 }, (_, i) => ({
  id: `border-corner-${String(i + 1).padStart(2, "0")}`,
  name: `Corner ${i + 1}`,
  kind: "corner" as const,
  asset: `/assets/borders/corner-${String(i + 1).padStart(2, "0")}.svg`,
  variant: "plain" as const,
}));
const colorfulCornerStyles: ArtStyle[] = [{
  id: "border-color-corner-oc-301668",
  name: "Floral vine · OpenClipart",
  kind: "corner",
  asset: "/assets/borders/color-corner-oc-301668.svg",
  variant: "colorful",
}];
const initialFrameStyles: ArtStyle[] = [
  { id: "full-frame-flourish-10", name: "Leaf Scrollwork", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-10.svg" },
  { id: "full-frame-flourish-2", name: "Classic Floral Square", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-2.svg" },
  { id: "full-frame-flourish-3", name: "Floral Medallion", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-3.svg" },
  { id: "full-frame-flourish-4", name: "Fine Corner Flourish", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-4.svg" },
  { id: "full-frame-flourish-6", name: "Ornate Scroll", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-6.svg" },
  { id: "full-frame-flourish-7", name: "Bold Scrollwork", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-7.svg" },
  { id: "full-frame-flourish-8", name: "Botanical Scroll", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-8.svg" },
  { id: "full-frame-flourish-9", name: "Vintage Filigree", kind: "frame", asset: "/assets/borders/Decorative-Floral-Flourish-Frame-9.svg" },
  { id: "full-frame-yellow-flowers", name: "Yellow Floral", kind: "frame", asset: "/assets/borders/FloralFrame25.svg" },
  { id: "full-frame-lace", name: "Fine Lace", kind: "frame", asset: "/assets/borders/FloralFrame30.svg" },
  { id: "full-frame-purple-floral", name: "Violet Floral", kind: "frame", asset: "/assets/borders/FloralFrame32.svg" },
  { id: "full-frame-golden-geometric", name: "Golden Geometric", kind: "frame", asset: "/assets/borders/Frame221.svg" },
];
const sourcedFrameFiles = [
  "Abstract-Flowers-Frame-2.svg", "Abstract-Flowers-Frame-3.svg", "Abstract-Flowers-Frame-4.svg", "Abstract-Flowers-Frame-5.svg", "Abstract-Flowers-Frame.svg",
  "Decorative-Floral-Flourish-Frame-11.svg", "Decorative-Floral-Flourish-Frame-13.svg", "Decorative-Flourish-Frame-II-Large.svg", "Decorative-Flourish-Frame-II.svg",
  "Decorative-Ornamental-Flourish-Frame-Extrapolated-2.svg", "Decorative-Ornamental-Flourish-Frame-Extrapolated-5.svg", "Decorative-Ornamental-Flourish-Frame-Extrapolated.svg",
  "Decorative-Ornamental-Flourish-Frame.svg", "FloralFrame19.svg", "FloralFrame20.svg", "FloralFrame23V2.svg", "FloralFrame26.svg", "FloralFrame27.svg", "FloralFrame31.svg",
  "Flowery-Vintage-Frame-2.svg", "Flowery-Vintage-Frame-3.svg", "Flowery-Vintage-Frame-6.svg", "FloweryFrame9.svg", "Frame190Colour2.svg", "Frame222.svg", "Frame222Colour2.svg", "Frame226Colour2.svg",
  "LeafyFrame23.svg", "LeafyFrame25.svg", "Ornamental-Rectangular-Frame.svg", "SensesFrame.svg", "bloomingflowerframe.svg", "easterlillies-frame.svg", "flowerpowerframe.svg", "ornateflowerframe.svg", "simpleflowerframe.svg",
];
const FRAME_DISPLAY_NAMES: Record<string, string> = {
  "bloomingflowerframe.svg": "Blooming Flowers",
  "easterlillies-frame.svg": "Easter Lilies",
  "flowerpowerframe.svg": "Flower Power",
  "ornateflowerframe.svg": "Ornate Flowers",
  "simpleflowerframe.svg": "Simple Floral Border",
};
const displayFrameName = (filename: string) => FRAME_DISPLAY_NAMES[filename]
  ?? filename.replace(/\.svg$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
const frameStyles: ArtStyle[] = [
  ...initialFrameStyles,
  ...sourcedFrameFiles.map((filename) => ({
    id: `full-frame-${filename.replace(/\.svg$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: displayFrameName(filename),
    kind: "frame" as const,
    asset: `/assets/borders/${filename}`,
  })),
];
export const NEATLINE_STYLES = lineStyles;
const DEFAULT_LINE_WIDTHS: Record<LinePattern, number[]> = {
  single: [1.15], double: [1.05, 0.85], triple: [1, 0.8, 0.65], dashed: [1.15],
  dotted: [2.2], "double-dotted": [1.9, 1.55],
};
const MAX_LINE_WIDTH = 5;
const ORNAMENT_POSITIONS: OrnamentPosition[] = ["top", "bottom", "left", "right", "both", "all-sides"];
const ORNAMENT_LABELS: Record<OrnamentPosition, string> = {
  top: "Top center", bottom: "Bottom center", left: "Left center", right: "Right center", both: "Top + bottom", "all-sides": "All four sides",
};
const CORNER_POSITIONS: CornerPosition[] = ["all", "top", "bottom", "left", "right", "diagonal-a", "diagonal-b", "top-left", "top-right", "bottom-left", "bottom-right"];
const CORNER_LABELS: Record<CornerPosition, string> = {
  all: "All four corners", top: "Top pair", bottom: "Bottom pair", left: "Left pair", right: "Right pair",
  "diagonal-a": "Top left + bottom right", "diagonal-b": "Top right + bottom left",
  "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right",
};
const CORNER_NAMES = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;
const LINE_COLORS: Record<"top" | "right" | "bottom" | "left", string> = {
  top: "#b44737", right: "#276b62", bottom: "#bd8735", left: "#526b9b",
};
type CornerName = typeof CORNER_NAMES[number];

const OUTER_MAT_MAX_CM = 0.35;
const MAP_INSET_MAX_CM = 1.65;
const MAP_ART_GAP_CM = 0.22;

/** Shared physical measurements for the white mat, map opening and border art. */
export function getPosterBorderMetrics(widthValue?: string, heightValue?: string) {
  const width = Number(widthValue) > 0 ? Number(widthValue) : 21;
  const height = Number(heightValue) > 0 ? Number(heightValue) : 29.7;
  const shortSide = Math.min(width, height);
  const outerMatCm = Math.min(OUTER_MAT_MAX_CM, shortSide * 0.02);
  const mapInsetCm = Math.min(MAP_INSET_MAX_CM, shortSide * 0.0786);
  const gapCm = Math.min(MAP_ART_GAP_CM, shortSide * 0.012);
  const usableWidthCm = Math.max(0.1, width - outerMatCm * 2);
  const usableHeightCm = Math.max(0.1, height - outerMatCm * 2);
  return {
    outerMatCm,
    mapInsetCm,
    gapCm,
    mapInsetX: `${(mapInsetCm / width) * 100}%`,
    mapInsetY: `${(mapInsetCm / height) * 100}%`,
    matInsetX: `${(outerMatCm / width) * 100}%`,
    matInsetY: `${(outerMatCm / height) * 100}%`,
    usableWidthCm,
    usableHeightCm,
  };
}

function lineCount(pattern: LinePattern): number {
  if (pattern === "double" || pattern === "double-dotted") return 2;
  if (pattern === "triple") return 3;
  return 1;
}
function isLineId(value: string): boolean { return value === "none" || lineStyles.some((style) => style.id === value); }
function isOrnamentId(value: string): boolean { return value === "none" || decorativeStyles.some((style) => style.id === value); }
function isCornerId(value: string): boolean { return value === "none" || [...cornerStyles, ...colorfulCornerStyles].some((style) => style.id === value); }
function isFrameId(value: string): boolean { return value === "none" || frameStyles.some((style) => style.id === value); }

function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number[]> : {};
  } catch { return {}; }
}
function readSelection(): NeatlineSelection {
  const empty: NeatlineSelection = { lineId: "none", ornamentId: "none", cornerId: "none", frameId: "none", cornerPosition: "all", ornamentPosition: "top", thicknesses: readThicknesses(), lineVariant: "plain", cornerVariant: "plain" };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NeatlineSelection>;
      return {
        ...empty,
        ...parsed,
        lineId: parsed.lineId && isLineId(parsed.lineId) ? parsed.lineId : "none",
        // Keep only known vector artwork IDs; drop stale or unknown saved files.
        ornamentId: parsed.ornamentId && isOrnamentId(parsed.ornamentId) ? parsed.ornamentId : "none",
        cornerId: parsed.cornerId && isCornerId(parsed.cornerId) ? parsed.cornerId : "none",
        frameId: parsed.frameId && isFrameId(parsed.frameId) ? parsed.frameId : "none",
        cornerPosition: parsed.cornerPosition && CORNER_POSITIONS.includes(parsed.cornerPosition) ? parsed.cornerPosition : "all",
        ornamentPosition: parsed.ornamentPosition && ORNAMENT_POSITIONS.includes(parsed.ornamentPosition) ? parsed.ornamentPosition : "top",
        lineVariant: parsed.lineVariant === "colorful" ? "colorful" : "plain",
        cornerVariant: parsed.cornerVariant === "colorful" ? "colorful" : "plain",
        thicknesses: readThicknesses(),
      };
    }
    // Migrate a single old style into its matching layer without losing it.
    const legacy = window.localStorage.getItem(LEGACY_STYLE_KEY) || "none";
    if (isLineId(legacy)) empty.lineId = legacy;
    else if (isOrnamentId(legacy)) empty.ornamentId = "none";
    else if (isCornerId(legacy)) empty.cornerId = legacy;
    return empty;
  } catch { return empty; }
}
export function readNeatlineSelection(): NeatlineSelection { return readSelection(); }

function widthsFor(styleId: string, thicknesses: Record<string, number[]>): number[] {
  const style = lineStyles.find((item) => item.id === styleId);
  if (!style) return [];
  const saved = thicknesses[styleId] || [];
  return Array.from({ length: lineCount(style.pattern) }, (_, index) => {
    const value = Number(saved[index]);
    return Number.isFinite(value) ? Math.min(MAX_LINE_WIDTH, Math.max(0.5, value)) : DEFAULT_LINE_WIDTHS[style.pattern][index];
  });
}
function activeCorners(position: CornerPosition): CornerName[] {
  switch (position) {
    case "top": return ["top-left", "top-right"];
    case "bottom": return ["bottom-left", "bottom-right"];
    case "left": return ["top-left", "bottom-left"];
    case "right": return ["top-right", "bottom-right"];
    case "diagonal-a": return ["top-left", "bottom-right"];
    case "diagonal-b": return ["top-right", "bottom-left"];
    case "all": return [...CORNER_NAMES];
    default: return [position];
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
  const ornament = decorativeStyles.find((style) => style.id === selection.ornamentId);
  const corner = [...cornerStyles, ...colorfulCornerStyles].find((style) => style.id === selection.cornerId);
  const frame = frameStyles.find((style) => style.id === selection.frameId);
  const frameClipId = `neatline-frame-${useId().replace(/:/g, "")}`;
  if (!line && !ornament && !corner && !frame) return null;

  const metrics = getPosterBorderMetrics(widthCm, heightCm);
  const innerW = 1000;
  const innerH = innerW * metrics.usableHeightCm / metrics.usableWidthCm;
  const maxStroke = line ? Math.max(...widthsFor(line.id, selection.thicknesses)) : 1.15;
  const unitScale = innerW / metrics.usableWidthCm;
  const mapEdge = Math.max(0, (metrics.mapInsetCm - metrics.outerMatCm) * unitScale);
  const gapUnits = metrics.gapCm * unitScale;
  const lastLineLimit = Math.max(0, mapEdge - gapUnits - maxStroke / 2);
  const ringCm = Math.max(0, metrics.mapInsetCm - metrics.outerMatCm);
  const requestedPad = Math.min(0.4, ringCm * 0.25) * unitScale;
  const pad = Math.min(lastLineLimit, Math.max(requestedPad, maxStroke / 2 + 2));
  const extraLineCount = Math.max(0, (line ? lineCount(line.pattern) : 1) - 1);
  const lineSeparation = extraLineCount
    ? Math.min(0.28 * unitScale, Math.max(0, (lastLineLimit - pad) / extraLineCount))
    : 0;
  const safeArtDepth = Math.max(0, mapEdge - pad - gapUnits);
  const widths = line ? widthsFor(line.id, selection.thicknesses) : [];
  const offsets = line ? line.pattern === "double" || line.pattern === "double-dotted"
    ? [pad, pad + lineSeparation] : line.pattern === "triple" ? [pad, pad + lineSeparation, pad + lineSeparation * 2] : [pad] : [];
  const dotted = line?.pattern === "dotted" || line?.pattern === "double-dotted";
  const dash = line?.pattern === "dashed" ? "12 8" : dotted ? "0.1 12" : undefined;
  const selectedCorners = corner ? activeCorners(selection.cornerPosition) : [];
  const cornerSize = Math.min(safeArtDepth * 0.94, innerW * 0.15, innerH * 0.15);
  const ornamentSize = Math.min(innerW * 0.25, innerH * 0.16);
  const ornamentHeight = Math.min(Math.max(16, ornamentSize * 0.24), safeArtDepth * 0.84);
  const ornamentEdges: Array<"top" | "bottom" | "left" | "right"> = !ornament ? []
    : selection.ornamentPosition === "both" ? ["top", "bottom"]
      : selection.ornamentPosition === "all-sides" ? ["top", "bottom", "left", "right"]
        : [selection.ornamentPosition];
  const cornerGeometry: Record<CornerName, { x: number; y: number; rotate: number }> = {
    // Corner PNGs are authored for the top-right: horizontal art runs left
    // from the top edge and vertical art runs down from the right edge.
    "top-left": { x: pad, y: pad, rotate: 270 }, "top-right": { x: innerW - pad - cornerSize, y: pad, rotate: 0 },
    "bottom-right": { x: innerW - pad - cornerSize, y: innerH - pad - cornerSize, rotate: 90 },
    "bottom-left": { x: pad, y: innerH - pad - cornerSize, rotate: 180 },
  };
  const horizontalGap = ornamentSize + 24;
  const verticalGap = Math.min(innerH * 0.5, ornamentSize + 24);

  return <svg className={`neatline-artwork ${className}`} viewBox={`0 0 ${innerW} ${innerH}`} preserveAspectRatio="none" aria-hidden="true">
    {frame ? <defs><clipPath id={frameClipId}><path fillRule="evenodd" d={`M 0 0 H ${innerW} V ${innerH} H 0 Z M ${mapEdge - gapUnits} ${mapEdge - gapUnits} H ${innerW - mapEdge + gapUnits} V ${innerH - mapEdge + gapUnits} H ${mapEdge - gapUnits} Z`} /></clipPath></defs> : null}
    {frame ? <image href={frame.asset} x="0" y="0" width={innerW} height={innerH}
      preserveAspectRatio="none" clipPath={`url(#${frameClipId})`} /> : null}
    {offsets.map((offset, index) => {
      const segments: Array<{ coords: [number, number, number, number]; edge: "top" | "right" | "bottom" | "left" }> = [];
      // Corner art sits in a fixed box anchored to the outer line. Every
      // parallel stroke must stop at that same box edge so no stray gap opens
      // between the artwork and an inner double/triple stroke.
      const topStart = pad + (selectedCorners.includes("top-left") ? cornerSize : 0);
      const topEnd = innerW - pad - (selectedCorners.includes("top-right") ? cornerSize : 0);
      const bottomStart = pad + (selectedCorners.includes("bottom-left") ? cornerSize : 0);
      const bottomEnd = innerW - pad - (selectedCorners.includes("bottom-right") ? cornerSize : 0);
      const leftStart = pad + (selectedCorners.includes("top-left") ? cornerSize : 0);
      const leftEnd = innerH - pad - (selectedCorners.includes("bottom-left") ? cornerSize : 0);
      const rightStart = pad + (selectedCorners.includes("top-right") ? cornerSize : 0);
      const rightEnd = innerH - pad - (selectedCorners.includes("bottom-right") ? cornerSize : 0);
      const addHorizontal = (edge: "top" | "bottom", start: number, end: number, y: number) => {
        if (end <= start) return;
        if (!ornamentEdges.includes(edge)) { segments.push({ coords: [start, y, end, y], edge }); return; }
        const gapStart = (innerW - horizontalGap) / 2;
        const gapEnd = (innerW + horizontalGap) / 2;
        if (gapStart > start) segments.push({ coords: [start, y, Math.min(end, gapStart), y], edge });
        if (end > gapEnd) segments.push({ coords: [Math.max(start, gapEnd), y, end, y], edge });
      };
      const addVertical = (edge: "left" | "right", start: number, end: number, x: number) => {
        if (end <= start) return;
        if (!ornamentEdges.includes(edge)) { segments.push({ coords: [x, start, x, end], edge }); return; }
        const gapStart = (innerH - verticalGap) / 2;
        const gapEnd = (innerH + verticalGap) / 2;
        if (gapStart > start) segments.push({ coords: [x, start, x, Math.min(end, gapStart)], edge });
        if (end > gapEnd) segments.push({ coords: [x, Math.max(start, gapEnd), x, end], edge });
      };
      addHorizontal("top", topStart, topEnd, offset);
      addHorizontal("bottom", bottomStart, bottomEnd, innerH - offset);
      addVertical("left", leftStart, leftEnd, offset);
      addVertical("right", rightStart, rightEnd, innerW - offset);
      return <g key={`line-${offset}`} fill="none" strokeWidth={widths[index] ?? 1.15}
        strokeDasharray={dash} strokeLinecap={dotted ? "round" : "butt"} shapeRendering="geometricPrecision">
        {segments.map(({ coords: [x1, y1, x2, y2], edge }, segmentIndex) => <line key={`${edge}-${segmentIndex}`} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={selection.lineVariant === "colorful" ? LINE_COLORS[edge] : "#354b62"} />)}
      </g>;
    })}
    {ornament && ornamentHeight > 0 && ornamentEdges.map((edge) => {
      const centerX = edge === "left" ? pad : edge === "right" ? innerW - pad : innerW / 2;
      const centerY = edge === "top" ? pad : edge === "bottom" ? innerH - pad : innerH / 2;
      const rotation = edge === "bottom" ? 180 : edge === "left" ? 270 : edge === "right" ? 90 : 0;
      const transform = rotation ? `rotate(${rotation} ${centerX} ${centerY})` : undefined;
      return <image key={edge} href={ornament.asset} x={centerX - ornamentSize / 2} y={centerY - ornamentHeight / 2}
        width={ornamentSize} height={ornamentHeight} transform={transform} preserveAspectRatio="xMidYMid meet" />;
    })}
    {corner && selectedCorners.map((position) => {
      const item = cornerGeometry[position];
      return <image key={position} href={corner.asset} x={item.x} y={item.y} width={cornerSize} height={cornerSize}
        transform={`rotate(${item.rotate} ${item.x + cornerSize / 2} ${item.y + cornerSize / 2})`} preserveAspectRatio="none" />;
    })}
  </svg>;
}

function NeatlineSwatch({ style, selection }: { style: BorderStyle; selection: NeatlineSelection }) {
  const isLine = style.kind === "line";
  const isOrnament = style.kind === "ornament";
  const isFrame = style.kind === "frame";
  const line = isLine
    ? (style.id === "none" ? undefined : style)
    : lineStyles.find((item) => item.id === selection.lineId) || lineStyles[0];
  const ornament = isOrnament ? style : undefined;
  const corner = style.kind === "corner" ? style : undefined;
  const frame = isFrame ? style : undefined;
  if (frame?.asset) return <span className="neatline-swatch" aria-hidden="true">
    <img className="neatline-frame-thumb" src={frame.asset} alt="" loading="lazy" decoding="async" />
  </span>;
  const widths = line ? widthsFor(line.id, selection.thicknesses) : [];
  const inset = 13;
  const cornerSize = 72;
  const renderCornerLines = !!line && (isLine || !!ornament);

  return <span className="neatline-swatch" aria-hidden="true">
    <svg className="neatline-artwork neatline-swatch-artwork" viewBox="0 0 120 90" preserveAspectRatio="none">
      {renderCornerLines ? widths.map((width, index) => {
        const offset = index * 8;
        const start = inset + offset;
        const end = 110 - offset;
        const paths = [
          { edge: "top" as const, d: `M ${start} ${start} H ${end}` },
          { edge: "right" as const, d: `M ${end} ${start} V ${end}` },
          { edge: "bottom" as const, d: `M ${end} ${end} H ${start}` },
          { edge: "left" as const, d: `M ${start} ${end} V ${start}` },
        ];
        const isDotted = line?.pattern === "dotted" || line?.pattern === "double-dotted";
        const dash = line?.pattern === "dashed" ? "7 4" : isDotted ? "0.1 6" : undefined;
        const strokeWidth = Math.max(1.35, Math.min(2.6, width * 1.4));
        return <g key={index} fill="none" strokeWidth={strokeWidth} strokeDasharray={dash}
          strokeLinecap={isDotted ? "round" : "butt"} strokeLinejoin="miter">
          {paths.map(({ edge, d }) => <path key={edge} d={d}
            stroke={selection.lineVariant === "colorful" ? LINE_COLORS[edge] : "#354b62"} />)}
        </g>;
      }) : null}
      {ornament ? <>
        <path d="M 13 22 H 16 M 104 22 H 107" fill="none" stroke="#354b62" strokeWidth="1.4" />
        <image href={ornament.asset} x="16" y="5" width="88" height="34" preserveAspectRatio="xMidYMid meet" />
      </> : null}
      {corner ? <image href={corner.asset} x="35" y="4" width={cornerSize} height={cornerSize}
        preserveAspectRatio="none" /> : null}
      {frame?.asset ? <image href={frame.asset} x="2" y="2" width="116" height="86" preserveAspectRatio="none" /> : null}
    </svg>
  </span>;
}

function lineLabel(index: number, count: number): string {
  if (count === 1) return "Line thickness";
  if (count === 2) return index === 0 ? "Outer line" : "Inner line";
  return ["Outer line", "Middle line", "Inner line"][index];
}

export function NeatlinePicker({ width, height }: { width: string; height: string }) {
  const [selection, setSelection] = useState<NeatlineSelection>(readSelection);
  const [category, setCategory] = useState<"line" | "center" | "corner" | "frame">("line");
  const [variant, setVariant] = useState<ArtVariant>(() => readSelection().lineVariant);
  const [isEditingThickness, setIsEditingThickness] = useState(false);
  const selectedLine = useMemo(() => lineStyles.find((style) => style.id === selection.lineId), [selection.lineId]);
  const activeCategoryStyles: BorderStyle[] = category === "line" ? lineStyles
    : category === "center" ? decorativeStyles
      : category === "corner" ? variant === "colorful" ? colorfulCornerStyles : cornerStyles
        : frameStyles;
  const displayedStyles: BorderStyle[] = category === "line" ? [{ id: "none", name: "No line", kind: "line", pattern: "single" }, ...activeCategoryStyles]
    : category === "center" ? [{ id: "none-center", name: "No center design", kind: "ornament", asset: "" }, ...activeCategoryStyles]
      : category === "corner" ? [{ id: "none-corner", name: "No corner art", kind: "corner", asset: "" }, ...activeCategoryStyles]
        : [{ id: "none-frame", name: "No full frame", kind: "frame", asset: "" }, ...activeCategoryStyles];
  const lineWidths = selectedLine ? widthsFor(selectedLine.id, selection.thicknesses) : [];

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
        lineId: selection.lineId, ornamentId: selection.ornamentId, cornerId: selection.cornerId, frameId: selection.frameId,
        cornerPosition: selection.cornerPosition, ornamentPosition: selection.ornamentPosition,
        lineVariant: selection.lineVariant, cornerVariant: selection.cornerVariant,
      }));
      window.localStorage.setItem(THICKNESS_STORAGE_KEY, JSON.stringify(selection.thicknesses));
      // Keep the original key in sync for older preview and export readers.
      window.localStorage.setItem(LEGACY_STYLE_KEY, selection.lineId);
    } catch { /* keep the current border state for this session */ }
    window.dispatchEvent(new CustomEvent<NeatlineSelection>(NEATLINE_CHANGE_EVENT, { detail: selection }));
  }, [selection]);

  const selectStyle = (style: BorderStyle) => {
    setSelection((current) => {
      if (style.id === "none") return { ...current, lineId: "none" };
      if (style.kind === "line") return { ...current, lineId: style.id };
      if (style.id === "none-center") return { ...current, ornamentId: "none" };
      if (style.id === "none-corner") return { ...current, cornerId: "none" };
      if (style.id === "none-frame") return { ...current, frameId: "none" };
      if (style.kind === "ornament") return { ...current, ornamentId: style.id };
      if (style.kind === "frame") return { ...current, frameId: style.id };
      return { ...current, cornerId: style.id, cornerVariant: style.variant ?? "plain" };
    });
    setIsEditingThickness(false);
  };
  const updateThickness = (lineIndex: number, value: number) => {
    if (!selectedLine) return;
    setSelection((current) => {
      const next = widthsFor(selectedLine.id, current.thicknesses);
      next[lineIndex] = value;
      return { ...current, thicknesses: { ...current.thicknesses, [selectedLine.id]: next } };
    });
  };
  const swatchSelection = (style: BorderStyle): NeatlineSelection => {
    if (style.kind === "line") return { ...selection, lineId: style.id };
    if (style.id === "none-center") return { ...selection, ornamentId: "none" };
    if (style.id === "none-corner") return { ...selection, cornerId: "none" };
    if (style.id === "none-frame") return { ...selection, frameId: "none" };
    if (style.kind === "ornament") return { ...selection, lineId: selection.lineId === "none" ? "neatline-single" : selection.lineId, ornamentId: style.id };
    if (style.kind === "frame") return { ...selection, frameId: style.id };
    return { ...selection, lineId: selection.lineId === "none" ? "neatline-single" : selection.lineId, cornerId: style.id,
      cornerVariant: style.variant ?? "plain" };
  };
  const isSelected = (style: BorderStyle) => style.id === "none" ? selection.lineId === "none"
    : style.id === "none-center" ? selection.ornamentId === "none"
      : style.id === "none-corner" ? selection.cornerId === "none"
      : style.id === "none-frame" ? selection.frameId === "none"
    : style.kind === "line" ? style.id === selection.lineId
      : style.kind === "ornament" ? style.id === selection.ornamentId : style.kind === "frame" ? style.id === selection.frameId : style.id === selection.cornerId;

  return <section className="neatline-picker" aria-labelledby="neatline-heading">
    <div className="neatline-picker-heading"><div><h3 id="neatline-heading">Border styles</h3>
      <p>Choose separate layers. Artwork stays outside the map edge with a white gap · {width} × {height} cm</p></div>
      <span className="neatline-count">{[selection.lineId !== "none", selection.ornamentId !== "none", selection.cornerId !== "none", selection.frameId !== "none"].filter(Boolean).length} layers</span></div>
    <div className="neatline-tabs" role="tablist" aria-label="Border layer">
      {([["line", "Line border"], ["center", "Center design"], ["corner", "Corner design"], ["frame", "Full frame"]] as const).map(([id, label]) =>
        <button type="button" role="tab" aria-selected={category === id} className={category === id ? "is-active" : ""} key={id} onClick={() => {
          setCategory(id);
          if (id === "line") setVariant(selection.lineVariant);
          if (id === "corner") setVariant(selection.cornerVariant);
        }}>{label}</button>)}
    </div>
    {category === "line" || category === "corner" ? <div className="neatline-variants" role="group" aria-label={`${category} color style`}>
      {([["plain", "Plain"], ["colorful", "Colorful"]] as const).map(([id, label]) => <button key={id} type="button"
        className={variant === id ? "is-active" : ""} aria-pressed={variant === id} onClick={() => {
          setVariant(id);
          if (category === "line") setSelection((current) => ({ ...current, lineVariant: id }));
          else if (category === "corner") setSelection((current) => ({ ...current, cornerVariant: id, cornerId: "none" }));
        }}>{label}</button>)}
    </div> : null}
    <div className="neatline-options" role="group" aria-label={`Choose ${category} border layer`}>
      {displayedStyles.map((style) => <button key={`${category}-${style.id}`} type="button" title={style.name} aria-pressed={isSelected(style)}
        className={`neatline-option ${isSelected(style) ? "is-selected" : ""}`} onClick={() => selectStyle(style)}>
        <NeatlineSwatch style={style} selection={swatchSelection(style)} />
        <span className="neatline-option-name">{style.name}</span></button>)}
    </div>
    {category === "corner" && selection.cornerId !== "none" ? <label className="neatline-layer-position">Corner placement
      <select value={selection.cornerPosition} onChange={(event) => setSelection((current) => ({ ...current, cornerPosition: event.target.value as CornerPosition }))}>
        {CORNER_POSITIONS.map((position) => <option key={position} value={position}>{CORNER_LABELS[position]}</option>)}
      </select></label> : null}
    {category === "center" && selection.ornamentId !== "none" ? <label className="neatline-layer-position">Center placement
      <select value={selection.ornamentPosition} onChange={(event) => setSelection((current) => ({ ...current, ornamentPosition: event.target.value as OrnamentPosition }))}>
        {ORNAMENT_POSITIONS.map((position) => <option key={position} value={position}>{ORNAMENT_LABELS[position]}</option>)}
      </select></label> : null}
    {category === "line" && selectedLine ? <div className="neatline-edit-wrap"><button type="button" className="neatline-edit-button" aria-expanded={isEditingThickness}
      onClick={() => setIsEditingThickness((open) => !open)}>{isEditingThickness ? "Close thickness settings" : "Adjust line thickness"}</button>
      {isEditingThickness ? <fieldset className="neatline-adjustments"><legend>Line thickness</legend>
        {lineWidths.map((value, index) => <label className="neatline-adjustment" key={`${selectedLine.id}-${index}`}>
          <span className="neatline-adjustment-label">{lineLabel(index, lineWidths.length)}</span>
          <input type="range" min="0.5" max={MAX_LINE_WIDTH} step="0.1" value={value} onChange={(event) => updateThickness(index, Number(event.target.value))} aria-label={`${lineLabel(index, lineWidths.length)} thickness`} />
          <output>{value.toFixed(1)}</output></label>)}
        <p className="neatline-adjustments-note">Set each line thickness independently. The value helps compare line weight.</p></fieldset> : null}</div> : null}
  </section>;
}
