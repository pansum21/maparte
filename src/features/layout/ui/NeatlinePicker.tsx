import { useEffect, useMemo, useState } from "react";
import "./neatline.css";

const CONFIG_STORAGE_KEY = "maparte_neatline_layers";
const LEGACY_STYLE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
export const NEATLINE_CHANGE_EVENT = "maparte:neatline:change";

type LinePattern = "single" | "double" | "triple" | "dashed" | "dotted" | "double-dotted";
type LineStyle = { id: string; name: string; kind: "line"; pattern: LinePattern };
type ArtStyle = { id: string; name: string; kind: "ornament" | "corner"; asset: string };
type BorderStyle = LineStyle | ArtStyle;
export type CornerPosition = "all" | "top" | "bottom" | "left" | "right" | "diagonal-a" | "diagonal-b" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type OrnamentPosition = "top" | "bottom" | "both";
export type NeatlineSelection = {
  lineId: string;
  ornamentId: string;
  cornerId: string;
  cornerPosition: CornerPosition;
  ornamentPosition: OrnamentPosition;
  thicknesses: Record<string, number[]>;
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
    asset: `/assets/borders/flourish-${String(i + 1).padStart(2, "0")}.png`,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `border-geometric-${String(i + 1).padStart(2, "0")}`,
    name: `Geometric ${i + 1}`,
    kind: "ornament" as const,
    asset: `/assets/borders/geometric-${String(i + 1).padStart(2, "0")}.png`,
  })),
];
const cornerStyles: ArtStyle[] = Array.from({ length: 12 }, (_, i) => ({
  id: `border-corner-${String(i + 1).padStart(2, "0")}`,
  name: `Corner ${i + 1}`,
  kind: "corner" as const,
  asset: `/assets/borders/corner-${String(i + 1).padStart(2, "0")}.png`,
}));
const allStyles: BorderStyle[] = [...lineStyles, ...decorativeStyles, ...cornerStyles];
export const NEATLINE_STYLES = lineStyles;
const DEFAULT_LINE_WIDTHS = [1.15, 0.9, 0.7];
const MAX_LINE_WIDTH = 5;
const ORNAMENT_POSITIONS: OrnamentPosition[] = ["top", "bottom", "both"];
const ORNAMENT_LABELS: Record<OrnamentPosition, string> = { top: "Top center", bottom: "Bottom center", both: "Top + bottom" };
const CORNER_POSITIONS: CornerPosition[] = ["all", "top", "bottom", "left", "right", "diagonal-a", "diagonal-b", "top-left", "top-right", "bottom-left", "bottom-right"];
const CORNER_LABELS: Record<CornerPosition, string> = {
  all: "All four corners", top: "Top pair", bottom: "Bottom pair", left: "Left pair", right: "Right pair",
  "diagonal-a": "Top left + bottom right", "diagonal-b": "Top right + bottom left",
  "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right",
};
const CORNER_NAMES = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;
type CornerName = typeof CORNER_NAMES[number];

function lineCount(pattern: LinePattern): number {
  if (pattern === "double" || pattern === "double-dotted") return 2;
  if (pattern === "triple") return 3;
  return 1;
}
function isLineId(value: string): boolean { return value === "none" || lineStyles.some((style) => style.id === value); }
function isOrnamentId(value: string): boolean { return value === "none" || decorativeStyles.some((style) => style.id === value); }
function isCornerId(value: string): boolean { return value === "none" || cornerStyles.some((style) => style.id === value); }

function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number[]> : {};
  } catch { return {}; }
}
function readSelection(): NeatlineSelection {
  const empty: NeatlineSelection = { lineId: "none", ornamentId: "none", cornerId: "none", cornerPosition: "all", ornamentPosition: "top", thicknesses: readThicknesses() };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NeatlineSelection>;
      return {
        ...empty,
        ...parsed,
        lineId: parsed.lineId && isLineId(parsed.lineId) ? parsed.lineId : "none",
        ornamentId: parsed.ornamentId && isOrnamentId(parsed.ornamentId) ? parsed.ornamentId : "none",
        cornerId: parsed.cornerId && isCornerId(parsed.cornerId) ? parsed.cornerId : "none",
        cornerPosition: parsed.cornerPosition && CORNER_POSITIONS.includes(parsed.cornerPosition) ? parsed.cornerPosition : "all",
        ornamentPosition: parsed.ornamentPosition && ORNAMENT_POSITIONS.includes(parsed.ornamentPosition) ? parsed.ornamentPosition : "top",
        thicknesses: readThicknesses(),
      };
    }
    // Migrate a single old style into its matching layer without losing it.
    const legacy = window.localStorage.getItem(LEGACY_STYLE_KEY) || "none";
    if (isLineId(legacy)) empty.lineId = legacy;
    else if (isOrnamentId(legacy)) empty.ornamentId = legacy;
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
    return Number.isFinite(value) ? Math.min(MAX_LINE_WIDTH, Math.max(0.5, value)) : DEFAULT_LINE_WIDTHS[index];
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
  const corner = cornerStyles.find((style) => style.id === selection.cornerId);
  if (!line && !ornament && !corner) return null;

  const innerW = 1000;
  const aspect = Number(widthCm) > 0 && Number(heightCm) > 0 ? Number(heightCm) / Number(widthCm) : 1;
  const innerH = innerW * aspect;
  const maxStroke = line ? Math.max(...widthsFor(line.id, selection.thicknesses)) : 1.15;
  const pad = Math.max(20, maxStroke / 2 + 2);
  const widths = line ? widthsFor(line.id, selection.thicknesses) : [];
  const offsets = line ? line.pattern === "double" || line.pattern === "double-dotted"
    ? [pad, pad + 14] : line.pattern === "triple" ? [pad, pad + 14, pad + 28] : [pad] : [];
  const dotted = line?.pattern === "dotted" || line?.pattern === "double-dotted";
  const dash = line?.pattern === "dashed" ? "12 8" : dotted ? "1 8" : undefined;
  const selectedCorners = corner ? activeCorners(selection.cornerPosition) : [];
  const cornerSize = Math.min(innerW, innerH) * 0.105;
  const ornamentSize = Math.min(innerW * 0.25, innerH * 0.16);
  const ornamentHeight = Math.max(44, ornamentSize * 0.24);
  const ornamentEdges = ornament
    ? selection.ornamentPosition === "both" ? ["top", "bottom"] : [selection.ornamentPosition]
    : [];
  const cornerGeometry: Record<CornerName, { x: number; y: number; rotate: number }> = {
    "top-left": { x: pad, y: pad, rotate: 0 }, "top-right": { x: innerW - pad - cornerSize, y: pad, rotate: 90 },
    "bottom-right": { x: innerW - pad - cornerSize, y: innerH - pad - cornerSize, rotate: 180 },
    "bottom-left": { x: pad, y: innerH - pad - cornerSize, rotate: 270 },
  };
  const horizontalGap = ornamentSize + 24;

  return <svg className={`neatline-artwork ${className}`} viewBox={`0 0 ${innerW} ${innerH}`} preserveAspectRatio="none" aria-hidden="true">
    {offsets.map((offset, index) => {
      const segments: Array<[number, number, number, number]> = [];
      const topStart = offset + (selectedCorners.includes("top-left") ? cornerSize : 0);
      const topEnd = innerW - offset - (selectedCorners.includes("top-right") ? cornerSize : 0);
      const bottomStart = offset + (selectedCorners.includes("bottom-left") ? cornerSize : 0);
      const bottomEnd = innerW - offset - (selectedCorners.includes("bottom-right") ? cornerSize : 0);
      const leftStart = offset + (selectedCorners.includes("top-left") ? cornerSize : 0);
      const leftEnd = innerH - offset - (selectedCorners.includes("bottom-left") ? cornerSize : 0);
      const rightStart = offset + (selectedCorners.includes("top-right") ? cornerSize : 0);
      const rightEnd = innerH - offset - (selectedCorners.includes("bottom-right") ? cornerSize : 0);
      const addHorizontal = (edge: "top" | "bottom", start: number, end: number, y: number) => {
        if (end <= start) return;
        if (!ornamentEdges.includes(edge)) { segments.push([start, y, end, y]); return; }
        const gapStart = (innerW - horizontalGap) / 2;
        const gapEnd = (innerW + horizontalGap) / 2;
        if (gapStart > start) segments.push([start, y, Math.min(end, gapStart), y]);
        if (end > gapEnd) segments.push([Math.max(start, gapEnd), y, end, y]);
      };
      addHorizontal("top", topStart, topEnd, offset);
      addHorizontal("bottom", bottomStart, bottomEnd, innerH - offset);
      if (leftEnd > leftStart) segments.push([offset, leftStart, offset, leftEnd]);
      if (rightEnd > rightStart) segments.push([innerW - offset, rightStart, innerW - offset, rightEnd]);
      const lineIsDotted = line?.pattern === "dotted" || line?.pattern === "double-dotted";
      return <g key={`line-${offset}`} fill="none" stroke="#354b62" strokeWidth={widths[index] ?? 1.15}
        strokeDasharray={dash} strokeLinecap={lineIsDotted ? "round" : "butt"} shapeRendering="geometricPrecision">
        {segments.map(([x1, y1, x2, y2], segmentIndex) => <line key={segmentIndex} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>;
    })}
    {ornament && ornamentEdges.map((edge) => {
      const y = edge === "top" ? pad - ornamentHeight * 0.3 : innerH - pad - ornamentHeight * 0.7;
      const isBottom = edge === "bottom";
      return <image key={edge} href={ornament.asset} x={(innerW - ornamentSize) / 2} y={y} width={ornamentSize} height={ornamentHeight}
        transform={isBottom ? `rotate(180 500 ${y + ornamentHeight / 2})` : undefined} preserveAspectRatio="xMidYMid meet" />;
    })}
    {corner && selectedCorners.map((position) => {
      const item = cornerGeometry[position];
      return <image key={position} href={corner.asset} x={item.x} y={item.y} width={cornerSize} height={cornerSize}
        transform={`rotate(${item.rotate} ${item.x + cornerSize / 2} ${item.y + cornerSize / 2})`} preserveAspectRatio="none" />;
    })}
  </svg>;
}

function lineLabel(index: number, count: number): string {
  if (count === 1) return "Line thickness";
  if (count === 2) return index === 0 ? "Outer line" : "Inner line";
  return ["Outer line", "Middle line", "Inner line"][index];
}

export function NeatlinePicker({ width, height }: { width: string; height: string }) {
  const [selection, setSelection] = useState<NeatlineSelection>(readSelection);
  const [category, setCategory] = useState<"line" | "ornament" | "corner">("line");
  const [isEditingThickness, setIsEditingThickness] = useState(false);
  const selectedLine = useMemo(() => lineStyles.find((style) => style.id === selection.lineId), [selection.lineId]);
  const activeCategoryStyles = category === "line" ? lineStyles : category === "ornament" ? decorativeStyles : cornerStyles;
  const displayedStyles: BorderStyle[] = category === "line" ? [{ id: "none", name: "No line", kind: "line", pattern: "single" }, ...activeCategoryStyles] : activeCategoryStyles;
  const lineWidths = selectedLine ? widthsFor(selectedLine.id, selection.thicknesses) : [];

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
        lineId: selection.lineId, ornamentId: selection.ornamentId, cornerId: selection.cornerId,
        cornerPosition: selection.cornerPosition, ornamentPosition: selection.ornamentPosition,
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
    return { ...selection, lineId: selection.lineId === "none" ? "neatline-single" : selection.lineId, cornerId: style.id };
  };
  const isSelected = (style: BorderStyle) => style.id === "none" ? selection.lineId === "none"
    : style.kind === "line" ? style.id === selection.lineId
      : style.kind === "ornament" ? style.id === selection.ornamentId : style.id === selection.cornerId;

  return <section className="neatline-picker" aria-labelledby="neatline-heading">
    <div className="neatline-picker-heading"><div><h3 id="neatline-heading">Border styles</h3>
      <p>लेयर जोड़ें: बेस लाइन + सेंटर डिज़ाइन + कॉर्नर · मैप से बाहर सफेद गैप के साथ · {width} × {height} cm</p></div>
      <span className="neatline-count">{[selection.lineId !== "none", selection.ornamentId !== "none", selection.cornerId !== "none"].filter(Boolean).length} layers</span></div>
    <div className="neatline-tabs" role="tablist" aria-label="Border layer">
      {([["line", "Base line"], ["ornament", "Center design"], ["corner", "Corner art"]] as const).map(([id, label]) =>
        <button type="button" role="tab" aria-selected={category === id} className={category === id ? "is-active" : ""} key={id} onClick={() => setCategory(id)}>{label}</button>)}
    </div>
    <div className="neatline-options" role="group" aria-label={`Choose ${category} border layer`}>
      {category === "ornament" ? <button type="button" aria-pressed={selection.ornamentId === "none"}
        className={`neatline-option ${selection.ornamentId === "none" ? "is-selected" : ""}`}
        onClick={() => setSelection((current) => ({ ...current, ornamentId: "none" }))}>
        <span className="neatline-swatch neatline-empty" aria-hidden="true"><span /></span><span className="neatline-option-name">No center design</span></button> : null}
      {category === "corner" ? <button type="button" aria-pressed={selection.cornerId === "none"}
        className={`neatline-option ${selection.cornerId === "none" ? "is-selected" : ""}`}
        onClick={() => setSelection((current) => ({ ...current, cornerId: "none" }))}>
        <span className="neatline-swatch neatline-empty" aria-hidden="true"><span /></span><span className="neatline-option-name">No corner art</span></button> : null}
      {displayedStyles.map((style) => <button key={`${category}-${style.id}`} type="button" title={style.name} aria-pressed={isSelected(style)}
        className={`neatline-option ${isSelected(style) ? "is-selected" : ""}`} onClick={() => selectStyle(style)}>
        <span className="neatline-swatch" aria-hidden="true"><NeatlineArtwork selection={swatchSelection(style)} widthCm={width} heightCm={height} /></span>
        <span className="neatline-option-name">{style.name}</span></button>)}
    </div>
    {category === "ornament" && selection.ornamentId !== "none" ? <label className="neatline-layer-position">Design position
      <select value={selection.ornamentPosition} onChange={(event) => setSelection((current) => ({ ...current, ornamentPosition: event.target.value as OrnamentPosition }))}>
        {ORNAMENT_POSITIONS.map((position) => <option key={position} value={position}>{ORNAMENT_LABELS[position]}</option>)}
      </select></label> : null}
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
