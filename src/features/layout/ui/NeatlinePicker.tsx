import { useEffect, useMemo, useState } from "react";
import "./neatline.css";

const CONFIG_STORAGE_KEY = "maparte_neatline_layers";
const LEGACY_STYLE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
export const NEATLINE_CHANGE_EVENT = "maparte:neatline:change";

type LinePattern = "single" | "double" | "triple" | "dashed" | "dotted" | "double-dotted";
type LineStyle = { id: string; name: string; kind: "line"; pattern: LinePattern };
type ArtStyle = { id: string; name: string; kind: "corner"; asset: string; variant?: "plain" };
type BorderStyle = LineStyle | ArtStyle;
type ArtVariant = "plain" | "colorful";
export type CornerPosition = "all" | "top" | "bottom" | "left" | "right" | "diagonal-a" | "diagonal-b" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type NeatlineSelection = {
  lineId: string;
  cornerId: string;
  cornerPosition: CornerPosition;
  thicknesses: Record<string, number[]>;
  lineVariant: ArtVariant;
  cornerVariant: "plain";
};

const lineStyles: LineStyle[] = [
  { id: "neatline-single", name: "Single line", kind: "line", pattern: "single" },
  { id: "neatline-double", name: "Double line", kind: "line", pattern: "double" },
  { id: "neatline-triple", name: "Triple line", kind: "line", pattern: "triple" },
  { id: "neatline-dashed", name: "Dashed line", kind: "line", pattern: "dashed" },
  { id: "neatline-dotted", name: "Dotted line", kind: "line", pattern: "dotted" },
  { id: "neatline-double-dotted", name: "Double dotted", kind: "line", pattern: "double-dotted" },
];
const cornerStyles: ArtStyle[] = Array.from({ length: 12 }, (_, i) => ({
  id: `border-corner-${String(i + 1).padStart(2, "0")}`,
  name: `Corner ${i + 1}`,
  kind: "corner" as const,
  asset: `/assets/borders/corner-${String(i + 1).padStart(2, "0")}.svg`,
  variant: "plain" as const,
}));
export const NEATLINE_STYLES = lineStyles;
const DEFAULT_LINE_WIDTHS: Record<LinePattern, number[]> = {
  single: [2], double: [1.9, 1.5], triple: [1.8, 1.45, 1.1], dashed: [2],
  dotted: [2.8], "double-dotted": [2.5, 2],
};
const MAX_LINE_WIDTH = 5;
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
const MAP_INSET_MAX_CM = 1.55;
const MAP_ART_GAP_CM = 0.22;

/** Shared physical measurements for the white mat, map opening and border art. */
export function getPosterBorderMetrics(widthValue?: string, heightValue?: string) {
  const width = Number(widthValue) > 0 ? Number(widthValue) : 21;
  const height = Number(heightValue) > 0 ? Number(heightValue) : 29.7;
  const shortSide = Math.min(width, height);
  const outerMatCm = Math.min(OUTER_MAT_MAX_CM, shortSide * 0.02);
  const mapInsetCm = Math.min(MAP_INSET_MAX_CM, shortSide * 0.074);
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
function isCornerId(value: string): boolean { return value === "none" || cornerStyles.some((style) => style.id === value); }

function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number[]> : {};
  } catch { return {}; }
}
function readSelection(): NeatlineSelection {
  const empty: NeatlineSelection = { lineId: "none", cornerId: "none", cornerPosition: "all", thicknesses: readThicknesses(), lineVariant: "plain", cornerVariant: "plain" };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NeatlineSelection>;
      return {
        ...empty,
        lineId: parsed.lineId && isLineId(parsed.lineId) ? parsed.lineId : "none",
        cornerId: parsed.cornerId && isCornerId(parsed.cornerId) ? parsed.cornerId : "none",
        cornerPosition: parsed.cornerPosition && CORNER_POSITIONS.includes(parsed.cornerPosition) ? parsed.cornerPosition : "all",
        lineVariant: parsed.lineVariant === "colorful" ? "colorful" : "plain",
        cornerVariant: "plain",
        thicknesses: readThicknesses(),
      };
    }
    // Migrate a single old style into its matching layer without losing it.
    const legacy = window.localStorage.getItem(LEGACY_STYLE_KEY) || "none";
    if (isLineId(legacy)) empty.lineId = legacy;
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
  const corner = cornerStyles.find((style) => style.id === selection.cornerId);
  if (!line && !corner) return null;

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
  const extraLineCount = Math.max(0, (line ? lineCount(line.pattern) : 1) - 1);
  // Anchor the innermost stroke to the map's printable gap. Place the other
  // strokes outward from it, leaving a useful outer ring for corner artwork.
  const lineSeparation = extraLineCount
    ? Math.min(0.28 * unitScale, Math.max(0, (lastLineLimit - requestedPad) / extraLineCount))
    : 0;
  const pad = line
    ? Math.max(requestedPad, lastLineLimit - lineSeparation * extraLineCount)
    : Math.min(lastLineLimit, Math.max(requestedPad, maxStroke / 2 + 2));
  const artPad = Math.min(lastLineLimit, Math.max(requestedPad, maxStroke / 2 + 2));
  const safeArtDepth = Math.max(0, lastLineLimit - artPad);
  const widths = line ? widthsFor(line.id, selection.thicknesses) : [];
  const offsets = line ? line.pattern === "double" || line.pattern === "double-dotted"
    ? [pad, pad + lineSeparation] : line.pattern === "triple" ? [pad, pad + lineSeparation, pad + lineSeparation * 2] : [pad] : [];
  const dotted = line?.pattern === "dotted" || line?.pattern === "double-dotted";
  const dash = line?.pattern === "dashed" ? "12 8" : dotted ? "0.1 12" : undefined;
  const selectedCorners = corner ? activeCorners(selection.cornerPosition) : [];
  // Use most of the printable ring so corner details remain legible at poster size.
  // Keep the size bounded by the map gap to prevent artwork from touching the map.
  const cornerSize = Math.min(safeArtDepth, innerW * 0.2, innerH * 0.2);
  const cornerGeometry: Record<CornerName, { x: number; y: number; rotate: number }> = {
    // Corner artwork occupies the outer ring and ends at the inner line grid.
    "top-left": { x: artPad, y: artPad, rotate: 270 }, "top-right": { x: innerW - artPad - cornerSize, y: artPad, rotate: 0 },
    "bottom-right": { x: innerW - artPad - cornerSize, y: innerH - artPad - cornerSize, rotate: 90 },
    "bottom-left": { x: artPad, y: innerH - artPad - cornerSize, rotate: 180 },
  };
  const cornerJoin = artPad + cornerSize;

  return <svg className={`neatline-artwork ${className}`} viewBox={`0 0 ${innerW} ${innerH}`} preserveAspectRatio="none" aria-hidden="true">
    {offsets.map((offset, index) => {
      const segments: Array<{ coords: [number, number, number, number]; edge: "top" | "right" | "bottom" | "left" }> = [];
      // The corner tile's inner edge is the join point. Ending every selected
      // stroke on that same grid keeps the corner motif attached without
      // letting any decoration cross the map's white breathing gap.
      const topStart = selectedCorners.includes("top-left") ? cornerJoin : pad;
      const topEnd = innerW - (selectedCorners.includes("top-right") ? cornerJoin : pad);
      const bottomStart = selectedCorners.includes("bottom-left") ? cornerJoin : pad;
      const bottomEnd = innerW - (selectedCorners.includes("bottom-right") ? cornerJoin : pad);
      const leftStart = selectedCorners.includes("top-left") ? cornerJoin : pad;
      const leftEnd = innerH - (selectedCorners.includes("bottom-left") ? cornerJoin : pad);
      const rightStart = selectedCorners.includes("top-right") ? cornerJoin : pad;
      const rightEnd = innerH - (selectedCorners.includes("bottom-right") ? cornerJoin : pad);
      const addHorizontal = (edge: "top" | "bottom", start: number, end: number, y: number) => {
        if (end <= start) return;
        segments.push({ coords: [start, y, end, y], edge });
      };
      const addVertical = (edge: "left" | "right", start: number, end: number, x: number) => {
        if (end <= start) return;
        segments.push({ coords: [x, start, x, end], edge });
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
    {corner && selectedCorners.map((position) => {
      const item = cornerGeometry[position];
      return <image key={position} href={corner.asset} x={item.x} y={item.y} width={cornerSize} height={cornerSize}
        transform={`rotate(${item.rotate} ${item.x + cornerSize / 2} ${item.y + cornerSize / 2})`} preserveAspectRatio="none" />;
    })}
  </svg>;
}

function NeatlineSwatch({ style, selection }: { style: BorderStyle; selection: NeatlineSelection }) {
  const isLine = style.kind === "line";
  const line = isLine
    ? (style.id === "none" ? undefined : style)
    : lineStyles.find((item) => item.id === selection.lineId) || lineStyles[0];
  const corner = style.kind === "corner" ? style : undefined;
  const widths = line ? widthsFor(line.id, selection.thicknesses) : [];
  const inset = 13;
  const cornerSize = 72;
  // Corner swatches preview only the selected corner asset. The live poster
  // still composes it with the user's chosen line layer.
  const renderCornerLines = isLine && !!line;

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
      {corner ? <image href={corner.asset} x="35" y="4" width={cornerSize} height={cornerSize}
        preserveAspectRatio="none" /> : null}
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
  const [category, setCategory] = useState<"line" | "corner">("line");
  const [variant, setVariant] = useState<ArtVariant>(() => readSelection().lineVariant);
  const [isEditingThickness, setIsEditingThickness] = useState(false);
  const selectedLine = useMemo(() => lineStyles.find((style) => style.id === selection.lineId), [selection.lineId]);
  const activeCategoryStyles: BorderStyle[] = category === "line" ? lineStyles : cornerStyles;
  const displayedStyles: BorderStyle[] = category === "line"
    ? [{ id: "none", name: "No line", kind: "line", pattern: "single" }, ...activeCategoryStyles]
    : [{ id: "none-corner", name: "No corner art", kind: "corner", asset: "" }, ...activeCategoryStyles];
  const lineWidths = selectedLine ? widthsFor(selectedLine.id, selection.thicknesses) : [];
  const layerCount = [selection.lineId !== "none", selection.cornerId !== "none"].filter(Boolean).length;

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
        lineId: selection.lineId, cornerId: selection.cornerId,
        cornerPosition: selection.cornerPosition,
        lineVariant: selection.lineVariant,
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
      if (style.id === "none-corner") return { ...current, cornerId: "none" };
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
    if (style.id === "none-corner") return { ...selection, cornerId: "none" };
    return { ...selection, lineId: selection.lineId === "none" ? "neatline-single" : selection.lineId, cornerId: style.id,
      cornerVariant: "plain" };
  };
  const isSelected = (style: BorderStyle) => style.id === "none" ? selection.lineId === "none"
    : style.id === "none-corner" ? selection.cornerId === "none"
      : style.kind === "line" ? style.id === selection.lineId : style.id === selection.cornerId;

  return <section className="neatline-picker" aria-labelledby="neatline-heading">
    <div className="neatline-picker-heading"><div><h3 id="neatline-heading">Border styles</h3>
      <p>Choose a line and optional corner details. Both stay outside the map edge with a white gap · {width} × {height} cm</p></div>
      <span className="neatline-count">{layerCount} {layerCount === 1 ? "layer" : "layers"}</span></div>
    <div className="neatline-tabs" role="tablist" aria-label="Border layer">
      {([["line", "Line border"], ["corner", "Corner design"]] as const).map(([id, label]) =>
        <button type="button" role="tab" aria-selected={category === id} className={category === id ? "is-active" : ""} key={id} onClick={() => {
          setCategory(id);
          if (id === "line") setVariant(selection.lineVariant);
          if (id === "corner") setVariant("plain");
        }}>{label}</button>)}
    </div>
    {category === "line" ? <div className="neatline-variants" role="group" aria-label="Line color style">
      {([["plain", "Plain"], ["colorful", "Colorful"]] as const).map(([id, label]) => <button key={id} type="button"
        className={variant === id ? "is-active" : ""} aria-pressed={variant === id} onClick={() => {
          setVariant(id);
          setSelection((current) => ({ ...current, lineVariant: id }));
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
