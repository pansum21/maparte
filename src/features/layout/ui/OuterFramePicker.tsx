import { useEffect, useState } from "react";
import "./outer-frame.css";

const STORAGE_KEY = "maparte_frame_style";
const CHANGE_EVENT = "maparte:frame:change";

export const OUTER_FRAME_STYLES = [
  { id: "none", name: "No frame", family: "none" },
  { id: "black", name: "Classic Black", family: "classic" },
  { id: "almond", name: "Warm Almond", family: "classic" },
  { id: "stain", name: "Dark Stain", family: "classic" },
  { id: "white", name: "Soft White", family: "classic" },
  { id: "gold-bead", name: "Large Gold Bead", family: "beaded" },
  { id: "black-single-bead", name: "Black · Single Bead", family: "beaded" },
  { id: "black-double-bead", name: "Black · Double Bead", family: "beaded" },
  { id: "white-single-bead", name: "White · Single Bead", family: "beaded" },
  { id: "white-double-bead", name: "White · Double Bead", family: "beaded" },
] as const;

export type OuterFrameStyle = (typeof OUTER_FRAME_STYLES)[number]["id"];

function isOuterFrameStyle(value: string | null): value is OuterFrameStyle {
  return OUTER_FRAME_STYLES.some((style) => style.id === value);
}

export default function OuterFramePicker() {
  const [selected, setSelected] = useState<OuterFrameStyle>(() => {
    if (typeof window === "undefined") return "black";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "oak") return "almond";
      if (stored === "gold") return "gold-bead";
      return isOuterFrameStyle(stored) ? stored : "black";
    } catch {
      return "black";
    }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, selected); } catch {}
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: selected }));
  }, [selected]);

  return (
    <section className="outer-frame-picker" aria-labelledby="outer-frame-heading">
      <div className="outer-frame-heading">
        <div>
          <h3 id="outer-frame-heading">3D outer frame preview</h3>
          <p>Shown around the poster in Cinema view; it stays outside the downloaded artwork.</p>
        </div>
      </div>
      <div className="outer-frame-options" role="group" aria-label="Choose an outer frame">
        {OUTER_FRAME_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            aria-pressed={selected === style.id}
            className={`outer-frame-option ${selected === style.id ? "is-selected" : ""}`}
            onClick={() => setSelected(style.id)}
          >
            <span className={`outer-frame-swatch frame-swatch-${style.id}`} aria-hidden="true">
              {style.id === "none" ? <span className="outer-frame-empty" /> : <span className="outer-frame-art" />}
            </span>
            <span className="outer-frame-name">{style.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
