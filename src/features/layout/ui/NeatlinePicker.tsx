import { useEffect, useMemo, useState } from "react";
import "./neatline.css";

const STORAGE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
const CORNERS_STORAGE_KEY = "maparte_neatline_corners";
const CHANGE_EVENT = "maparte:neatline:change";

type LinePattern = "single" | "double" | "triple" | "dashed" | "dotted" | "double-dotted";
type BorderStyle = { id: string; name: string; kind: "line"; pattern: LinePattern } |
  { id: string; name: string; kind: "ornament"; asset: string } |
  { id: string; name: string; kind: "corner"; asset: string };

const lineStyles: Extract<BorderStyle, { kind: "line" }>[] = [
  { id: "neatline-single", name: "Single line", kind: "line", pattern: "single" },
  { id: "neatline-double", name: "Double line", kind: "line", pattern: "double" },
  { id: "neatline-triple", name: "Triple line", kind: "line", pattern: "triple" },
  { id: "neatline-dashed", name: "Dashed line", kind: "line", pattern: "dashed" },
  { id: "neatline-dotted", name: "Dotted line", kind: "line", pattern: "dotted" },
  { id: "neatline-double-dotted", name: "Double dotted", kind: "line", pattern: "double-dotted" },
];
const decorativeStyles: BorderStyle[] = [
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
const cornerStyles: BorderStyle[] = Array.from({ length: 12 }, (_, i) => ({
  id: `border-corner-${String(i + 1).padStart(2, "0")}`,
  name: `Corner ${i + 1}`,
  kind: "corner" as const,
  asset: `/assets/borders/corner-${String(i + 1).padStart(2, "0")}.png`,
}));
const allStyles = [...lineStyles, ...decorativeStyles, ...cornerStyles];
export const NEATLINE_STYLES = lineStyles;
const DEFAULT_LINE_WIDTH = 2;
const CORNER_POSITIONS = ["all", "top", "bottom", "diagonal-a", "diagonal-b", "top-left", "top-right", "bottom-left", "bottom-right"] as const;
type CornerPosition = typeof CORNER_POSITIONS[number];
const CORNER_LABELS: Record<CornerPosition, string> = {
  all: "All four", top: "Top pair", bottom: "Bottom pair", "diagonal-a": "Top left + bottom right",
  "diagonal-b": "Top right + bottom left", "top-left": "Top left", "top-right": "Top right",
  "bottom-left": "Bottom left", "bottom-right": "Bottom right",
};
const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;

function lineCount(pattern: LinePattern): number {
  if (pattern === "double" || pattern === "double-dotted") return 2;
  if (pattern === "triple") return 3;
  return 1;
}
function readSelectedStyle(): string {
  if (typeof window === "undefined") return "none";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || "none";
    return stored === "none" || allStyles.some((style) => style.id === stored) ? stored : "none";
  } catch { return "none"; }
}
function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number[]> : {};
  } catch { return {}; }
}
function widthsFor(styleId: string, widthByStyle: Record<string, number[]>): number[] {
  const style = lineStyles.find((item) => item.id === styleId);
  if (!style) return [];
  const saved = widthByStyle[styleId] || [];
  return Array.from({ length: lineCount(style.pattern) }, (_, i) => {
    const value = Number(saved[i]);
    return Number.isFinite(value) ? Math.min(10, Math.max(0.5, value)) : DEFAULT_LINE_WIDTH;
  });
}
function readCorners(): CornerPosition {
  if (typeof window === "undefined") return "all";
  try {
    const value = window.localStorage.getItem(CORNERS_STORAGE_KEY) as CornerPosition | null;
    return value && CORNER_POSITIONS.includes(value) ? value : "all";
  } catch { return "all"; }
}
function activeCorners(position: CornerPosition): string[] {
  switch (position) {
    case "top": return ["top-left", "top-right"];
    case "bottom": return ["bottom-left", "bottom-right"];
    case "diagonal-a": return ["top-left", "bottom-right"];
    case "diagonal-b": return ["top-right", "bottom-left"];
    case "all": return [...CORNERS];
    default: return [position];
  }
}

export function NeatlineArtwork({ styleId, className = "", widthCm, heightCm }: { styleId: string; className?: string; widthCm?: string; heightCm?: string }) {
  const style = allStyles.find((item) => item.id === styleId);
  const [thicknesses, setThicknesses] = useState<Record<string, number[]>>(readThicknesses);
  const [corners, setCorners] = useState<CornerPosition>(readCorners);
  useEffect(() => {
    const sync = () => { setThicknesses(readThicknesses()); setCorners(readCorners()); };
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  if (!style) return null;

  const maxStroke = Math.max(2, ...widthsFor(style.id, thicknesses));
  const pad = Math.max(18, maxStroke / 2 + 2);
  const innerW = 1000;
  const aspect = Number(widthCm) > 0 && Number(heightCm) > 0 ? Number(heightCm) / Number(widthCm) : 1;
  const innerH = innerW * aspect;
  const isDotted = style.kind === "line" && (style.pattern === "dotted" || style.pattern === "double-dotted");
  const dash = style.kind === "line" ? style.pattern === "dashed" ? "13 8" : isDotted ? "1 8" : undefined : undefined;
  const offsets = style.kind === "line" ? style.pattern === "double" || style.pattern === "double-dotted"
    ? [pad, pad + 16] : style.pattern === "triple" ? [pad, pad + 16, pad + 32] : [pad] : [];
  const selectedCorners = activeCorners(corners);
  const cornerSize = 112;
  const ornament = style.kind === "ornament";
  const ornamentSize = 245;
  const positions: Record<string, { x: number; y: number; rotate: number }> = {
    "top-left": { x: 0, y: 0, rotate: 0 }, "top-right": { x: innerW, y: 0, rotate: 90 },
    "bottom-right": { x: innerW, y: innerH, rotate: 180 }, "bottom-left": { x: 0, y: innerH, rotate: 270 },
  };

  return <svg className={`neatline-artwork ${className}`} viewBox={`0 0 ${innerW} ${innerH}`} preserveAspectRatio="none" aria-hidden="true">
    {style.kind === "line" ? offsets.map((offset, index) => <rect key={offset} x={offset} y={offset} width={1000 - offset * 2} height={1000 - offset * 2}
      fill="none" stroke="#354b62" strokeWidth={widthsFor(style.id, thicknesses)[index] ?? DEFAULT_LINE_WIDTH}
      strokeDasharray={dash} strokeLinecap={isDotted ? "round" : "butt"} strokeLinejoin="round" shapeRendering="geometricPrecision" />) : null}
    {ornament ? <>
      <image href={style.asset} x={(innerW - ornamentSize) / 2} y={pad - 25} width={ornamentSize} height={58} preserveAspectRatio="xMidYMid meet" />
      <image href={style.asset} x={(innerW - ornamentSize) / 2} y={innerH - pad - 33} width={ornamentSize} height={58} transform={`rotate(180 500 ${innerH - pad - 4})`} preserveAspectRatio="xMidYMid meet" />
      <image href={style.asset} x={pad - 25} y={(innerH - ornamentSize) / 2} width={58} height={ornamentSize} transform={`rotate(270 ${pad + 4} 500)`} preserveAspectRatio="xMidYMid meet" />
      <image href={style.asset} x={innerW - pad - 33} y={(innerH - ornamentSize) / 2} width={58} height={ornamentSize} transform={`rotate(90 ${innerW - pad - 4} 500)`} preserveAspectRatio="xMidYMid meet" />
    </> : null}
    {style.kind === "corner" ? <>
      {[
        [pad + (selectedCorners.includes("top-left") ? cornerSize : 0), pad, innerW - pad - (selectedCorners.includes("top-right") ? cornerSize : 0), pad],
        [pad + (selectedCorners.includes("bottom-left") ? cornerSize : 0), innerH - pad, innerW - pad - (selectedCorners.includes("bottom-right") ? cornerSize : 0), innerH - pad],
        [pad, pad + (selectedCorners.includes("top-left") ? cornerSize : 0), pad, innerH - pad - (selectedCorners.includes("bottom-left") ? cornerSize : 0)],
        [innerW - pad, pad + (selectedCorners.includes("top-right") ? cornerSize : 0), innerW - pad, innerH - pad - (selectedCorners.includes("bottom-right") ? cornerSize : 0)],
      ].map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#354b62" strokeWidth="2" />)}
      {selectedCorners.map((position) => {
        const { x, y, rotate } = positions[position];
        const xPos = position.includes("right") ? x - cornerSize : x;
        const yPos = position.includes("bottom") ? y - cornerSize : y;
        return <image key={position} href={style.asset} x={xPos} y={yPos} width={cornerSize} height={cornerSize}
          transform={`rotate(${rotate} ${xPos + cornerSize / 2} ${yPos + cornerSize / 2})`} preserveAspectRatio="none" />;
      })}
    </> : null}
  </svg>;
}

function lineLabel(index: number, count: number): string {
  if (count === 1) return "Line thickness";
  if (count === 2) return index === 0 ? "Outer line" : "Inner line";
  return ["Outer line", "Middle line", "Inner line"][index];
}

export function NeatlinePicker({ width, height }: { width: string; height: string }) {
  const [selected, setSelected] = useState(readSelectedStyle);
  const [widthByStyle, setWidthByStyle] = useState(readThicknesses);
  const [cornerPosition, setCornerPosition] = useState(readCorners);
  const [category, setCategory] = useState<"line" | "ornament" | "corner">("line");
  const [isEditingThickness, setIsEditingThickness] = useState(false);
  const selectedStyle = useMemo(() => allStyles.find((style) => style.id === selected), [selected]);
  const selectedWidths = selectedStyle?.kind === "line" ? widthsFor(selected, widthByStyle) : [];
  const categoryStyles = category === "line" ? lineStyles : category === "ornament" ? decorativeStyles : cornerStyles;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, selected);
      window.localStorage.setItem(THICKNESS_STORAGE_KEY, JSON.stringify(widthByStyle));
      window.localStorage.setItem(CORNERS_STORAGE_KEY, cornerPosition);
    } catch { /* keep the current border for this session */ }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: selected }));
  }, [selected, widthByStyle, cornerPosition]);

  const updateThickness = (lineIndex: number, value: number) => {
    if (selectedStyle?.kind !== "line") return;
    setWidthByStyle((current) => {
      const next = widthsFor(selectedStyle.id, current);
      next[lineIndex] = value;
      return { ...current, [selectedStyle.id]: next };
    });
  };

  return <section className="neatline-picker" aria-labelledby="neatline-heading">
    <div className="neatline-picker-heading"><div><h3 id="neatline-heading">Border styles</h3>
      <p>Map से बाहर, बीच में सफेद गैप · {width} × {height} cm लेआउट पर फिट</p></div>
      <span className="neatline-count">{selected === "none" ? "Off" : `${allStyles.length} styles`}</span></div>
    <div className="neatline-tabs" role="tablist" aria-label="Border category">
      {([["line", "Simple lines"], ["ornament", "Decorative lines"], ["corner", "Corner designs"]] as const).map(([id, label]) =>
        <button type="button" role="tab" aria-selected={category === id} className={category === id ? "is-active" : ""} key={id} onClick={() => setCategory(id)}>{label}</button>)}
    </div>
    <div className="neatline-options" role="group" aria-label="Choose a border">
      {category === "line" ? <button type="button" aria-pressed={selected === "none"} className={`neatline-option ${selected === "none" ? "is-selected" : ""}`} onClick={() => { setSelected("none"); setIsEditingThickness(false); }}>
        <span className="neatline-swatch neatline-empty" aria-hidden="true"><span /></span><span className="neatline-option-name">No border</span></button> : null}
      {categoryStyles.map((style) => <button key={style.id} type="button" title={style.name} aria-pressed={selected === style.id}
        className={`neatline-option ${selected === style.id ? "is-selected" : ""}`} onClick={() => { setSelected(style.id); setIsEditingThickness(false); }}>
      <span className="neatline-swatch" aria-hidden="true"><NeatlineArtwork styleId={style.id} widthCm={width} heightCm={height} /></span>
        <span className="neatline-option-name">{style.name}</span></button>)}
    </div>
    {category === "corner" && selectedStyle?.kind === "corner" ? <label className="neatline-corner-position">Corner placement
      <select value={cornerPosition} onChange={(event) => setCornerPosition(event.target.value as CornerPosition)}>
        {CORNER_POSITIONS.map((position) => <option key={position} value={position}>{CORNER_LABELS[position]}</option>)}
      </select></label> : null}
    {selectedStyle?.kind === "line" ? <div className="neatline-edit-wrap"><button type="button" className="neatline-edit-button" aria-expanded={isEditingThickness}
      onClick={() => setIsEditingThickness((open) => !open)}>{isEditingThickness ? "Close thickness settings" : "Edit thickness"}</button>
      {isEditingThickness ? <fieldset className="neatline-adjustments"><legend>Adjust line thickness</legend>
        {selectedWidths.map((value, index) => <label className="neatline-adjustment" key={`${selectedStyle.id}-${index}`}>
          <span className="neatline-adjustment-label">{lineLabel(index, selectedWidths.length)}</span>
          <input type="range" min="0.5" max="10" step="0.5" value={value} onChange={(event) => updateThickness(index, Number(event.target.value))} aria-label={`${lineLabel(index, selectedWidths.length)} thickness`} />
          <output>{value.toFixed(1)}</output></label>)}
        <p className="neatline-adjustments-note">हर लाइन की मोटाई अलग सेट कर सकते हैं।</p></fieldset> : null}</div> : null}
  </section>;
}
