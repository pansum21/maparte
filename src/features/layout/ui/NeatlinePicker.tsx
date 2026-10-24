import { useEffect, useMemo, useState } from "react";
import frameAssetData from "./aiFrames.json";
import "./neatline.css";

const CONFIG_STORAGE_KEY = "maparte_neatline_layers";
const LEGACY_STYLE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
export const NEATLINE_CHANGE_EVENT = "maparte:neatline:change";

type LinePattern = "single" | "double" | "triple";
type LineStyle = { id: string; name: string; kind: "line"; pattern: LinePattern };
type FrameStyle = { id: string; name: string; kind: "frame"; asset: string; thumbnail: string; width: number; height: number; accent: string };
type BorderStyle = LineStyle | FrameStyle;
type ArtVariant = "plain" | "colorful";
export type CornerPosition = "all";
export type NeatlineSelection = {
  lineId: string;
  /** Kept only to safely migrate old saved projects; corner art is no longer offered. */
  cornerId: string;
  frameId: string;
  cornerPosition: CornerPosition;
  thicknesses: Record<string, number[]>;
  lineVariant: ArtVariant;
  cornerVariant: "plain";
};

const lineStyles: LineStyle[] = [
  { id: "neatline-single", name: "Single line", kind: "line", pattern: "single" },
  { id: "neatline-double", name: "Double line", kind: "line", pattern: "double" },
  { id: "neatline-triple", name: "Triple line", kind: "line", pattern: "triple" },
];
const frameStyles = (frameAssetData as FrameStyle[]).filter((frame) =>
  frame.id === "selected-frame-18" || frame.id === "selected-frame-20",
);
export const NEATLINE_STYLES = lineStyles;
const DEFAULT_LINE_WIDTHS: Record<LinePattern, number[]> = {
  single: [2], double: [1.9, 1.5], triple: [1.8, 1.45, 1.1],
};
const MAX_LINE_WIDTH = 5;
const MIN_FRAME_WIDTH_MM = 0.25;
const DEFAULT_FRAME_WIDTHS_MM: Record<string, number[]> = {
  "selected-frame-18": [0.75, 0.5],
  "selected-frame-20": [0.55, 0.55],
};
const FRAME_LINE_GAP_MM: Record<string, number> = {
  "selected-frame-18": 1.7,
  "selected-frame-20": 1.5,
};
const LINE_COLORS: Record<"top" | "right" | "bottom" | "left", string> = {
  top: "#b44737", right: "#276b62", bottom: "#bd8735", left: "#526b9b",
};

const OUTER_MAT_MAX_CM = 0.35;
const LINE_MAP_INSET_MAX_CM = 1.55;
// Keep the map visibly separated from even the darkest frame artwork in the
// live preview. A 2.2 mm gap collapsed to only a couple of preview pixels.
const MAP_ART_GAP_CM = 0.45;
const FRAME_ART_INSET_CM = 0.12;

/** Shared physical measurements for the mat, map opening, and border art. */
export function getPosterBorderMetrics(widthValue?: string, heightValue?: string, hasAiFrame = false) {
  const width = Number(widthValue) > 0 ? Number(widthValue) : 21;
  const height = Number(heightValue) > 0 ? Number(heightValue) : 29.7;
  const shortSide = Math.min(width, height);
  const aspectRatio = Math.max(width, height) / shortSide;
  const outerMatCm = Math.min(OUTER_MAT_MAX_CM, shortSide * 0.02);
  const lineMapInsetRatio = aspectRatio >= 5 ? 0.18 : aspectRatio >= 3 || shortSide < 5 ? 0.15 : 0.074;
  const lineMapInsetCm = Math.min(LINE_MAP_INSET_MAX_CM, shortSide * lineMapInsetRatio);
  // Keep a small, equal physical gap between the map opening and the frame on
  // all four sides. The frame artwork itself sits just inside the white mat.
  const frameArtInsetCm = Math.min(FRAME_ART_INSET_CM, shortSide * 0.006);
  const frameMapGapCm = Math.min(MAP_ART_GAP_CM, shortSide * 0.035);
  const mapInsetCm = hasAiFrame
    ? outerMatCm + frameArtInsetCm + frameMapGapCm
    : lineMapInsetCm;
  const gapCm = frameMapGapCm;
  const usableWidthCm = Math.max(0.1, width - outerMatCm * 2);
  const usableHeightCm = Math.max(0.1, height - outerMatCm * 2);
  return {
    outerMatCm,
    frameArtInsetCm,
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

/** Full frame SVGs stretch to the selected page ratio while keeping a clear opening. */
export function getAiFramePlacement(widthCm?: string, heightCm?: string) {
  const metrics = getPosterBorderMetrics(widthCm, heightCm, true);
  const width = 1000;
  const height = width * metrics.usableHeightCm / metrics.usableWidthCm;
  const unitScale = width / metrics.usableWidthCm;
  const targetInset = metrics.frameArtInsetCm * unitScale;
  // Generated SVGs reserve a 20-unit transparent edge around their paths.
  // Compensate for that source padding in page units so the physical inset is
  // identical for portrait, square, landscape, and custom layouts.
  const imageWidth = (width - targetInset * 2) / 0.96;
  const imageHeight = (height - targetInset * 2) / (1360 / 1400);
  return {
    x: targetInset - imageWidth * 0.02,
    y: targetInset - imageHeight * (20 / 1400),
    width: imageWidth,
    height: imageHeight,
    artInsetCm: metrics.frameArtInsetCm,
    mapInsetCm: metrics.mapInsetCm,
    whiteGapCm: metrics.gapCm,
  };
}

function lineCount(pattern: LinePattern): number {
  if (pattern === "double") return 2;
  if (pattern === "triple") return 3;
  return 1;
}
function isLineId(value: string): boolean { return value === "none" || lineStyles.some((style) => style.id === value); }
function isFrameId(value: string): boolean { return value === "none" || frameStyles.some((style) => style.id === value); }

function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number[]> : {};
  } catch { return {}; }
}
function readSelection(): NeatlineSelection {
  const empty: NeatlineSelection = { lineId: "none", cornerId: "none", frameId: "none", cornerPosition: "all", thicknesses: readThicknesses(), lineVariant: "plain", cornerVariant: "plain" };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NeatlineSelection>;
      return {
        ...empty,
        lineId: parsed.lineId && isLineId(parsed.lineId) ? parsed.lineId : "none",
        cornerId: "none",
        frameId: parsed.frameId && isFrameId(parsed.frameId) ? parsed.frameId : "none",
        lineVariant: parsed.lineVariant === "colorful" ? "colorful" : "plain",
        thicknesses: readThicknesses(),
      };
    }
    const legacy = window.localStorage.getItem(LEGACY_STYLE_KEY) || "none";
    if (isLineId(legacy)) empty.lineId = legacy;
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

/** Frame outline widths are stored in mm and kept apart to prevent overlaps. */
export function frameWidthsFor(styleId: string, thicknesses: Record<string, number[]>): number[] {
  const defaults = DEFAULT_FRAME_WIDTHS_MM[styleId];
  if (!defaults) return [];
  const saved = thicknesses[styleId] || [];
  const widths = defaults.map((fallback, index) => {
    const value = Number(saved[index]);
    return Number.isFinite(value) ? Math.min(2, Math.max(MIN_FRAME_WIDTH_MM, value)) : fallback;
  });
  const safeTotal = (FRAME_LINE_GAP_MM[styleId] ?? 1.5) - 0.2;
  const sum = widths.reduce((total, width) => total + width, 0);
  if (sum > safeTotal) {
    const factor = safeTotal / sum;
    return widths.map((width) => Math.max(MIN_FRAME_WIDTH_MM, width * factor));
  }
  return widths;
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
  const frame = frameStyles.find((style) => style.id === selection.frameId);
  if (!line && !frame) return null;

  const metrics = getPosterBorderMetrics(widthCm, heightCm, Boolean(frame));
  const innerW = 1000;
  const innerH = innerW * metrics.usableHeightCm / metrics.usableWidthCm;
  const widths = line ? widthsFor(line.id, selection.thicknesses) : [];
  const frameWidths = frame ? frameWidthsFor(frame.id, selection.thicknesses) : [];
  const maxStroke = widths.length ? Math.max(...widths) : 1;
  const unitScale = innerW / metrics.usableWidthCm;
  // Keep every stroke fully inside the SVG viewport, even at the thickest
  // supported setting, so square caps meet cleanly without clipped edges.
  const edgeInset = maxStroke / 2 + 0.5;
  const offsets = line ? line.pattern === "double"
    ? [edgeInset, edgeInset + Math.min(0.28, metrics.gapCm * 0.42) * unitScale]
    : line.pattern === "triple"
      ? [edgeInset, edgeInset + Math.min(0.28, metrics.gapCm * 0.42) * unitScale, edgeInset + Math.min(0.56, metrics.gapCm * 0.84) * unitScale]
      : [edgeInset]
    : [];
  const frameLineSpec = frame?.id === "selected-frame-18"
    ? [{ insetCm: metrics.frameArtInsetCm, widthMm: frameWidths[0] }, { insetCm: metrics.frameArtInsetCm + 0.17, widthMm: frameWidths[1] }]
    : frame
      ? [{ insetCm: metrics.frameArtInsetCm, widthMm: frameWidths[0] }, { insetCm: metrics.frameArtInsetCm + 0.15, widthMm: frameWidths[1] }]
      : [];
  return <svg className={`neatline-artwork ${className}`} viewBox={`0 0 ${innerW} ${innerH}`} preserveAspectRatio="none" aria-hidden="true">
    {frameLineSpec.map((spec, index) => {
      const inset = spec.insetCm * unitScale;
      const stroke = (spec.widthMm / 10) * unitScale;
      return <rect
        key={`frame-line-${index}`}
        data-full-frame="true"
        x={inset + stroke / 2}
        y={inset + stroke / 2}
        width={innerW - 2 * inset - stroke}
        height={innerH - 2 * inset - stroke}
        fill="none"
        stroke={frame?.accent ?? "#303238"}
        strokeWidth={stroke}
        strokeLinejoin="miter"
      />;
    })}
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
      return <g key={`line-${index}`} fill="none" strokeWidth={widths[index] ?? maxStroke}
        strokeLinecap="square" strokeLinejoin="miter" shapeRendering="geometricPrecision">
        {edgePaths.map(({ edge, d }) => <path key={edge} d={d} data-edge={edge}
          stroke={selection.lineVariant === "colorful" ? LINE_COLORS[edge] : "#354b62"} />)}
      </g>;
    })}
  </svg>;
}

function NeatlineSwatch({ style, selection }: { style: BorderStyle; selection: NeatlineSelection }) {
  if (style.kind === "frame") return <span className="neatline-swatch" aria-hidden="true">
    {style.thumbnail ? <img src={style.thumbnail} alt="" loading="lazy" /> : null}
  </span>;
  if (style.id === "none") return <span className="neatline-swatch neatline-empty" aria-hidden="true">
    <span className="neatline-no-border-map" />
  </span>;
  const line = style.id === "none" ? undefined : style;
  const widths = line ? widthsFor(line.id, selection.thicknesses) : [];
  const inset = 13;
  return <span className="neatline-swatch" aria-hidden="true"><svg className="neatline-artwork neatline-swatch-artwork" viewBox="0 0 120 90" preserveAspectRatio="none">
    {widths.map((width, index) => {
      const offset = index * 8;
      const start = inset + offset;
      const end = 110 - offset;
      const paths = [
        { edge: "top" as const, d: `M ${start} ${start} H ${end}` },
        { edge: "right" as const, d: `M ${end} ${start} V ${end}` },
        { edge: "bottom" as const, d: `M ${end} ${end} H ${start}` },
        { edge: "left" as const, d: `M ${start} ${end} V ${start}` },
      ];
      const strokeWidth = Math.max(1.35, Math.min(2.6, width * 1.4));
      return <g key={index} fill="none" strokeWidth={strokeWidth}
        strokeLinecap="square" strokeLinejoin="miter">
        {paths.map(({ edge, d }) => <path key={edge} d={d}
          stroke={selection.lineVariant === "colorful" ? LINE_COLORS[edge] : "#354b62"} />)}
      </g>;
    })}
  </svg></span>;
}

function lineLabel(index: number, count: number): string {
  if (count === 1) return "Line thickness";
  if (count === 2) return index === 0 ? "Outer line" : "Inner line";
  return ["Outer line", "Middle line", "Inner line"][index];
}

export function NeatlinePicker({ width, height }: { width: string; height: string }) {
  const [selection, setSelection] = useState<NeatlineSelection>(readSelection);
  const [variant, setVariant] = useState<ArtVariant>(() => readSelection().lineVariant);
  const [isEditingThickness, setIsEditingThickness] = useState(false);
  const selectedLine = useMemo(() => lineStyles.find((style) => style.id === selection.lineId), [selection.lineId]);
  const selectedFrame = useMemo(() => frameStyles.find((style) => style.id === selection.frameId), [selection.frameId]);
  const displayedStyles: BorderStyle[] = [
    { id: "none", name: "No border", kind: "line", pattern: "single" },
    ...lineStyles,
    ...frameStyles,
  ];
  const lineWidths = selectedLine ? widthsFor(selectedLine.id, selection.thicknesses) : [];
  const frameWidths = selectedFrame ? frameWidthsFor(selectedFrame.id, selection.thicknesses) : [];
  const layerCount = [selection.lineId !== "none", selection.frameId !== "none"].filter(Boolean).length;

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
        lineId: selection.lineId, cornerId: "none", frameId: selection.frameId,
        cornerPosition: "all", lineVariant: selection.lineVariant,
      }));
      window.localStorage.setItem(THICKNESS_STORAGE_KEY, JSON.stringify(selection.thicknesses));
      window.localStorage.setItem(LEGACY_STYLE_KEY, selection.lineId);
    } catch { /* preserve the active session if storage is unavailable */ }
    window.dispatchEvent(new CustomEvent<NeatlineSelection>(NEATLINE_CHANGE_EVENT, { detail: selection }));
  }, [selection]);

  const selectStyle = (style: BorderStyle) => {
    setSelection((current) => {
      if (style.id === "none") return { ...current, lineId: "none", cornerId: "none", frameId: "none" };
      if (style.kind === "line") return { ...current, lineId: style.id, cornerId: "none", frameId: "none" };
      return { ...current, lineId: "none", cornerId: "none", frameId: style.id };
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
  const updateFrameThickness = (lineIndex: number, value: number) => {
    if (!selectedFrame) return;
    setSelection((current) => {
      const next = frameWidthsFor(selectedFrame.id, current.thicknesses);
      next[lineIndex] = value;
      const safeTotal = (FRAME_LINE_GAP_MM[selectedFrame.id] ?? 1.5) - 0.2;
      if (next.reduce((total, widthMm) => total + widthMm, 0) > safeTotal) {
        next[lineIndex] = Math.max(MIN_FRAME_WIDTH_MM, safeTotal - next[1 - lineIndex]);
      }
      return { ...current, thicknesses: { ...current.thicknesses, [selectedFrame.id]: next } };
    });
  };
  const frameThicknessMax = (lineIndex: number) => selectedFrame
    ? Math.max(MIN_FRAME_WIDTH_MM, (FRAME_LINE_GAP_MM[selectedFrame.id] ?? 1.5) - 0.2 - frameWidths[1 - lineIndex])
    : 2;
  const swatchSelection = (style: BorderStyle): NeatlineSelection => style.kind === "line"
    ? { ...selection, lineId: style.id, cornerId: "none", frameId: "none" }
    : { ...selection, lineId: "none", cornerId: "none", frameId: style.id };
  const isSelected = (style: BorderStyle) => style.kind === "line"
    ? style.id === "none"
      ? selection.lineId === "none" && selection.frameId === "none"
      : style.id === selection.lineId
    : style.id === selection.frameId;

  return <section className="neatline-picker" aria-labelledby="neatline-heading">
    <div className="neatline-picker-heading"><div><h3 id="neatline-heading">Borders</h3>
      <p>Choose no border, a line border, or a full rectangular frame · {width} × {height} cm</p></div>
      <span className="neatline-count">{layerCount} {layerCount === 1 ? "layer" : "layers"}</span></div>
    {selectedLine ? <div className="neatline-variants" role="group" aria-label="Line color style">
      {([["plain", "Plain"], ["colorful", "Colorful"]] as const).map(([id, label]) => <button key={id} type="button"
        className={variant === id ? "is-active" : ""} aria-pressed={variant === id} onClick={() => {
          setVariant(id);
          setSelection((current) => ({ ...current, lineVariant: id }));
        }}>{label}</button>)}
    </div> : null}
    <div className="neatline-options" role="group" aria-label="Choose a border">
      {displayedStyles.map((style) => <button key={style.id} type="button" data-border-style={style.id} title={style.name} aria-pressed={isSelected(style)}
        className={`neatline-option ${isSelected(style) ? "is-selected" : ""}`} onClick={() => selectStyle(style)}>
        <NeatlineSwatch style={style} selection={swatchSelection(style)} />
        <span className="neatline-option-name">{style.name}</span></button>)}
    </div>
    {selectedLine || selectedFrame ? <div className="neatline-edit-wrap"><button type="button" className="neatline-edit-button" aria-expanded={isEditingThickness}
      onClick={() => setIsEditingThickness((open) => !open)}>{isEditingThickness ? "Close thickness settings" : `Adjust ${selectedFrame ? "frame" : "line"} thickness`}</button>
      {isEditingThickness ? <fieldset className="neatline-adjustments"><legend>{selectedFrame ? "Frame line thickness (mm)" : "Line thickness"}</legend>
        {selectedLine ? lineWidths.map((value, index) => <label className="neatline-adjustment" key={`${selectedLine.id}-${index}`}>
          <span className="neatline-adjustment-label">{lineLabel(index, lineWidths.length)}</span>
          <input type="range" min="0.5" max={MAX_LINE_WIDTH} step="0.1" value={value} onChange={(event) => updateThickness(index, Number(event.target.value))} aria-label={`${lineLabel(index, lineWidths.length)} thickness`} />
          <output>{value.toFixed(1)}</output></label>) : null}
        {selectedFrame ? frameWidths.map((value, index) => {
          const label = index === 0 ? "Outer frame line" : "Inner frame line";
          return <label className="neatline-adjustment" key={`${selectedFrame.id}-${index}`}>
            <span className="neatline-adjustment-label">{label}</span>
            <input type="range" min={MIN_FRAME_WIDTH_MM} max={frameThicknessMax(index)} step="0.05" value={value}
              onChange={(event) => updateFrameThickness(index, Number(event.target.value))} aria-label={`${label} thickness`} />
            <output>{value.toFixed(2)} mm</output></label>;
        }) : null}
        <p className="neatline-adjustments-note">Frame-line sliders are capped to keep the parallel lines separate and prevent overlap.</p></fieldset> : null}</div> : null}
  </section>;
}
