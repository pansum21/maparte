import { useState } from "react";
import { usePosterContext } from "./PosterContext";
import type { PosterForm } from "@/features/poster/application/posterReducer";
import { FONT_FAMILY_COUNT, type FontOption } from "@/core/config";
import {
  MAX_POSTER_FONT_SIZE,
  MIN_POSTER_FONT_SIZE,
} from "@/features/poster/domain/textLayout";
import {
  PLACEHOLDER_EXAMPLE_CITY,
  PLACEHOLDER_EXAMPLE_COUNTRY,
} from "@/features/location/ui/constants";

interface TypographySectionProps {
  form: PosterForm;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onNumericBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFontChange: (fontFamily: string) => void;
  fontOptions: FontOption[];
}


export default function TypographySection({
  form,
  onChange,
  onNumericBlur,
  onFontChange,
  fontOptions,
}: TypographySectionProps) {
  const { effectiveTheme, dispatch } = usePosterContext();
  const fontCategories = ["Sans serif", "Serif", "Display", "Monospace"] as const;
  const [activePanel, setActivePanel] = useState<"text" | "style">("text");
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const uniqueFontOptions = fontOptions.filter((option, index, options) => {
    const key = option.value.trim().toLowerCase() || "space grotesk";
    return options.findIndex((candidate) =>
      (candidate.value.trim().toLowerCase() || "space grotesk") === key,
    ) === index;
  });
  const selectedFont =
    uniqueFontOptions.find(
      (option) =>
        (option.value.trim().toLowerCase() || "space grotesk") ===
        (form.fontFamily.trim().toLowerCase() || "space grotesk"),
    ) ?? uniqueFontOptions.find((option) => !option.value) ?? uniqueFontOptions[0];

  const renderFontOption = (fontOption: FontOption) => {
    const selected = fontOption.value === selectedFont?.value;
    return (
      <button
        className={`font-picker-option${selected ? " is-selected" : ""}`}
        key={fontOption.value || "default"}
        type="button"
        role="option"
        aria-selected={selected}
        style={{
          fontFamily: fontOption.value
            ? `"${fontOption.value}", sans-serif`
            : '"Space Grotesk", sans-serif',
        }}
        onClick={() => {
          onFontChange(fontOption.value);
          setFontPickerOpen(false);
        }}
      >
        {fontOption.label}
      </button>
    );
  };

  return (
    <>
      <section className="panel-block typography-panel-block">
        <div className="marker-picker-mode-tabs typography-mode-tabs" role="tablist" aria-label="Text controls">
          <button type="button" role="tab" aria-selected={activePanel === "text"} className={activePanel === "text" ? "is-active" : ""} onClick={() => setActivePanel("text")}>Text</button>
          <button type="button" role="tab" aria-selected={activePanel === "style"} className={activePanel === "style" ? "is-active" : ""} onClick={() => setActivePanel("style")}>Style</button>
        </div>
        <div hidden={activePanel !== "style"}>
        <label className="toggle-field">
          <span>Poster text</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="showPosterText"
              checked={Boolean(form.showPosterText)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>
        {([['overlayTop', 'Overlay Top'], ['overlayBottom', 'Overlay Bottom']] as const).map(([name, label]) => (
          <label className="toggle-field" key={name}>
            <span>{label}</span><span className="theme-switch">
              <input type="checkbox" name={name} checked={form[name] ?? form.showMarkers} onChange={onChange} />
              <span className="theme-switch-track" aria-hidden="true" />
            </span>
          </label>
        ))}
        </div>
        <div hidden={activePanel !== "text"}>
        <label>Poster text color</label>
        <div className="poster-text-color-controls">
          <input type="color" name="posterTextColor" aria-label="Poster text color"
            value={form.posterTextColor || effectiveTheme.ui.text} onChange={onChange}
            onInput={(event) => dispatch({ type: "SET_FIELD", name: "posterTextColor", value: event.currentTarget.value })} />
          <input type="text" aria-label="Poster text color HEX" maxLength={7}
            key={form.posterTextColor || effectiveTheme.ui.text}
            defaultValue={form.posterTextColor || effectiveTheme.ui.text}
            onBlur={(event) => {
              const value = event.currentTarget.value.trim();
              if (/^#[0-9a-f]{6}$/i.test(value)) dispatch({ type: "SET_FIELD", name: "posterTextColor", value });
              else event.currentTarget.value = form.posterTextColor || effectiveTheme.ui.text;
            }} />
        </div>

        <div className="field-grid keep-two-mobile">
          <label>
            Display city
            <input
              className="form-control-tall"
              name="displayCity"
              value={form.displayCity}
              onChange={onChange}
              placeholder={PLACEHOLDER_EXAMPLE_CITY}
            />
          </label>
          <label>Display state
            <input className="form-control-tall" name="displayState" value={form.displayState || ""}
              onChange={onChange} placeholder="Optional state / region" />
          </label>
          <label>
            Display country
            <input
              className="form-control-tall"
              name="displayCountry"
              value={form.displayCountry}
              onChange={onChange}
              placeholder={PLACEHOLDER_EXAMPLE_COUNTRY}
            />
          </label>
        </div>
        <label>
          Special Date or Tagline (Optional)
          <input
            className="form-control-tall"
            name="customDate"
            value={form.customDate || ""}
            onChange={onChange}
            placeholder="e.g. 14.02.2024 • Where We Met"
          />
        </label>
        </div>
        <div hidden={activePanel !== "style"}>
        <div className={`font-picker-field${fontPickerOpen ? " is-open" : ""}`}>
          <div className="font-picker-toolbar">
            <span className="font-select-label-row">
              <span id="font-picker-label">Font</span>
              <small className="font-count-pill">{FONT_FAMILY_COUNT} fonts</small>
            </span>
            <label className="font-size-field">
              <span>Font Size</span>
              <input
                className="font-size-input"
                type="number"
                name="fontSize"
                min={MIN_POSTER_FONT_SIZE}
                max={MAX_POSTER_FONT_SIZE}
                step={1}
                inputMode="numeric"
                aria-label="Poster font size, 8 to 72"
                value={form.fontSize}
                onChange={onChange}
                onBlur={onNumericBlur}
              />
            </label>
          </div>
          <button
            aria-controls="poster-font-options"
            aria-expanded={fontPickerOpen}
            aria-haspopup="listbox"
            aria-label={`Font family: ${selectedFont?.label ?? "Default (Space Grotesk)"}`}
            className="font-picker-trigger form-control-tall"
            type="button"
            onClick={() => setFontPickerOpen((open) => !open)}
          >
            <span
              style={{
                fontFamily: form.fontFamily
                  ? `"${form.fontFamily}", "Space Grotesk", sans-serif`
                  : '"Space Grotesk", sans-serif',
              }}
            >
              {selectedFont?.label ?? "Default (Space Grotesk)"}
            </span>
            <span
              className={`font-picker-chevron${fontPickerOpen ? " is-open" : ""}`}
              aria-hidden="true"
            >
              ⌄
            </span>
          </button>
          {fontPickerOpen ? (
            <div
              className="font-picker-options"
              id="poster-font-options"
              role="listbox"
              aria-labelledby="font-picker-label"
            >
              {uniqueFontOptions.filter((option) => !option.category).map(renderFontOption)}
              {fontCategories.map((category) => {
                const options = uniqueFontOptions.filter((option) => option.category === category);
                if (options.length === 0) return null;
                return (
                  <div className="font-picker-group" key={category}>
                    <span className="font-picker-group-label">{category}</span>
                    {options.map(renderFontOption)}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        </div>
      </section>
    </>
  );
}
