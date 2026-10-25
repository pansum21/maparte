import { useState } from "react";
import { usePosterContext } from "./PosterContext";
import {
  OCCASION_TEMPLATES,
  type OccasionTemplate,
} from "../domain/occasionTemplates";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { createMarkerItem } from "@/features/markers/infrastructure/helpers";
import { InfoIcon, SparklesIcon, TrashIcon } from "@/shared/ui/Icons";
import { DEFAULT_LAT, DEFAULT_LON } from "@/core/config";

interface TemplatesSectionProps {
  onTemplateApplied?: (template: OccasionTemplate) => void;
}

export default function TemplatesSection({
  onTemplateApplied,
}: TemplatesSectionProps) {
  const { state, dispatch } = usePosterContext();
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

  const handleToggleTemplate = (template: OccasionTemplate) => {
    // If already active, toggle OFF / unclick!
    if (appliedId === template.id) {
      setAppliedId(null);
      dispatch({ type: "CLEAR_MARKERS" });

      // Restore standard location names
      const defaultCity =
        state.selectedLocation?.city ||
        state.form.location.split(",")[0]?.trim() ||
        "Hanover";
      const defaultCountry =
        state.selectedLocation?.country || "Germany";

      dispatch({
        type: "SET_FORM_FIELDS",
        resetDisplayNameOverrides: true,
        fields: {
          displayCity: defaultCity,
          displayCountry: defaultCountry,
        },
      });
      return;
    }

    // Apply new template
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
          <button
            type="button"
            className="occasion-info-btn occasion-header-info-btn"
            aria-label="About occasion presets"
            aria-expanded={openInfoId === "__guide"}
            aria-controls="occasion-presets-guide"
            onClick={() => setOpenInfoId((current) => current === "__guide" ? null : "__guide")}
          >
            <InfoIcon aria-hidden="true" />
          </button>
        </div>
        {openInfoId === "__guide" ? (
          <p className="occasion-templates-sub" id="occasion-presets-guide">
            Apply a preset to update the map theme, typography, poster text, and occasion marker. Select Remove Preset to clear its marker and restore the location labels.
          </p>
        ) : null}
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
              <div className="occasion-card-heading">
                <h3 className="occasion-card-title">{tmpl.title}</h3>
                <span className="occasion-card-badge">{tmpl.badge}</span>
                <div
                  className="occasion-card-palette"
                  role="img"
                  aria-label={`${theme.name} color palette`}
                  title={`Theme: ${theme.name}`}
                >
                  <span
                    className="palette-dot"
                    style={{ background: theme.ui.bg, color: theme.ui.bg }}
                    title="Background"
                  />
                  <span
                    className="palette-dot"
                    style={{ background: theme.map.water, color: theme.map.water }}
                    title="Water"
                  />
                  <span
                    className="palette-dot"
                    style={{ background: theme.map.land, color: theme.map.land }}
                    title="Land"
                  />
                  <span
                    className="palette-dot"
                    style={{ background: theme.ui.text, color: theme.ui.text }}
                    title="Text"
                  />
                </div>
                <button
                  type="button"
                  className="occasion-info-btn"
                  aria-label={`More information about ${tmpl.title}`}
                  aria-expanded={openInfoId === tmpl.id}
                  aria-controls={`occasion-info-${tmpl.id}`}
                  onClick={() => setOpenInfoId((current) => current === tmpl.id ? null : tmpl.id)}
                >
                  <InfoIcon aria-hidden="true" />
                </button>
              </div>

              {openInfoId === tmpl.id ? (
                <div className="occasion-card-info" id={`occasion-info-${tmpl.id}`}>
                  <p className="occasion-card-tagline">{tmpl.tagline}</p>
                  <p className="occasion-card-desc">{tmpl.description}</p>
                  <div className="occasion-card-meta">
                    <span>Font: <strong>{tmpl.fontFamily}</strong></span>
                    <span>Theme: <strong>{theme.name}</strong></span>
                  </div>
                </div>
              ) : null}

              <div className="occasion-card-actions">
                <button
                  type="button"
                  className={`occasion-card-apply-btn${isApplied ? " is-applied" : ""}`}
                  onClick={() => handleToggleTemplate(tmpl)}
                  title={
                    isApplied
                      ? "Remove this preset"
                      : "Click to apply preset"
                  }
                >
                  {isApplied ? (
                    <>
                      <TrashIcon className="apply-btn-icon" />
                      <span>Remove Preset</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="apply-btn-icon" />
                      <span>Apply Preset</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
