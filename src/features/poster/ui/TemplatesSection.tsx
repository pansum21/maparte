import { useState } from "react";
import { usePosterContext } from "./PosterContext";
import {
  OCCASION_TEMPLATES,
  type OccasionTemplate,
} from "../domain/occasionTemplates";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { createMarkerItem } from "@/features/markers/infrastructure/helpers";
import { CheckIcon, SparklesIcon } from "@/shared/ui/Icons";
import { DEFAULT_LAT, DEFAULT_LON } from "@/core/config";

interface TemplatesSectionProps {
  onTemplateApplied?: (template: OccasionTemplate) => void;
}

export default function TemplatesSection({
  onTemplateApplied,
}: TemplatesSectionProps) {
  const { state, dispatch } = usePosterContext();
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApplyTemplate = (template: OccasionTemplate) => {
    // 1. Update theme
    dispatch({ type: "SET_THEME", themeId: template.themeId });

    // 2. Update typography & text overlay
    dispatch({
      type: "SET_FORM_FIELDS",
      resetDisplayNameOverrides: false,
      fields: {
        fontFamily: template.fontFamily,
        displayCity: template.cityText,
        displayCountry: template.countryText,
        showPosterText: true,
        showMarkers: true,
      },
    });

    // 3. Place matching occasion marker at current map center
    const lat = Number(state.form.latitude) || DEFAULT_LAT;
    const lon = Number(state.form.longitude) || DEFAULT_LON;
    const marker = createMarkerItem({
      lat,
      lon,
      defaults: state.markerDefaults,
      iconId: template.markerIconId,
    });

    dispatch({ type: "CLEAR_MARKERS" });
    dispatch({ type: "ADD_MARKER", marker });

    setAppliedId(template.id);
    onTemplateApplied?.(template);
  };

  return (
    <div className="occasion-templates-section" aria-label="Occasion Templates">
      <div className="occasion-templates-header">
        <div className="occasion-templates-title-row">
          <SparklesIcon className="occasion-templates-icon" />
          <h2 className="occasion-templates-title">Occasion Presets</h2>
        </div>
        <p className="occasion-templates-sub">
          1-Click designer templates for life's most meaningful moments.
        </p>
      </div>

      <div className="occasion-templates-grid">
        {OCCASION_TEMPLATES.map((tmpl) => {
          const theme = getTheme(tmpl.themeId);
          const isApplied = appliedId === tmpl.id;

          return (
            <div
              key={tmpl.id}
              className={`occasion-card${isApplied ? " is-applied" : ""}`}
            >
              <div className="occasion-card-top">
                <span className="occasion-card-badge">{tmpl.badge}</span>
                <div
                  className="occasion-card-palette"
                  title={`Theme: ${theme.name}`}
                >
                  <span
                    className="palette-dot"
                    style={{ background: theme.ui.bg }}
                  />
                  <span
                    className="palette-dot"
                    style={{ background: theme.map.water }}
                  />
                  <span
                    className="palette-dot"
                    style={{ background: theme.ui.text }}
                  />
                </div>
              </div>

              <h3 className="occasion-card-title">{tmpl.title}</h3>
              <p className="occasion-card-tagline">{tmpl.tagline}</p>
              <p className="occasion-card-desc">{tmpl.description}</p>

              <div className="occasion-card-meta">
                <span className="occasion-card-font">
                  Font: <strong>{tmpl.fontFamily}</strong>
                </span>
                <span className="occasion-card-theme">
                  Theme: <strong>{theme.name}</strong>
                </span>
              </div>

              <button
                type="button"
                className={`occasion-card-apply-btn${isApplied ? " is-applied" : ""}`}
                onClick={() => handleApplyTemplate(tmpl)}
              >
                {isApplied ? (
                  <>
                    <CheckIcon className="apply-btn-icon" />
                    <span>Applied to Poster</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="apply-btn-icon" />
                    <span>Apply Preset</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
