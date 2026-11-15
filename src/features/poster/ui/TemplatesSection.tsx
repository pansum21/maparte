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
import {
  fetchRoadRoute,
  createCurvedFlightArc,
} from "@/features/routes/infrastructure/osrmRouter";
import { createRouteFromCoordinates } from "@/features/routes/infrastructure/helpers";
import type { RouteDefaults } from "@/features/routes/domain/types";

async function generateTemplateRoute(
  templateId: string,
  lat: number,
  lon: number,
  routeDefaults: RouteDefaults,
  markerColor?: string,
) {
  if (templateId === "marathon_race") {
    // 42.195 KM Marathon road course snapped to real roads
    const waypoints = [
      { lat: lat - 0.012, lon: lon - 0.015 },
      { lat: lat + 0.018, lon: lon - 0.012 },
      { lat: lat + 0.022, lon: lon + 0.015 },
      { lat: lat - 0.010, lon: lon + 0.012 },
    ];
    const road = await fetchRoadRoute(waypoints, "walking");
    return createRouteFromCoordinates({
      coordinates: road.coordinates,
      defaults: routeDefaults,
      label: "42.195 KM Official Marathon Course",
      source: "manual",
      color: markerColor || "#ef4444",
      lineStyle: "solid",
      strokeWidth: 3.5,
      startIconId: "runner",
      finishIconId: "finish_flag",
    });
  }

  if (templateId === "mountain_summit") {
    // Hiking trail to mountain summit
    const waypoints = [
      { lat: lat - 0.025, lon: lon - 0.015 },
      { lat: lat - 0.008, lon: lon + 0.005 },
      { lat, lon },
    ];
    const trail = await fetchRoadRoute(waypoints, "walking");
    return createRouteFromCoordinates({
      coordinates: trail.coordinates,
      defaults: routeDefaults,
      label: "Summit Alpine Trail Ascent",
      source: "manual",
      color: markerColor || "#06b6d4",
      lineStyle: "solid",
      strokeWidth: 3,
      startIconId: "compass",
      finishIconId: "flag",
    });
  }

  if (templateId === "hometown_roots") {
    // Scenic heritage road trip
    const waypoints = [
      { lat: lat - 0.018, lon: lon - 0.015 },
      { lat: lat + 0.015, lon: lon + 0.018 },
    ];
    const road = await fetchRoadRoute(waypoints, "driving");
    return createRouteFromCoordinates({
      coordinates: road.coordinates,
      defaults: routeDefaults,
      label: "Scenic Hometown Route",
      source: "manual",
      color: markerColor || "#10b981",
      lineStyle: "solid",
      strokeWidth: 3.5,
      startIconId: "tree",
      finishIconId: "home",
    });
  }

  if (templateId === "travel_memories") {
    // High-altitude curved geodesic flight arc
    const origin = { lat: lat - 0.05, lon: lon - 0.08 };
    const dest = { lat: lat + 0.05, lon: lon + 0.07 };
    const flightArc = createCurvedFlightArc(origin, dest, 50, 0.25);
    return createRouteFromCoordinates({
      coordinates: flightArc,
      defaults: routeDefaults,
      label: "Air Travel Journey Arc",
      source: "manual",
      color: markerColor || "#d97706",
      lineStyle: "dashed",
      strokeWidth: 3,
      startIconId: "plane",
      finishIconId: "heart",
    });
  }

  return null;
}

interface TemplatesSectionProps {
  onTemplateApplied?: (template: OccasionTemplate) => void;
}

export default function TemplatesSection({
  onTemplateApplied,
}: TemplatesSectionProps) {
  const { state, dispatch } = usePosterContext();
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

  const handleToggleTemplate = async (template: OccasionTemplate) => {
    // If already active, toggle OFF / unclick!
    if (appliedId === template.id) {
      setAppliedId(null);
      dispatch({ type: "CLEAR_MARKERS" });
      dispatch({ type: "CLEAR_ROUTES" });
      dispatch({ type: "SET_FIELD", name: "showRoutes", value: false });

      // Restore standard location names
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
          presetTitle: "",
          presetSubtitle: "",
          presetExtra: "",
          displayCity: defaultCity,
          displayCountry: defaultCountry,
        },
      });
      return;
    }

    // Apply new template
    // 1. Update theme
    dispatch({ type: "SET_THEME", themeId: template.themeId });

    // 2. Update typography, text overlay 
    dispatch({
      type: "SET_FORM_FIELDS",
      resetDisplayNameOverrides: false,
      fields: {
        fontFamily: template.fontFamily,
        textMode: "preset",
        presetTitle: template.cityText,
        presetSubtitle: template.countryText,
        presetExtra: "",
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
      defaults: {
        ...state.markerDefaults,
        color: template.markerColor || state.markerDefaults.color,
      },
      iconId: template.markerIconId,
    });

    dispatch({ type: "CLEAR_MARKERS" });
    dispatch({ type: "ADD_MARKER", marker });

    // 4. Generate street-snapped or curved flight route for motion templates
    const route = await generateTemplateRoute(
      template.id,
      lat,
      lon,
      state.routeDefaults,
      template.markerColor,
    );

    if (route) {
      dispatch({ type: "REPLACE_ROUTES", routes: [route] });
      dispatch({ type: "SET_FIELD", name: "showRoutes", value: true });
    } else {
      dispatch({ type: "CLEAR_ROUTES" });
      dispatch({ type: "SET_FIELD", name: "showRoutes", value: false });
    }

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
                <div className="occasion-card-meta-row">
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
