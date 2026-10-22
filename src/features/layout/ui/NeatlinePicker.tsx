import { useEffect, useState } from "react";
import "./neatline.css";

const STORAGE_KEY = "maparte_neatline_style";
const CHANGE_EVENT = "maparte:neatline:change";

const patterns = ["single", "double", "triple", "dashed", "dotted"] as const;
const ornaments = [
  "plain", "ticks", "squares", "diamonds", "greek",
  "flourish", "notches", "cartographic", "stepped", "beaded",
] as const;
const colors = ["#302820", "#8a6738", "#283d52", "#495b4a", "#6e3935"] as const;

export const NEATLINE_STYLES = patterns.flatMap((pattern, row) =>
  ornaments.map((ornament, column) => ({
    id: `neatline-${String(row * 10 + column + 1).padStart(2, "0")}`,
    name: `${pattern[0].toUpperCase() + pattern.slice(1)} · ${ornament[0].toUpperCase() + ornament.slice(1)}`,
    pattern,
    ornament,
    color: colors[column % colors.length],
  })),
);

export function NeatlineArtwork({
  styleId,
  className = "",
}: {
  styleId: string;
  className?: string;
}) {
  const style = NEATLINE_STYLES.find((item) => item.id === styleId);
  if (!style) return null;

  const strokeDasharray =
    style.pattern === "dashed" ? "16 9" :
    style.pattern === "dotted" ? "1 10" :
    undefined;
  const lineOffsets =
    style.pattern === "double" ? [39, 51] :
    style.pattern === "triple" ? [34, 45, 56] :
    [45];
  const inset = (value: number) => `${value} ${value} 1000 ${1000 - value}`;
  const cornerPath = (x: number, y: number, sx: number, sy: number) => {
    const p = style.ornament;
    if (p === "plain") return null;
    if (p === "ticks") return `M ${x} ${y + sy * 54} v ${-sy * 25} h ${sx * 25}`;
    if (p === "squares") return `M ${x} ${y + sy * 45} v ${-sy * 32} h ${sx * 32} v ${sy * 32} z`;
    if (p === "diamonds") return `M ${x} ${y + sy * 42} l ${sx * 18} ${-sy * 18} l ${sx * 18} ${sy * 18} l ${-sx * 18} ${sy * 18} z`;
    if (p === "greek") return `M ${x} ${y + sy * 60} v ${-sy * 15} h ${sx * 15} v ${-sy * 15} h ${sx * 15} v ${-sy * 15} h ${sx * 15}`;
    if (p === "flourish") return `M ${x} ${y + sy * 54} C ${x} ${y + sy * 20}, ${x + sx * 48} ${y + sy * 54}, ${x + sx * 48} ${y + sy * 18} M ${x + sx * 12} ${y + sy * 12} q ${sx * 12} ${sy * 15} ${sx * 25} 0`;
    if (p === "notches") return `M ${x} ${y + sy * 54} v ${-sy * 18} h ${sx * 12} v ${sy * 12} h ${sx * 12} v ${-sy * 12} h ${sx * 18}`;
    if (p === "cartographic") return `M ${x} ${y + sy * 58} v ${-sy * 45} M ${x - sx * 6} ${y + sy * 34} h ${sx * 12} M ${x - sx * 6} ${y + sy * 19} h ${sx * 12}`;
    if (p === "stepped") return `M ${x} ${y + sy * 58} v ${-sy * 12} h ${sx * 12} v ${-sy * 12} h ${sx * 12} v ${-sy * 12} h ${sx * 12} v ${-sy * 12}`;
    return `M ${x} ${y + sy * 56} q ${sx * 10} ${-sy * 22} ${sx * 20} 0 t ${sx * 20} 0`;
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
          strokeWidth={style.pattern === "dotted" ? 4 : 3}
          strokeDasharray={strokeDasharray}
          strokeLinecap={style.pattern === "dotted" ? "round" : "square"}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {style.ornament !== "plain" && (
        <g fill="none" stroke={style.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
          {[0, 1, 2, 3].map((corner) => {
            const x = corner % 2 === 0 ? 65 : 935;
            const y = corner < 2 ? 65 : 935;
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
  const [selected, setSelected] = useState(() => {
    if (typeof window === "undefined") return "none";
    try { return window.localStorage.getItem(STORAGE_KEY) || "none"; } catch { return "none"; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, selected); } catch {}
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: selected }));
  }, [selected]);

  return (
    <section className="neatline-picker" aria-labelledby="neatline-heading">
      <div className="neatline-picker-heading">
        <div>
          <h3 id="neatline-heading">Inner border lines</h3>
          <p>50 print-friendly line designs · adapts to {width} × {height} cm</p>
        </div>
        <span className="neatline-count">{selected === "none" ? "Off" : "50 styles"}</span>
      </div>
      <div className="neatline-options" role="group" aria-label="Choose an inner border">
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
            aria-pressed={selected === style.id}
            className={`neatline-option ${selected === style.id ? "is-selected" : ""}`}
            onClick={() => setSelected(style.id)}
          >
            <span className="neatline-swatch" aria-hidden="true">
              <NeatlineArtwork styleId={style.id} />
            </span>
            <span className="neatline-option-name">{String(NEATLINE_STYLES.indexOf(style) + 1).padStart(2, "0")} · {style.ornament}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
