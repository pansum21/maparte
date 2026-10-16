import { useState } from "react";
import { usePosterContext } from "./PosterContext";
import {
  OCCASION_TEMPLATES,
  type OccasionTemplate,
} from "../domain/occasionTemplates";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { createMarkerItem } from "@/features/markers/infrastructure/helpers";
import { CheckIcon, SparklesIcon, TrashIcon } from "@/shared/ui/Icons";
import { DEFAULT_LAT, DEFAULT_LON } from "@/core/config";

interface TemplatesSectionProps {
  onTemplateApplied?: (template: OccasionTemplate) => void;
}

export default function TemplatesSection({
  onTemplateApplied,
}: TemplatesSectionProps) {
  const { state, dispatch } = usePosterContext();
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const hasMarkers = state.markers.length > 0;

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

  const handleToggleMarkerOnly = (template: OccasionTemplate) => {
    if (hasMarkers) {
      dispatch({ type: "CLEAR_MARKERS" });
    } else {
      const lat = Number(state.form.latitude) || DEFAULT_LAT;
      const lon = Number(state.form.longitude) || DEFAULT_LON;
      const marker = createMarkerItem({
        lat,
        lon,
        defaults: state.markerDefaults,
        iconId: template.markerIconId,
      });
      dispatch({ type: "ADD_MARKER", marker });
    }
  };

  return (
    <div className="occasion-templates-section" aria-label="Occasion Templates">
      <div className="occasion-templates-header">
        <div className="occasion-templates-title-row">
          <SparklesIcon className="occasion-templates-icon" />
          <h2 className="occasion-templates-title">Occasion Presets</h2>
        </div>
        <p className="occasion-templates-sub">
          1-Click designer templates. Click again to unclick or remove.
        </p>
      </div>

      {hasMarkers ? (
        <div className="template-marker-banner" role="status">
          <div className="marker-banner-info">
            <span className="marker-banner-icon" aria-hidden="true">💡</span>
            <span className="marker-banner-text">
              <strong>Marker Active:</strong> Drag it with your mouse to your exact street or house!
            </span>
          </div>
          <button
            type="button"
            className="template-clear-marker-pill"
            onClick={() => dispatch({ type: "CLEAR_MARKERS" })}
            title="Remove marker from map"
          >
            <TrashIcon className="btn-icon" />
            <span>Remove Marker</span>
          </button>
        </div>
      ) : null}

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

              <div className="occasion-card-actions">
                <button
                  type="button"
                  className={`occasion-card-apply-btn${isApplied ? " is-applied" : ""}`}
                  onClick={() => handleToggleTemplate(tmpl)}
                  title={
                    isApplied
                      ? "Click to remove preset and revert text"
                      : "Click to apply preset"
                  }
                >
                  {isApplied ? (
                    <>
                      <CheckIcon className="apply-btn-icon" />
                      <span>Applied • Click to Unapply</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="apply-btn-icon" />
                      <span>Apply Preset</span>
                    </>
                  )}
                </button>

                {isApplied ? (
                  <button
                    type="button"
                    className="occasion-card-marker-toggle-btn"
                    onClick={() => handleToggleMarkerOnly(tmpl)}
                    title={hasMarkers ? "Remove marker icon only" : "Place marker back on map"}
                  >
                    {hasMarkers ? "❌ Remove Marker Only" : "📍 Put Marker Back"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
