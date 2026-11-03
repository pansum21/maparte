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
  const { state, effectiveTheme, dispatch } = usePosterContext();
  const fontCategories = ["Sans serif", "Serif", "Display", "Monospace"] as const;

  // Initial tab matches current text mode or defaults to map
  const [activePanel, setActivePanel] = useState<"map" | "preset" | "style">(
    form.textMode === "preset" || Boolean(form.presetTitle) ? "preset" : "map"
  );
  const [fontPickerOpen, setFontPickerOpen] = useState(false);

  const isShaped = Boolean(form.mapShape && form.mapShape !== "full");
  const currentTextColor = form.posterTextColor || (isShaped ? "#0f172a" : effectiveTheme.ui.text);

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

  const handleTextColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: "SET_FIELD",
      name: "posterTextColor",
      value: event.target.value,
    });
  };

  const handleHexBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value.trim();
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      dispatch({ type: "SET_FIELD", name: "posterTextColor", value });
    } else {
      event.currentTarget.value = currentTextColor;
    }
  };

  const handleRestoreLocation = () => {
    const defaultCity =
      state.selectedLocation?.city ||
      state.form.location.split(",")[0]?.trim() ||
      "Dehradun";
    const defaultCountry =
      state.selectedLocation?.country || "India";

    dispatch({
      type: "SET_FORM_FIELDS",
      resetDisplayNameOverrides: true,
      fields: {
        textMode: "map",
        displayCity: defaultCity,
        displayCountry: defaultCountry,
        displayTown: "",
        displayState: "",
        customDate: "",
      },
    });
  };

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

  const currentPresetTitle =
    form.presetTitle !== undefined
      ? form.presetTitle
      : (form.textMode === "preset" ? form.displayCity : "WHERE WE MET");

  const currentPresetSubtitle =
    form.presetSubtitle !== undefined
      ? form.presetSubtitle
      : (form.textMode === "preset" ? form.displayCountry : "FOREVER & ALWAYS • 14 FEB");

  const currentPresetExtra =
    form.presetExtra !== undefined
      ? form.presetExtra
      : (form.customDate || "");

  return (
    <>
      <section className="panel-block typography-panel-block">
        {/* 3 Mode Tabs: Map Text | Preset Text | Style */}
        <div
          className="marker-picker-mode-tabs typography-mode-tabs"
          role="tablist"
          aria-label="Text controls"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "map"}
            className={activePanel === "map" ? "is-active" : ""}
            onClick={() => {
              setActivePanel("map");
              dispatch({ type: "SET_FIELD", name: "textMode", value: "map" });
            }}
          >
            Map Text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "preset"}
            className={activePanel === "preset" ? "is-active" : ""}
            onClick={() => {
              setActivePanel("preset");
              dispatch({ type: "SET_FIELD", name: "textMode", value: "preset" });
            }}
          >
            Preset Text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "style"}
            className={activePanel === "style" ? "is-active" : ""}
            onClick={() => setActivePanel("style")}
          >
            Style
          </button>
        </div>

        {/* 1. MAP TEXT TAB */}
        <div hidden={activePanel !== "map"}>
          <label htmlFor="mapPosterTextColorInput">Poster text color</label>
          <div className="poster-text-color-controls">
            <input
              type="color"
              id="mapPosterTextColorInput"
              name="posterTextColor"
              aria-label="Poster text color"
              value={currentTextColor}
              onChange={handleTextColorChange}
            />
            <input
              type="text"
              aria-label="Poster text color HEX"
              maxLength={7}
              key={`map-${currentTextColor}`}
              defaultValue={currentTextColor}
              onBlur={handleHexBlur}
            />
          </div>

          <div className="field-grid keep-two-mobile" style={{ marginTop: "12px" }}>
            <label>
              Town / Village
              <input
                className="form-control-tall"
                name="displayTown"
                value={form.displayTown || ""}
                onChange={(e) => {
                  onChange(e);
                  if (form.textMode !== "map") {
                    dispatch({ type: "SET_FIELD", name: "textMode", value: "map" });
                  }
                }}
                placeholder="Town / Village"
              />
            </label>
            <label>
              City
              <input
                className="form-control-tall"
                name="displayCity"
                value={form.displayCity}
                onChange={(e) => {
                  onChange(e);
                  if (form.textMode !== "map") {
                    dispatch({ type: "SET_FIELD", name: "textMode", value: "map" });
                  }
                }}
                placeholder={PLACEHOLDER_EXAMPLE_CITY}
              />
            </label>
            <label>
              State / Region
              <input
                className="form-control-tall"
                name="displayState"
                value={form.displayState || ""}
                onChange={(e) => {
                  onChange(e);
                  if (form.textMode !== "map") {
                    dispatch({ type: "SET_FIELD", name: "textMode", value: "map" });
                  }
                }}
                placeholder="Optional state / region"
              />
            </label>
            <label>
              Country
              <input
                className="form-control-tall"
                name="displayCountry"
                value={form.displayCountry}
                onChange={(e) => {
                  onChange(e);
                  if (form.textMode !== "map") {
                    dispatch({ type: "SET_FIELD", name: "textMode", value: "map" });
                  }
                }}
                placeholder={PLACEHOLDER_EXAMPLE_COUNTRY}
              />
            </label>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label>
              Special Date or Tagline (Optional)
              <input
                className="form-control-tall"
                name="customDate"
                value={form.customDate || ""}
                onChange={(e) => {
                  onChange(e);
                  if (form.textMode !== "map") {
                    dispatch({ type: "SET_FIELD", name: "textMode", value: "map" });
                  }
                }}
                placeholder="e.g. 14.02.2024 • Our Special Place"
              />
            </label>
          </div>

          <div style={{ marginTop: "14px" }}>
            <button
              type="button"
              className="btn-restore-location"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                fontSize: "0.82rem",
                borderRadius: "6px",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-primary, #e2e8f0)",
                cursor: "pointer",
                width: "100%",
                justifyContent: "center",
              }}
              onClick={handleRestoreLocation}
              title="Reset Map Text to current map location"
            >
              <span>📍</span> Auto-fill from Current Map Location
            </button>
          </div>
        </div>

        {/* 2. PRESET TEXT TAB */}
        <div hidden={activePanel !== "preset"}>
          <label htmlFor="presetPosterTextColorInput">Poster text color</label>
          <div className="poster-text-color-controls">
            <input
              type="color"
              id="presetPosterTextColorInput"
              name="posterTextColor"
              aria-label="Poster text color"
              value={currentTextColor}
              onChange={handleTextColorChange}
            />
            <input
              type="text"
              aria-label="Poster text color HEX"
              maxLength={7}
              key={`preset-${currentTextColor}`}
              defaultValue={currentTextColor}
              onBlur={handleHexBlur}
            />
          </div>

          {/* Main Topic (मेन टॉपिक / हेडिंग - जैसे WHERE WE MET) */}
          <div style={{ marginTop: "12px" }}>
            <label>
              Main Topic / Title
              <input
                className="form-control-tall"
                name="presetTitle"
                value={currentPresetTitle}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", name: "presetTitle", value: e.target.value });
                  dispatch({ type: "SET_FIELD", name: "textMode", value: "preset" });
                }}
                placeholder="e.g. WHERE WE MET, SHE SAID YES, 42.195 KM"
              />
              <span
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-secondary, #94a3b8)",
                  display: "block",
                  marginTop: "3px",
                  lineHeight: 1.3,
                }}
              >
                Prominent headline displayed on the poster
              </span>
            </label>
          </div>

          {/* Sub Topic (सब टॉपिक - जो भी लिखना होगा नंबर वगैरह) */}
          <div style={{ marginTop: "12px" }}>
            <label>
              Sub Topic / Tagline
              <input
                className="form-control-tall"
                name="presetSubtitle"
                value={currentPresetSubtitle}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", name: "presetSubtitle", value: e.target.value });
                  dispatch({ type: "SET_FIELD", name: "textMode", value: "preset" });
                }}
                placeholder="e.g. FOREVER & ALWAYS • 14 FEB, EST. 2024"
              />
              <span
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-secondary, #94a3b8)",
                  display: "block",
                  marginTop: "3px",
                  lineHeight: 1.3,
                }}
              >
                Secondary text appearing directly below the divider line
              </span>
            </label>
          </div>

          {/* Extra Line (उसके नीचे एक और इनपुट जिसमें वो कुछ एक्स्ट्रा लिख सके) */}
          <div style={{ marginTop: "12px" }}>
            <label>
              Extra Line (Optional)
              <input
                className="form-control-tall"
                name="presetExtra"
                value={currentPresetExtra}
                onChange={(e) => {
                  dispatch({ type: "SET_FIELD", name: "presetExtra", value: e.target.value });
                  dispatch({ type: "SET_FIELD", name: "textMode", value: "preset" });
                }}
                placeholder="e.g. 48° 51' 30&quot; N • Our Special Rooftop • Finisher 03:42:15"
              />
              <span
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-secondary, #94a3b8)",
                  display: "block",
                  marginTop: "3px",
                  lineHeight: 1.3,
                }}
              >
                Optional third line for custom date, coordinates, or milestone note
              </span>
            </label>
          </div>

          {/* Quick Preset Topic Suggestions */}
          <div style={{ marginTop: "16px" }}>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-secondary, #94a3b8)",
                display: "block",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Quick Preset Topic Ideas
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              {[
                { label: "💕 Where We Met", title: "WHERE WE MET", sub: "FOREVER & ALWAYS • 14 FEB" },
                { label: "💍 She Said Yes", title: "SHE SAID YES", sub: "THE PROPOSAL • WE SAID FOREVER" },
                { label: "🥂 Wedding Day", title: "MR & MRS", sub: "OUR WEDDING DAY • TO HAVE & TO HOLD" },
                { label: "🏡 First Home", title: "OUR FIRST HOME", sub: "HOME SWEET HOME • EST. 2024" },
                { label: "✈️ Travel Memories", title: "MEMORIES OF A LIFETIME", sub: "OUR GREATEST ADVENTURE" },
                { label: "🏃 42.195 KM", title: "FINISHER 42.195 KM", sub: "SWEAT • DETERMINATION • GLORY" },
                { label: "🍼 Baby Arrival", title: "WELCOME TO THE WORLD", sub: "BORN 14.08.2024 • 7 LBS 4 OZ" },
                { label: "🌳 Hometown Roots", title: "WHERE ROOTS RUN DEEP", sub: "NO MATTER HOW FAR • ALWAYS HOME" },
                { label: "🏔️ Mountain Summit", title: "SUMMIT ELEVATION 4,810 M", sub: "CONQUERED THE PEAK • 15.07.2024" },
              ].map((idea) => (
                <button
                  key={idea.label}
                  type="button"
                  style={{
                    padding: "5px 10px",
                    fontSize: "0.76rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "var(--text-primary, #cbd5e1)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => {
                    dispatch({
                      type: "SET_FORM_FIELDS",
                      resetDisplayNameOverrides: false,
                      fields: {
                        textMode: "preset",
                        presetTitle: idea.title,
                        presetSubtitle: idea.sub,
                      },
                    });
                  }}
                >
                  {idea.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. STYLE TAB */}
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
          {(
            [
              ["overlayTop", "Overlay Top"],
              ["overlayBottom", "Overlay Bottom"],
            ] as const
          ).map(([name, label]) => (
            <label className="toggle-field" key={name}>
              <span>{label}</span>
              <span className="theme-switch">
                <input
                  type="checkbox"
                  name={name}
                  checked={form[name] ?? form.showMarkers}
                  onChange={onChange}
                />
                <span className="theme-switch-track" aria-hidden="true" />
              </span>
            </label>
          ))}

          <div
            className={`font-picker-field${fontPickerOpen ? " is-open" : ""}`}
            style={{ marginTop: "14px" }}
          >
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
                {uniqueFontOptions
                  .filter((option) => !option.category)
                  .map(renderFontOption)}
                {fontCategories.map((category) => {
                  const options = uniqueFontOptions.filter(
                    (option) => option.category === category,
                  );
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
