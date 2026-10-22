import { useEffect, useMemo, useState } from "react";
import "./neatline.css";

const STORAGE_KEY = "maparte_neatline_style";
const THICKNESS_STORAGE_KEY = "maparte_neatline_thicknesses";
const CHANGE_EVENT = "maparte:neatline:change";

type LinePattern = "single" | "double" | "triple" | "dashed" | "dotted" | "double-dotted";
type NeatlineStyle = {
  id: string;
  name: string;
  pattern: LinePattern;
};

const patterns: NeatlineStyle[] = [
  { id: "neatline-single", name: "Single line", pattern: "single" },
  { id: "neatline-double", name: "Double line", pattern: "double" },
  { id: "neatline-triple", name: "Triple line", pattern: "triple" },
  { id: "neatline-dashed", name: "Dashed line", pattern: "dashed" },
  { id: "neatline-dotted", name: "Dotted line", pattern: "dotted" },
  { id: "neatline-double-dotted", name: "Double dotted", pattern: "double-dotted" },
];

export const NEATLINE_STYLES = patterns;
const DEFAULT_LINE_WIDTH = 2;

function lineCount(pattern: LinePattern): number {
  if (pattern === "double" || pattern === "double-dotted") return 2;
  if (pattern === "triple") return 3;
  return 1;
}

function readSelectedStyle(): string {
  if (typeof window === "undefined") return "none";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || "none";
    return stored === "none" || patterns.some((style) => style.id === stored)
      ? stored
      : "none";
  } catch {
    return "none";
  }
}

function readThicknesses(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(THICKNESS_STORAGE_KEY) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, number[]>;
  } catch {
    return {};
  }
}

function widthsFor(styleId: string, widthByStyle: Record<string, number[]>): number[] {
  const style = patterns.find((item) => item.id === styleId);
  if (!style) return [];
  const count = lineCount(style.pattern);
  const saved = widthByStyle[styleId] || [];
  return Array.from({ length: count }, (_, index) => {
    const value = Number(saved[index]);
    return Number.isFinite(value) ? Math.min(10, Math.max(0.5, value)) : DEFAULT_LINE_WIDTH;
  });
}

function strokeWidthFor(styleId: string, lineIndex: number): number {
  return widthsFor(styleId, readThicknesses())[lineIndex] ?? DEFAULT_LINE_WIDTH;
}

export function NeatlineArtwork({
  styleId,
  className = "",
}: {
  styleId: string;
  className?: string;
}) {
  const style = patterns.find((item) => item.id === styleId);
  if (!style) return null;

  const isDotted = style.pattern === "dotted" || style.pattern === "double-dotted";
  const strokeDasharray =
    style.pattern === "dashed" ? "13 8" : isDotted ? "1 8" : undefined;
  const lineOffsets =
    style.pattern === "double" || style.pattern === "double-dotted"
      ? [12, 24]
      : style.pattern === "triple"
        ? [9, 18, 27]
        : [16];

  return (
    <svg
      className={`neatline-artwork ${className}`}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {lineOffsets.map((offset, index) => (
        <rect
          key={offset}
          x={offset}
          y={offset}
          width={1000 - offset * 2}
          height={1000 - offset * 2}
          fill="none"
          stroke="#354b62"
          strokeWidth={strokeWidthFor(style.id, index)}
          strokeDasharray={strokeDasharray}
          strokeLinecap={isDotted ? "round" : "square"}
        />
      ))}
    </svg>
  );
}

function lineLabel(index: number, count: number): string {
  if (count === 1) return "Line thickness";
  if (count === 2) return index === 0 ? "Outer line" : "Inner line";
  return ["Outer line", "Middle line", "Inner line"][index];
}

export function NeatlinePicker({ width, height }: { width: string; height: string }) {
  const [selected, setSelected] = useState(readSelectedStyle);
  const [widthByStyle, setWidthByStyle] = useState(readThicknesses);
  const [isEditingThickness, setIsEditingThickness] = useState(false);
  const selectedStyle = useMemo(
    () => patterns.find((style) => style.id === selected),
    [selected],
  );
  const selectedWidths = selectedStyle ? widthsFor(selected, widthByStyle) : [];

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, selected);
      window.localStorage.setItem(THICKNESS_STORAGE_KEY, JSON.stringify(widthByStyle));
    } catch {
      // Keep the current border for this session if storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: selected }));
  }, [selected, widthByStyle]);

  const updateThickness = (lineIndex: number, value: number) => {
    if (!selectedStyle) return;
    setWidthByStyle((current) => {
      const next = widthsFor(selectedStyle.id, current);
      next[lineIndex] = value;
      return { ...current, [selectedStyle.id]: next };
    });
  };

  return (
    <section className="neatline-picker" aria-labelledby="neatline-heading">
      <div className="neatline-picker-heading">
        <div>
          <h3 id="neatline-heading">Border styles</h3>
          <p>Simple line borders · stays outside the map · adapts to {width} × {height} cm</p>
        </div>
        <span className="neatline-count">{selected === "none" ? "Off" : "6 styles"}</span>
      </div>
      <div className="neatline-options" role="group" aria-label="Choose a line border">
        <button
          type="button"
          aria-pressed={selected === "none"}
          className={`neatline-option ${selected === "none" ? "is-selected" : ""}`}
          onClick={() => {
            setSelected("none");
            setIsEditingThickness(false);
          }}
        >
          <span className="neatline-swatch neatline-empty" aria-hidden="true"><span /></span>
          <span className="neatline-option-name">No border</span>
        </button>
        {patterns.map((style) => (
          <button
            key={style.id}
            type="button"
            title={style.name}
            aria-pressed={selected === style.id}
            className={`neatline-option ${selected === style.id ? "is-selected" : ""}`}
            onClick={() => {
              setSelected(style.id);
              setIsEditingThickness(false);
            }}
          >
            <span className="neatline-swatch" aria-hidden="true">
              <NeatlineArtwork styleId={style.id} />
            </span>
            <span className="neatline-option-name">{style.name}</span>
          </button>
        ))}
      </div>
      {selectedStyle ? (
        <div className="neatline-edit-wrap">
          <button
            type="button"
            className="neatline-edit-button"
            aria-expanded={isEditingThickness}
            onClick={() => setIsEditingThickness((open) => !open)}
          >
            {isEditingThickness ? "Close thickness settings" : "Edit thickness"}
          </button>
          {isEditingThickness ? <fieldset className="neatline-adjustments">
          <legend>Adjust line thickness</legend>
          {selectedWidths.map((value, index) => (
            <label className="neatline-adjustment" key={`${selectedStyle.id}-${index}`}>
              <span className="neatline-adjustment-label">
                {lineLabel(index, selectedWidths.length)}
              </span>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={value}
                onChange={(event) => updateThickness(index, Number(event.target.value))}
                aria-label={`${lineLabel(index, selectedWidths.length)} thickness`}
              />
              <output>{value.toFixed(1)}</output>
            </label>
          ))}
          <p className="neatline-adjustments-note">Each line can be adjusted separately; the number shows its thickness.</p>
          </fieldset> : null}
        </div>
      ) : null}
    </section>
  );
}
