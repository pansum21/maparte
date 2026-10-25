import type { PosterForm } from "@/features/poster/application/posterReducer";
import { FONT_FAMILY_COUNT, type FontOption } from "@/core/config";
import {
  PLACEHOLDER_EXAMPLE_CITY,
  PLACEHOLDER_EXAMPLE_COUNTRY,
} from "@/features/location/ui/constants";

interface TypographySectionProps {
  form: PosterForm;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  fontOptions: FontOption[];
}


export default function TypographySection({
  form,
  onChange,
  fontOptions,
}: TypographySectionProps) {
  const defaultOptions = fontOptions.filter((option) => !option.category);
  const fontCategories = ["Sans serif", "Serif", "Display", "Monospace"] as const;

  return (
    <>
      <section className="panel-block">
        <p className="section-summary-label">STYLE</p>
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
        <label className="toggle-field">
          <span>Overlay layer</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="showMarkers"
              checked={Boolean(form.showMarkers)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>

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
        <label>
          <span className="font-select-label-row">
            <span>Font</span>
            <small className="font-count-pill">{FONT_FAMILY_COUNT} fonts</small>
          </span>
          <select
            className="form-control-tall"
            name="fontFamily"
            value={form.fontFamily}
            onChange={onChange}
            style={{
              fontFamily: form.fontFamily
                ? `"${form.fontFamily}", "Space Grotesk", sans-serif`
                : '"Space Grotesk", sans-serif',
            }}
          >
            {defaultOptions.map((fontOption) => (
              <option key={fontOption.value || "default"} value={fontOption.value}>
                {fontOption.label}
              </option>
            ))}
            {fontCategories.map((category) => {
              const options = fontOptions.filter((option) => option.category === category);
              if (options.length === 0) return null;
              return (
                <optgroup key={category} label={category}>
                  {options.map((fontOption) => (
                    <option key={fontOption.value} value={fontOption.value}>
                      {fontOption.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>

      </section>
    </>
  );
}
