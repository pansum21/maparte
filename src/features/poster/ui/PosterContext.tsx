import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  posterReducer,
  type PosterState,
  type PosterAction,
  type PosterForm,
} from "../application/posterReducer";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { applyThemeColorOverrides } from "@/features/theme/domain/colorPaths";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import type { StyleSpecification } from "maplibre-gl";
import type { MapInstanceRef } from "@/features/map/domain/types";
import type { MarkerItem } from "@/features/markers/domain/types";
import type { Route } from "@/features/routes/domain/types";
import type { Coordinate } from "@/shared/geo/types";
import { createDefaultMarkerSettings } from "@/features/markers/infrastructure/helpers";
import {
  loadCustomMarkerIcons,
  saveCustomMarkerIcons,
} from "@/features/markers/infrastructure/customIconStorage";
import { createDefaultRouteSettings } from "@/features/routes/infrastructure/helpers";

/* ────── Default form (moved from appConfig) ────── */

import {
  defaultLayoutId,
  getLayoutOption,
} from "@/features/layout/infrastructure/layoutRepository";
import { defaultThemeName } from "@/features/theme/infrastructure/themeRepository";
import {
  DEFAULT_POSTER_WIDTH_CM,
  DEFAULT_POSTER_HEIGHT_CM,
  DEFAULT_DISTANCE_METERS,
  DEFAULT_LAT,
  DEFAULT_LON,
  DEFAULT_CITY,
  DEFAULT_COUNTRY,
} from "@/core/config";

import { resolveCityFromUrl, findCityMatch } from "@/features/location/domain/cityRouteResolver";
import { parsePosterStateFromUrl, serializePosterStateToUrl } from "@/features/poster/application/posterUrlSync";

const defaultLayoutOption = getLayoutOption(defaultLayoutId);
const defaultLayoutWidthCm = Number(
  defaultLayoutOption?.widthCm ?? DEFAULT_POSTER_WIDTH_CM,
);
const defaultLayoutHeightCm = Number(
  defaultLayoutOption?.heightCm ?? DEFAULT_POSTER_HEIGHT_CM,
);
const DEFAULT_LOCATION_LABEL = "Dehradun, Uttarakhand, India";

export const DEFAULT_FORM: PosterForm = {
  location: "",
  latitude: DEFAULT_LAT.toFixed(6),
  longitude: DEFAULT_LON.toFixed(6),
  distance: String(DEFAULT_DISTANCE_METERS),
  width: String(defaultLayoutWidthCm),
  height: String(defaultLayoutHeightCm),
  theme: defaultThemeName,
  layout: defaultLayoutId,
  displayCity: DEFAULT_CITY,
  displayTown: "",
  displayCountry: DEFAULT_COUNTRY,
  displayContinent: "Asia",
  customDate: "",
  fontFamily: "",
  fontSize: "16",
  showPosterText: true,
  includeCredits: true,
  includeLandcover: true,
  includeBuildings: false,
  includeWater: true,
  includeParks: true,
  includeAeroway: true,
  includeRail: true,
  includeRoads: true,
  includeRoadPath: true,
  includeRoadMinorLow: true,
  includeRoadOutline: true,
  showMarkers: true,
  showRoutes: true,
  mapShape: "full",
  shapeFinish: "shadow",
};

function getInitialState(readUrlState = true): PosterState {
  let form = { ...DEFAULT_FORM };
  let selectedLocation = null;

  if (readUrlState && typeof window !== "undefined") {
    const matched = resolveCityFromUrl(window.location.pathname, window.location.search);
    if (matched) {
      form = {
        ...DEFAULT_FORM,
        location: `${matched.city}, ${matched.country}`,
        displayCity: matched.city,
        displayCountry: matched.country,
        displayContinent: matched.continent,
        latitude: matched.lat.toFixed(6),
        longitude: matched.lon.toFixed(6),
        distance: String(matched.distanceMeters || DEFAULT_DISTANCE_METERS),
      };
      selectedLocation = {
        id: `city:${matched.slug}`,
        label: `${matched.city}, ${matched.country}`,
        lat: matched.lat,
        lon: matched.lon,
        city: matched.city,
        country: matched.country,
        continent: matched.continent,
      };
    }
    const urlOverrides = parsePosterStateFromUrl(window.location.search);
    if (Object.keys(urlOverrides).length > 0) {
      form = {
        ...form,
        ...urlOverrides,
      };
      if (urlOverrides.latitude && urlOverrides.longitude && !matched) {
        selectedLocation = {
          id: `custom:${urlOverrides.latitude},${urlOverrides.longitude}`,
          label: urlOverrides.displayCity || "Custom Location",
          lat: Number(urlOverrides.latitude),
          lon: Number(urlOverrides.longitude),
          city: urlOverrides.displayCity || "",
          country: urlOverrides.displayCountry || "",
          continent: "",
        };
      }
    }
  }

  const initialMarkers: MarkerItem[] = [];
  const initialRoutes: Route[] = [];

  if (readUrlState && typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const markerParam = urlParams.get("marker");
    const routeParam = urlParams.get("route");
    const markerColor = urlParams.get("markerColor");

    if (markerParam) {
      const lat = Number(form.latitude) || 0;
      const lon = Number(form.longitude) || 0;
      const resolvedColor =
        markerColor ||
        (markerParam === "heart"
          ? "#e11d48"
          : markerParam === "ring"
            ? "#d97706"
            : markerParam === "runner"
              ? "#0284c7"
              : markerParam === "home"
                ? "#059669"
                : markerParam === "hospital"
                  ? "#ec4899"
                  : markerParam === "mountain"
                    ? "#4f46e5"
                    : markerParam === "plane"
                      ? "#d97706"
                      : "#e11d48");

      initialMarkers.push({
        id: "preset-marker-spot",
        lat,
        lon,
        iconId: markerParam,
        size: 38,
        color: resolvedColor,
      });
      form.showMarkers = true;
    }

    if (routeParam) {
      let coords: Coordinate[] = [];
      if (routeParam === "marathon") {
        coords = [
          { lon: -71.1800, lat: 42.3300 },
          { lon: -71.1550, lat: 42.3360 },
          { lon: -71.1350, lat: 42.3420 },
          { lon: -71.1100, lat: 42.3460 },
          { lon: -71.0920, lat: 42.3485 },
          { lon: -71.0825, lat: 42.3496 },
        ];
      } else if (routeParam === "travel" || routeParam === "kyoto") {
        coords = [
          { lon: 135.7350, lat: 35.0350 },
          { lon: 135.7520, lat: 35.0220 },
          { lon: 135.7681, lat: 35.0116 },
          { lon: 135.7760, lat: 34.9980 },
          { lon: 135.7720, lat: 34.9780 },
        ];
      } else if (routeParam === "hometown" || routeParam === "dehradun") {
        coords = [
          { lon: 78.0200, lat: 30.3050 },
          { lon: 78.0320, lat: 30.3160 },
          { lon: 78.0437, lat: 30.3256 },
          { lon: 78.0580, lat: 30.3420 },
          { lon: 78.0720, lat: 30.3650 },
        ];
      } else if (routeParam === "summit" || routeParam === "mountain") {
        coords = [
          { lon: 6.8694, lat: 45.9237 },
          { lon: 6.8580, lat: 45.9020 },
          { lon: 6.8450, lat: 45.8750 },
          { lon: 6.8520, lat: 45.8500 },
          { lon: 6.8643, lat: 45.8326 },
        ];
      }
      if (coords.length > 0) {
        initialRoutes.push({
          id: "preset-route-line",
          label: "Preset Route",
          source: "manual",
          segments: [coords],
          color:
            markerColor ||
            (routeParam === "marathon"
              ? "#0284c7"
              : routeParam === "travel" || routeParam === "kyoto"
                ? "#d97706"
                : routeParam === "hometown" || routeParam === "dehradun"
                  ? "#ea580c"
                  : "#4f46e5"),
          strokeWidth: 4,
          opacity: 0.95,
          lineStyle: "solid",
          visible: true,
          showEndpoints: true,
          startMarker: { iconId: "circle", color: "#ffffff", size: 14 },
          finishMarker: { iconId: "flag", color: "#e11d48", size: 18 },
        });
        form.showRoutes = true;
      }
    }
  }

  return {
    form,
    customColors: {},
    markers: initialMarkers,
    customMarkerIcons: [],
    markerDefaults: {
      ...createDefaultMarkerSettings(),
      color: getTheme(defaultThemeName).ui.text,
    },
    isMarkerEditorActive: false,
    activeMarkerId: null,
    routes: initialRoutes,
    routeDefaults: {
      ...createDefaultRouteSettings(),
      color: getTheme(defaultThemeName).ui.text,
    },
    error: "",
    isExporting: false,
    isLocationFocused: false,
    selectedLocation,
    userLocation: null,
    showGrid: false,
    displayNameOverrides: {
      city: Boolean(readUrlState && typeof window !== "undefined" && parsePosterStateFromUrl(window.location.search).displayCity),
      country: false,
    },
  };
}

const INITIAL_STATE: PosterState = getInitialState();

export function createDefaultPosterState(): PosterState {
  return getInitialState(false);
}

/* ────── Context shapes ────── */

interface PosterDispatchContextValue {
  dispatch: React.Dispatch<PosterAction>;
}

const PosterDispatchContext = createContext<PosterDispatchContextValue | null>(null);

interface PosterContextValue {
  state: PosterState;
  dispatch: React.Dispatch<PosterAction>;
  selectedTheme: ResolvedTheme;
  effectiveTheme: ResolvedTheme;
  mapStyle: StyleSpecification;
  mapRef: MapInstanceRef;
}

const PosterContext = createContext<PosterContextValue | null>(null);

/* ────── Provider ────── */

export function PosterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posterReducer, INITIAL_STATE);
  const mapRef = useRef(null) as MapInstanceRef;
  const lastSyncedMarkerThemeColorRef = useRef<string | null>(null);
  const lastSyncedRouteThemeColorRef = useRef<string | null>(null);
  const hasLoadedCustomIconsRef = useRef(false);

  // The map opens on the DEFAULT_FORM coordinates. Reading the visitor's
  // position here would raise a permission prompt nobody asked for, so
  // locating stays behind the "use my location" control.

  const selectedTheme = useMemo(
    () => getTheme(state.form.theme),
    [state.form.theme],
  );

  const effectiveTheme = useMemo(() => {
    const colors = { ...state.customColors };
    if (state.form.posterTextColor) colors["ui.text"] = state.form.posterTextColor;
    return Object.keys(colors).length ? applyThemeColorOverrides(selectedTheme, colors) : selectedTheme;
  }, [selectedTheme, state.customColors, state.form.posterTextColor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUrlChange = () => {
      const matched = resolveCityFromUrl(window.location.pathname, window.location.search);
      if (matched) {
        dispatch({
          type: "SELECT_LOCATION",
          location: {
            id: `city:${matched.slug}`,
            label: `${matched.city}, ${matched.country}`,
            lat: matched.lat,
            lon: matched.lon,
            city: matched.city,
            country: matched.country,
            continent: matched.continent,
          },
        });
        if (matched.distanceMeters) {
          dispatch({
            type: "SET_FORM_FIELDS",
            fields: { distance: String(matched.distanceMeters) },
          });
        }
      }
      const overrides = parsePosterStateFromUrl(window.location.search);
      if (Object.keys(overrides).length > 0) {
        if (overrides.theme) {
          dispatch({ type: "SET_THEME", themeId: overrides.theme });
        }
        dispatch({
          type: "SET_FORM_FIELDS",
          fields: overrides as Partial<PosterForm>,
        });
      }
    };

    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, [dispatch]);

  // Synchronize browser address bar URL and title when city or customization changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const city = state.selectedLocation?.city || state.form.displayCity || state.form.location;
    const country = state.selectedLocation?.country || state.form.displayCountry;
    const matched = findCityMatch(city, country);

    const { fullUrl } = serializePosterStateToUrl(state.form, matched);
    const currentFullUrl = `${window.location.pathname}${window.location.search}`;

    if (currentFullUrl !== fullUrl) {
      window.history.replaceState({ citySlug: matched?.slug }, "", fullUrl);
    }

    if (matched) {
      document.title = `${matched.city} Map Poster & Wall Art | MAPARTE`;
    } else {
      document.title = "MAPARTE | Custom Map Poster & Wallpaper Creator";
    }
  }, [
    state.form.displayCity,
    state.form.displayCountry,
    state.form.displayState,
    state.form.location,
    state.form.theme,
    state.form.layout,
    state.form.fontFamily,
    state.form.customDate,
    state.form.distance,
    state.form.showPosterText,
    state.form.overlayTop,
    state.form.overlayBottom,
    state.form.posterTextColor,
  ]);

  useEffect(() => {
    const markerThemeColor = effectiveTheme.ui.text;
    const previouslySynced = lastSyncedMarkerThemeColorRef.current;

    if (previouslySynced === markerThemeColor) {
      return;
    }

    lastSyncedMarkerThemeColorRef.current = markerThemeColor;
    dispatch({
      type: "SET_MARKER_DEFAULTS",
      defaults: { color: markerThemeColor },
      applyToMarkers: true,
    });
  }, [dispatch, effectiveTheme.ui.text]);

  useEffect(() => {
    const routeThemeColor = effectiveTheme.ui.text;
    if (lastSyncedRouteThemeColorRef.current === routeThemeColor) {
      return;
    }
    lastSyncedRouteThemeColorRef.current = routeThemeColor;
    dispatch({
      type: "SET_ROUTE_DEFAULTS",
      defaults: { color: routeThemeColor },
      applyToRoutes: true,
    });
  }, [dispatch, effectiveTheme.ui.text]);

  useEffect(() => {
    let isCancelled = false;

    void loadCustomMarkerIcons()
      .then((icons) => {
        if (isCancelled) {
          return;
        }
        hasLoadedCustomIconsRef.current = true;
        dispatch({ type: "SET_CUSTOM_MARKER_ICONS", icons });
      })
      .catch(() => {
        hasLoadedCustomIconsRef.current = true;
        // Ignore storage read failures.
      });

    return () => {
      isCancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!hasLoadedCustomIconsRef.current) {
      return;
    }
    void saveCustomMarkerIcons(state.customMarkerIcons).catch(() => {
      // Ignore storage write failures.
    });
  }, [state.customMarkerIcons]);

  const mapStyle = useMemo(
    () =>
      generateMapStyle(effectiveTheme, {
        includeLandcover: state.form.includeLandcover,
        includeBuildings: state.form.includeBuildings,
        includeWater: state.form.includeWater,
        includeParks: state.form.includeParks,
        includeAeroway: state.form.includeAeroway,
        includeRail: state.form.includeRail,
        includeRoads: state.form.includeRoads,
        includeRoadPath: state.form.includeRoadPath,
        includeRoadMinorLow: state.form.includeRoadMinorLow,
        includeRoadOutline: state.form.includeRoadOutline,
        distanceMeters: Number(state.form.distance),
      }),
    [
      effectiveTheme,
      state.form.includeLandcover,
      state.form.includeBuildings,
      state.form.includeWater,
      state.form.includeParks,
      state.form.includeAeroway,
      state.form.includeRail,
      state.form.includeRoads,
      state.form.includeRoadPath,
      state.form.includeRoadMinorLow,
      state.form.includeRoadOutline,
      state.form.distance,
    ],
  );

  const dispatchValue = useMemo<PosterDispatchContextValue>(
    () => ({ dispatch }),
    [dispatch],
  );

  const value = useMemo<PosterContextValue>(
    () => ({
      state,
      dispatch,
      selectedTheme,
      effectiveTheme,
      mapStyle,
      mapRef,
    }),
    [state, selectedTheme, effectiveTheme, mapStyle],
  );

  return (
    <PosterDispatchContext.Provider value={dispatchValue}>
      <PosterContext.Provider value={value}>{children}</PosterContext.Provider>
    </PosterDispatchContext.Provider>
  );
}

/* ────── Hook ────── */

export function usePosterContext(): PosterContextValue {
  const ctx = useContext(PosterContext);
  if (!ctx) {
    throw new Error("usePosterContext must be used within a PosterProvider");
  }
  return ctx;
}

export function usePosterDispatch(): PosterDispatchContextValue {
  const ctx = useContext(PosterDispatchContext);
  if (!ctx) {
    throw new Error("usePosterDispatch must be used within a PosterProvider");
  }
  return ctx;
}
