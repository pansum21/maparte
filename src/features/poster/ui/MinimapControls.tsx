import { usePosterContext } from "./PosterContext";
import {
  isMaparteCircleLayout,
  isMaparteSquareCaptionLayout,
} from "@/features/layout/infrastructure/layoutRepository";
import { DEFAULT_NAV_MARKER_COLOR } from "@/features/poster/domain/minimapOverlay";

const ARROW_COLORS: Array<[string, string]> = [
  [DEFAULT_NAV_MARKER_COLOR, "Blue"],
  ["#E5303A", "Red"],
  ["#14B87A", "Green"],
  ["#F5A524", "Amber"],
  ["#8B5CF6", "Violet"],
  ["#FFFFFF", "White"],
];

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
 * Circle map and minimap options: text side (landscape), compass ring, red route
 * line and the navigation-arrow marker. Shown only for the editorial map layouts.
 */
export default function MinimapControls() {
  const { state, dispatch } = usePosterContext();
  const form = state.form;
  const frameLayoutActive = Boolean(form.frameLayout && form.frameLayout !== "none");
  if (frameLayoutActive || !isMaparteSquareCaptionLayout(form.layout)) return null;

  const isCircle = isMaparteCircleLayout(form.layout);
  const isLandscape = Number(form.width) > Number(form.height);
  const set = <K extends keyof typeof form>(name: K, value: (typeof form)[K]) =>
    dispatch({ type: "SET_FIELD", name: name as string, value } as never);

  const markerColor = form.navMarkerColor ?? DEFAULT_NAV_MARKER_COLOR;

  return (
    <section className="minimap-controls" aria-label="Map extras">
      <h3>Map extras</h3>
      {isCircle && isLandscape ? (
        <div className="poster-text-alignment" role="group" aria-label="Text side">
          <span className="poster-text-alignment__label">Text side</span>
          <div className="poster-text-alignment__options minimap-two">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                type="button"
                className={`poster-text-alignment__option${(form.circleTextSide ?? "right") === side ? " is-selected" : ""}`}
                aria-pressed={(form.circleTextSide ?? "right") === side}
                onClick={() => set("circleTextSide", side)}
              >
                {side === "left" ? "Text on left" : "Text on right"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="minimap-toggle-list">
        {isCircle ? (
          <Toggle
            label="Minimap ring"
            hint="Tick marks and N / E / S / W around the circle"
            pressed={form.minimapRing !== false}
            onToggle={() => set("minimapRing", form.minimapRing === false)}
          />
        ) : null}
        <Toggle
          label="Route line"
          hint="Red route drawn across the map"
          pressed={Boolean(form.minimapRoute)}
          onToggle={() => set("minimapRoute", !form.minimapRoute)}
        />
        <Toggle
          label="Navigation arrow"
          hint="Arrow marker on the chosen location"
          pressed={Boolean(form.navMarker)}
          onToggle={() => set("navMarker", !form.navMarker)}
        />
      </div>
      {form.navMarker ? (
        <div className="minimap-arrow-options">
          <label className="minimap-size">
            <span className="poster-text-alignment__label">Arrow size</span>
            <input
              type="range"
              min={0.6}
              max={1.8}
              step={0.05}
              value={form.navMarkerSize ?? 1}
              aria-label="Arrow size"
              onChange={(event) => set("navMarkerSize", Number(event.target.value))}
            />
          </label>
          <div className="minimap-colors" role="group" aria-label="Arrow colour">
            {ARROW_COLORS.map(([hex, name]) => (
              <button
                key={hex}
                type="button"
                className={`minimap-color${markerColor.toLowerCase() === hex.toLowerCase() ? " is-selected" : ""}`}
                style={{ background: hex }}
                title={name}
                aria-label={`${name} arrow`}
                aria-pressed={markerColor.toLowerCase() === hex.toLowerCase()}
                onClick={() => set("navMarkerColor", hex)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
