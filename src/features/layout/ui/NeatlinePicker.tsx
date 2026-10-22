import { useEffect, useState } from "react";
import "./neatline.css";

const STORAGE_KEY = "maparte_neatline_style";
const CHANGE_EVENT = "maparte:neatline:change";

const patterns = [
  "single",
  "double",
  "triple",
  "dashed",
  "dotted",
  "double-dotted",
] as const;
const ornaments = ["plain", "ticks", "brackets", "floral", "leaves"] as const;
const ornamentLabels: Record<(typeof ornaments)[number], string> = {
  plain: "plain corners",
  ticks: "corner ticks",
  brackets: "corner brackets",
  floral: "small floral corners",
  leaves: "small leaf corners",
};
const patternLabels: Record<(typeof patterns)[number], string> = {
  single: "Single",
  double: "Double",
  triple: "Triple",
  dashed: "Dashed",
  dotted: "Dotted",
  "double-dotted": "Double dotted",
};
const colors = ["#302820", "#8a6738", "#283d52", "#495b4a", "#6e3935"] as const;

export const NEATLINE_STYLES = patterns.flatMap((pattern, row) =>
  ornaments.map((ornament, column) => ({
    id: `neatline-${String(row * 10 + column + 1).padStart(2, "0")}`,
    name: `${patternLabels[pattern]} · ${ornamentLabels[ornament]}`,
    pattern,
    ornament,
    color: colors[column % colors.length],
  })),
);

function readSelectedStyle(): string {
  if (typeof window === "undefined") return "none";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || "none";
    return stored === "none" || NEATLINE_STYLES.some((style) => style.id === stored)
      ? stored
      : "none";
  } catch {
    return "none";
  }
}

export function NeatlineArtwork({
  styleId,
  className = "",
}: {
  styleId: string;
  className?: string;
}) {
  const style = NEATLINE_STYLES.find((item) => item.id === styleId);
  if (!style) return null;

  const isDotted = style.pattern === "dotted" || style.pattern === "double-dotted";
  const strokeDasharray =
    style.pattern === "dashed" ? "13 8" :
    isDotted ? "1 8" :
    undefined;
  const lineOffsets =
    style.pattern === "double" || style.pattern === "double-dotted"
      ? [12, 24]
      : style.pattern === "triple"
        ? [9, 18, 27]
        : [16];

  const cornerPath = (x: number, y: number, sx: number, sy: number) => {
    const p = style.ornament;
    if (p === "plain") return null;
    if (p === "ticks") {
      return `M ${x} ${y + sy * 42} v ${-sy * 22} h ${sx * 22}`;
    }
    if (p === "brackets") {
      return `M ${x} ${y + sy * 48} v ${-sy * 28} h ${sx * 28} M ${x + sx * 8} ${y + sy * 48} h ${sx * 9} M ${x} ${y + sy * 39} v ${-sy * 9}`;
    }
    if (p === "floral") {
      return `M ${x} ${y + sy * 48} C ${x + sx * 8} ${y + sy * 31}, ${x + sx * 22} ${y + sy * 32}, ${x + sx * 39} ${y + sy * 20} M ${x + sx * 17} ${y + sy * 35} C ${x + sx * 9} ${y + sy * 26}, ${x + sx * 13} ${y + sy * 19}, ${x + sx * 23} ${y + sy * 25} C ${x + sx * 22} ${y + sy * 31}, ${x + sx * 20} ${y + sy * 34}, ${x + sx * 17} ${y + sy * 35} M ${x + sx * 28} ${y + sy * 27} C ${x + sx * 23} ${y + sy * 17}, ${x + sx * 30} ${y + sy * 13}, ${x + sx * 35} ${y + sy * 22} C ${x + sx * 34} ${y + sy * 25}, ${x + sx * 31} ${y + sy * 27}, ${x + sx * 28} ${y + sy * 27} M ${x + sx * 39} ${y + sy * 20} c ${sx * 2} ${-sy * 8}, ${sx * 13} ${-sy * 8}, ${sx * 12} 0 c ${-sx * 1} ${sy * 7}, ${-sx * 10} ${sy * 7}, ${-sx * 12} 0`;
    }
    return `M ${x} ${y + sy * 48} C ${x + sx * 9} ${y + sy * 34}, ${x + sx * 24} ${y + sy * 31}, ${x + sx * 42} ${y + sy * 18} M ${x + sx * 16} ${y + sy * 36} C ${x + sx * 8} ${y + sy * 28}, ${x + sx * 12} ${y + sy * 21}, ${x + sx * 24} ${y + sy * 28} C ${x + sx * 22} ${y + sy * 33}, ${x + sx * 20} ${y + sy * 35}, ${x + sx * 16} ${y + sy * 36} M ${x + sx * 29} ${y + sy * 27} C ${x + sx * 25} ${y + sy * 18}, ${x + sx * 31} ${y + sy * 14}, ${x + sx * 38} ${y + sy * 22} C ${x + sx * 36} ${y + sy * 26}, ${x + sx * 33} ${y + sy * 27}, ${x + sx * 29} ${y + sy * 27}`;
  };

  return (
    <svg
      className={`neatline-artwork ${className}`}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {lineOffsets.map((offset) => (
        <rect
          key={offset}
          x={offset}
          y={offset}
          width={1000 - offset * 2}
          height={1000 - offset * 2}
          fill="none"
          stroke={style.color}
          strokeWidth={isDotted ? 1.7 : 1.5}
          strokeDasharray={strokeDasharray}
          strokeLinecap={isDotted ? "round" : "square"}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {style.ornament !== "plain" && (
        <g
          fill="none"
          stroke={style.color}
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        >
          {[0, 1, 2, 3].map((corner) => {
            const x = corner % 2 === 0 ? 24 : 976;
            const y = corner < 2 ? 24 : 976;
            const sx = corner % 2 === 0 ? 1 : -1;
            const sy = corner < 2 ? 1 : -1;
            const d = cornerPath(x, y, sx, sy);
            return d ? <path key={corner} d={d} /> : null;
          })}
        </g>
      )}
    </svg>
  );
}

export function NeatlinePicker({ width, height }: { width: string; height: string }) {
  const [selected, setSelected] = useState(readSelectedStyle);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, selected);
    } catch {
      // Keep the selection for this session if storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: selected }));
  }, [selected]);

  return (
    <section className="neatline-picker" aria-labelledby="neatline-heading">
      <div className="neatline-picker-heading">
        <div>
          <h3 id="neatline-heading">Border styles</h3>
          <p>30 thin line borders · stays outside the map · adapts to {width} × {height} cm</p>
        </div>
        <span className="neatline-count">{selected === "none" ? "Off" : "30 styles"}</span>
      </div>
      <div className="neatline-options" role="group" aria-label="Choose a border">
        <button
          type="button"
          aria-pressed={selected === "none"}
          className={`neatline-option ${selected === "none" ? "is-selected" : ""}`}
          onClick={() => setSelected("none")}
        >
          <span className="neatline-swatch neatline-empty" aria-hidden="true"><span /></span>
          <span className="neatline-option-name">No border</span>
        </button>
        {NEATLINE_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            title={style.name}
            aria-pressed={selected === style.id}
            className={`neatline-option ${selected === style.id ? "is-selected" : ""}`}
            onClick={() => setSelected(style.id)}
          >
            <span className="neatline-swatch" aria-hidden="true">
              <NeatlineArtwork styleId={style.id} />
            </span>
            <span className="neatline-option-name">{style.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
