import { useEffect, useMemo, useState } from "react";
import "./neatline.css";

const CONFIG_STORAGE_KEY = "maparte_neatline_layers";
const LEGACY_STYLE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
export const NEATLINE_CHANGE_EVENT = "maparte:neatline:change";

type LinePattern = "single" | "double" | "triple" | "dashed" | "dotted" | "double-dotted";
type LineStyle = { id: string; name: string; kind: "line"; pattern: LinePattern };
type ArtStyle = { id: string; name: string; kind: "ornament" | "corner"; asset: string; variant?: "plain" | "colorful" };
type BorderStyle = LineStyle | ArtStyle;
type ArtVariant = "plain" | "colorful";
export type CornerPosition = "all" | "top" | "bottom" | "left" | "right" | "diagonal-a" | "diagonal-b" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type OrnamentPosition = "top" | "bottom" | "both" | "all-sides";
export type NeatlineSelection = {
  lineId: string;
  ornamentId: string;
  cornerId: string;
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
const colorfulCornerStyles: ArtStyle[] = Array.from({ length: 8 }, (_, i) => ({
  id: `border-color-corner-${String(i + 1).padStart(2, "0")}`,
  name: ["Mughal vine", "Lotus garden", "Peacock leaf", "Marigold", "Royal paisley", "Art deco jewel", "Wildflower", "Heritage scroll"][i],
  kind: "corner" as const,
  asset: `/assets/borders/color-corner-${String(i + 1).padStart(2, "0")}.svg`,
  variant: "colorful" as const,
}));
const allStyles: BorderStyle[] = [...lineStyles, ...decorativeStyles, ...cornerStyles, ...colorfulCornerStyles];
export const NEATLINE_STYLES = lineStyles;
const DEFAULT_LINE_WIDTHS: Record<LinePattern, number[]> = {
  single: [1.15], double: [1.05, 0.85], triple: [1, 0.8, 0.65], dashed: [1.15],
  dotted: [2.2], "double-dotted": [1.9, 1.55],
};
const MAX_LINE_WIDTH = 5;
const ORNAMENT_POSITIONS: OrnamentPosition[] = ["top", "bottom", "both", "all-sides"];
const ORNAMENT_LABELS: Record<OrnamentPosition, string> = {
  top: "Top center", bottom: "Bottom center", both: "Top + bottom", "all-sides": "All four sides",
};
const CORNER_POSITIONS: CornerPosition[] = ["all", "top", "bottom", "left", "right", "diagonal-a", "diagonal-b", "top-left", "top-right", "bottom-left", "bottom-right"];
const CORNER_LABELS: Record<CornerPosition, string> = {
  all: "All four corners", top: "Top pair", bottom: "Bottom pair", left: "Left pair", right: "Right pair",
  "diagonal-a": "Top left + bottom right", "diagonal-b": "Top right + bottom left",
  "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right",
};
const CORNER_NAMES = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;
const LINE_COLORS = ["#b44737", "#276b62", "#bd8735"];
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

function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number[]> : {};
  } catch { return {}; }
}
function readSelection(): NeatlineSelection {
  const empty: NeatlineSelection = { lineId: "none", ornamentId: "none", cornerId: "none", cornerPosition: "all", ornamentPosition: "top", thicknesses: readThicknesses(), lineVariant: "plain", cornerVariant: "plain" };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NeatlineSelection>;
      return {
        ...empty,
        ...parsed,
        lineId: parsed.lineId && isLineId(parsed.lineId) ? parsed.lineId : "none",
        // Older stored center ornaments were raster traces and looked soft at zoom.
        // Clear them instead of silently bringing the blurry artwork back.
        ornamentId: "none",
        cornerId: parsed.cornerId && isCornerId(parsed.cornerId) ? parsed.cornerId : "none",
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
  if (!line && !ornament && !corner) return null;

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
    {offsets.map((offset, index) => {
      const segments: Array<[number, number, number, number]> = [];
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
        if (!ornamentEdges.includes(edge)) { segments.push([start, y, end, y]); return; }
        const gapStart = (innerW - horizontalGap) / 2;
        const gapEnd = (innerW + horizontalGap) / 2;
        if (gapStart > start) segments.push([start, y, Math.min(end, gapStart), y]);
        if (end > gapEnd) segments.push([Math.max(start, gapEnd), y, end, y]);
      };
      const addVertical = (edge: "left" | "right", start: number, end: number, x: number) => {
        if (end <= start) return;
        if (!ornamentEdges.includes(edge)) { segments.push([x, start, x, end]); return; }
        const gapStart = (innerH - verticalGap) / 2;
        const gapEnd = (innerH + verticalGap) / 2;
        if (gapStart > start) segments.push([x, start, x, Math.min(end, gapStart)]);
        if (end > gapEnd) segments.push([x, Math.max(start, gapEnd), x, end]);
      };
      addHorizontal("top", topStart, topEnd, offset);
      addHorizontal("bottom", bottomStart, bottomEnd, innerH - offset);
      addVertical("left", leftStart, leftEnd, offset);
      addVertical("right", rightStart, rightEnd, innerW - offset);
      return <g key={`line-${offset}`} fill="none" strokeWidth={widths[index] ?? 1.15}
        strokeDasharray={dash} strokeLinecap={dotted ? "round" : "butt"} shapeRendering="geometricPrecision">
        {segments.map(([x1, y1, x2, y2], segmentIndex) => <line key={segmentIndex} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={selection.lineVariant === "colorful" ? LINE_COLORS[segmentIndex % LINE_COLORS.length] : "#354b62"} />)}
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
  const line = isLine
    ? (style.id === "none" ? undefined : style)
    : lineStyles.find((item) => item.id === selection.lineId) || lineStyles[0];
  const ornament = isOrnament ? style : undefined;
  const corner = style.kind === "corner" ? style : undefined;
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
        const path = `M ${start} ${end} V ${start} H ${end}`;
        const isDotted = line?.pattern === "dotted" || line?.pattern === "double-dotted";
        const dash = line?.pattern === "dashed" ? "7 4" : isDotted ? "0.1 6" : undefined;
        const strokeWidth = Math.max(1.35, Math.min(2.6, width * 1.4));
        return <path key={index} d={path} fill="none" stroke={selection.lineVariant === "colorful" ? LINE_COLORS[index % LINE_COLORS.length] : "#354b62"} strokeWidth={strokeWidth}
          strokeDasharray={dash} strokeLinecap={isDotted ? "round" : "butt"} strokeLinejoin="miter" />;
      }) : null}
      {ornament ? <>
        <path d="M 13 22 H 16 M 104 22 H 107" fill="none" stroke="#354b62" strokeWidth="1.4" />
        <image href={ornament.asset} x="16" y="5" width="88" height="34" preserveAspectRatio="xMidYMid meet" />
      </> : null}
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
  const activeCategoryStyles = category === "line" ? lineStyles : variant === "colorful" ? colorfulCornerStyles : cornerStyles;
  const displayedStyles: BorderStyle[] = category === "line" ? [{ id: "none", name: "No line", kind: "line", pattern: "single" }, ...activeCategoryStyles] : activeCategoryStyles;
  const lineWidths = selectedLine ? widthsFor(selectedLine.id, selection.thicknesses) : [];

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
        lineId: selection.lineId, ornamentId: selection.ornamentId, cornerId: selection.cornerId,
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
      if (style.kind === "ornament") return { ...current, ornamentId: style.id };
      return { ...current, cornerId: style.id };
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
    if (style.kind === "ornament") return { ...selection, lineId: selection.lineId === "none" ? "neatline-single" : selection.lineId, ornamentId: style.id };
    return { ...selection, lineId: selection.lineId === "none" ? "neatline-single" : selection.lineId, cornerId: style.id,
      cornerVariant: style.variant ?? variant };
  };
  const isSelected = (style: BorderStyle) => style.id === "none" ? selection.lineId === "none"
    : style.kind === "line" ? style.id === selection.lineId
      : style.kind === "ornament" ? style.id === selection.ornamentId : style.id === selection.cornerId;

  return <section className="neatline-picker" aria-labelledby="neatline-heading">
    <div className="neatline-picker-heading"><div><h3 id="neatline-heading">Border styles</h3>
      <p>लाइन और कॉर्नर अलग चुनें · Plain या Colorful · मैप से बाहर सफेद गैप के साथ · {width} × {height} cm</p></div>
      <span className="neatline-count">{[selection.lineId !== "none", selection.cornerId !== "none"].filter(Boolean).length} layers</span></div>
    <div className="neatline-tabs" role="tablist" aria-label="Border layer">
      {([["line", "Line border"], ["corner", "Corner design"]] as const).map(([id, label]) =>
        <button type="button" role="tab" aria-selected={category === id} className={category === id ? "is-active" : ""} key={id} onClick={() => {
          setCategory(id);
          setVariant(id === "line" ? selection.lineVariant : selection.cornerVariant);
        }}>{label}</button>)}
    </div>
    <div className="neatline-variants" role="group" aria-label={`${category} color style`}>
      {([["plain", "Plain"], ["colorful", "Colorful"]] as const).map(([id, label]) => <button key={id} type="button"
        className={variant === id ? "is-active" : ""} aria-pressed={variant === id} onClick={() => {
          setVariant(id);
          if (category === "line") setSelection((current) => ({ ...current, lineVariant: id }));
          else setSelection((current) => ({ ...current, cornerVariant: id, cornerId: "none" }));
        }}>{label}</button>)}
    </div>
    <div className="neatline-options" role="group" aria-label={`Choose ${category} border layer`}>
      {category === "corner" ? <button type="button" aria-pressed={selection.cornerId === "none"}
        className={`neatline-option ${selection.cornerId === "none" ? "is-selected" : ""}`}
        onClick={() => setSelection((current) => ({ ...current, cornerId: "none" }))}>
        <span className="neatline-swatch neatline-empty" aria-hidden="true"><span /></span><span className="neatline-option-name">No corner art</span></button> : null}
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
        <p className="neatline-adjustments-note">डिफ़ॉल्ट पतली है; हर लाइन की मोटाई अलग बढ़ा या घटा सकते हैं।</p></fieldset> : null}</div> : null}
  </section>;
}
