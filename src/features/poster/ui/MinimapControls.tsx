import { usePosterContext } from "./PosterContext";
import {
  isMaparteCircleLayout,
  isMaparteSquareCaptionLayout,
} from "@/features/layout/infrastructure/layoutRepository";

function Toggle({
  label,
  hint,
  pressed,
  onToggle,
}: {
  label: string;
  hint: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`poster-text-alignment__option minimap-toggle${pressed ? " is-selected" : ""}`}
      aria-pressed={pressed}
      onClick={onToggle}
      title={hint}
    >
      <span>{label}</span>
      <span className="minimap-toggle__state">{pressed ? "On" : "Off"}</span>
    </button>
  );
}

/**
 * Circle map and minimap options: compass ring and route line.
 */
export default function MinimapControls() {
  const { state, dispatch } = usePosterContext();
  const form = state.form;
  const frameLayoutActive = Boolean(form.frameLayout && form.frameLayout !== "none");
  if (frameLayoutActive || !isMaparteSquareCaptionLayout(form.layout)) return null;

  const isCircle = isMaparteCircleLayout(form.layout);
  if (!isCircle) return null;

  const set = <K extends keyof typeof form>(name: K, value: (typeof form)[K]) =>
    dispatch({ type: "SET_FIELD", name: name as string, value } as never);

  return (
    <section className="minimap-controls" aria-label="Map extras">
      <h4 className="frame-layout-subheading" style={{ marginTop: "14px", marginBottom: "8px" }}>Map Extras</h4>
      <div className="minimap-toggle-list">
        <Toggle
          label="Map Ring"
          hint="Tick marks and compass ring around the circle"
          pressed={form.minimapRing !== false}
          onToggle={() => set("minimapRing", form.minimapRing === false)}
        />
      </div>
    </section>
  );
}
