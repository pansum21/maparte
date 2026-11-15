import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clamp } from "@/shared/geo/math";
import { reverseGeocodeCoordinates } from "@/core/services";
import type { MapInstanceRef } from "@/features/map/domain/types";
import type { SearchResult } from "@/features/location/domain/types";
import {
  MIN_DISTANCE_METERS,
  MAX_DISTANCE_METERS,
  EARTH_CIRCUMFERENCE_M,
  TILE_SIZE_PX,
  MIN_MAP_ZOOM,
  MAX_MAP_ZOOM,
  DEFAULT_CONTAINER_PX,
  FLY_TO_DURATION_MS,
} from "@/core/config";
import {
  MAP_OVERZOOM_SCALE,
  MIN_EFFECTIVE_CONTAINER_PX,
  MAX_OVERZOOM_SCALE,
} from "@/features/map/infrastructure/constants";

/**
 * Converts half-width distance (meters) to MapLibre zoom for a given latitude
 * and container width.
 */
export function distanceToZoom(
  distanceMeters: number,
  latDeg: number,
  containerPx: number,
): number {
  const phi = (Math.abs(latDeg) * Math.PI) / 180;
  const cosLat = Math.max(0.01, Math.cos(phi));
  const fullWidth = distanceMeters * 2;
  const zoom = Math.log2(
    (EARTH_CIRCUMFERENCE_M * cosLat * containerPx) / (fullWidth * TILE_SIZE_PX),
  );
  return clamp(zoom, MIN_MAP_ZOOM, MAX_MAP_ZOOM);
}

/**
 * Converts MapLibre zoom back to half-width distance (meters) for form sync.
 */
export function zoomToDistance(
  zoom: number,
  latDeg: number,
  containerPx: number,
): number {
  const phi = (Math.abs(latDeg) * Math.PI) / 180;
  const cosLat = Math.max(0.01, Math.cos(phi));
  const fullWidth =
    (EARTH_CIRCUMFERENCE_M * cosLat * containerPx) /
    (Math.pow(2, zoom) * TILE_SIZE_PX);

  return clamp(
    Math.round(fullWidth / 2),
    MIN_DISTANCE_METERS,
    MAX_DISTANCE_METERS,
  );
}

function resolveZoomBounds(
  latDeg: number,
  containerPx: number,
): { minZoom: number; maxZoom: number } {
  const minZoomFromDistance = distanceToZoom(
    MAX_DISTANCE_METERS,
    latDeg,
    containerPx,
  );
  const maxZoomFromDistance = distanceToZoom(
    MIN_DISTANCE_METERS,
    latDeg,
    containerPx,
  );

  return {
    minZoom: MIN_MAP_ZOOM,
    maxZoom: Math.max(minZoomFromDistance, maxZoomFromDistance),
  };
}

interface MapSyncState {
  form: { latitude: string; longitude: string; distance: string };
  displayNameOverrides: { city: boolean; country: boolean };
  selectedLocation: { label?: string; city?: string; country?: string; continent?: string } | null;
}

type MapSyncDispatch = (action: {
  type: "SET_FORM_FIELDS";
  fields: Partial<Record<string, string>>;
  resetDisplayNameOverrides?: boolean;
}) => void;

/**
 * Bidirectional synchronization between form fields and MapLibre view.
 */
export function useMapSync(
  state: MapSyncState,
  dispatch: MapSyncDispatch,
  mapRef: MapInstanceRef,
) {
  const { form } = state;
  const lastLocationLookupAtRef = useRef(0);
  const lastLookupCoordsRef = useRef<[number, number] | null>(null);
  const latestLocationLookupSeqRef = useRef(0);
  const skippedCoordinateLookupRef = useRef<string>("");
  const lastManualCoordinateLookupRef = useRef<string>("");
  const isFlyingRef = useRef(false);
  // Read selectedLocation without adding it to the coordinate effect's deps.
  // The effect should only re-run when lat/lon change (user typed coordinates),
  // not when selectedLocation changes (e.g. CLEAR_LOCATION) — otherwise clearing
  // a location immediately reverse-geocodes the same coords and refills the field.
  const selectedLocationRef = useRef(state.selectedLocation);
  selectedLocationRef.current = state.selectedLocation;
  // Read inside the reverse-geocode .then() below instead of closing over
  // `state.displayNameOverrides` — otherwise a lookup started before the user
  // edits Display City/Country can resolve afterward with the stale (false)
  // override flag and silently overwrite their edit (sometimes with an empty
  // string, if the reverse geocode has no city for that point).
  const displayNameOverridesRef = useRef(state.displayNameOverrides);
  displayNameOverridesRef.current = state.displayNameOverrides;

  const [containerPx, setContainerPx] = useState(DEFAULT_CONTAINER_PX);

  // Keep overzoomScale strictly at 1.0 so the map canvas is never shrunk via CSS transform scale,
  // ensuring roads inside the poster layout frame retain their full, bold, architectural width.
  const overzoomScale = 1;
  const effectiveContainerPx = containerPx;

  const setContainerWidth = useCallback((px: number) => {
    if (px <= 0) return;

    // Ignore sub-pixel jitter from ResizeObserver.
    setContainerPx((prev) => (Math.abs(prev - px) < 0.5 ? prev : px));
  }, []);

  const formLat = Number(form.latitude) || 0;
  const formLon = Number(form.longitude) || 0;
  const formDistance = clamp(
    Number(form.distance) || MIN_DISTANCE_METERS,
    MIN_DISTANCE_METERS,
    MAX_DISTANCE_METERS,
  );

  const mapZoomBounds = useMemo(
    () => resolveZoomBounds(formLat, effectiveContainerPx),
    [formLat, effectiveContainerPx],
  );

  const mapCenter = useMemo<[number, number]>(
    () => [formLon, formLat],
    [formLon, formLat],
  );

  const mapZoom = useMemo(
    () =>
      clamp(
        distanceToZoom(formDistance, formLat, effectiveContainerPx),
        mapZoomBounds.minZoom,
        mapZoomBounds.maxZoom,
      ),
    [formDistance, formLat, effectiveContainerPx, mapZoomBounds],
  );

  const lookupTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (lookupTimerRef.current) {
        window.clearTimeout(lookupTimerRef.current);
      }
    };
  }, []);

  const updateLocationFromCoordinates = useCallback(
    (lat: number, lon: number) => {
      const now = Date.now();
      const previous = lastLookupCoordsRef.current;
      const movedEnough =
        !previous ||
        Math.abs(previous[0] - lat) >= 0.002 ||
        Math.abs(previous[1] - lon) >= 0.002;
      if (!movedEnough) {
        return;
      }

      lastLookupCoordsRef.current = [lat, lon];
      lastLocationLookupAtRef.current = now;
      const lookupSeq = ++latestLocationLookupSeqRef.current;

      void reverseGeocodeCoordinates(lat, lon)
        .then((nearest) => {
          if (lookupSeq !== latestLocationLookupSeqRef.current) {
            return;
          }
          const fallbackLabel = String(nearest.label ?? "").trim();
          const nextCity = String(nearest.city ?? "").trim() || fallbackLabel.split(",")[0].trim();
          const nextCountry = String(nearest.country ?? "").trim();
          const nextContinent = String(nearest.continent ?? "").trim();
          const nextLocation =
            [nextCity, nextCountry].filter(Boolean).join(", ") || fallbackLabel;

          if (!nextLocation) {
            return;
          }

          const nextSearchResult: SearchResult = {
            id: `coord:${lat.toFixed(4)},${lon.toFixed(4)}`,
            label: nextLocation,
            city: nextCity,
            country: nextCountry,
            continent: nextContinent,
            lat,
            lon,
          };

          dispatch({
            type: "SET_FORM_FIELDS",
            selectedLocation: nextSearchResult,
            fields: {
              ...(state.isLocationFocused ? {} : { location: nextLocation }),
              displayContinent: nextContinent,
              ...(!displayNameOverridesRef.current.city && nextCity
                ? { displayCity: nextCity }
                : {}),
              ...(!displayNameOverridesRef.current.country && nextCountry
                ? { displayCountry: nextCountry }
                : {}),
            },
          });
        })
        .catch(() => {
          // Ignore lookup failures; coordinates stay authoritative.
        });
    },
    [dispatch, state.isLocationFocused],
  );

  const handleMove = useCallback(
    (_center: [number, number]) => {
      // Reverse geocode is deferred to handleMoveEnd to avoid firing on every frame.
    },
    [],
  );

  const handleMoveEnd = useCallback(
    (center: [number, number], zoom: number) => {
      const [lon, lat] = center;
      const bounds = resolveZoomBounds(lat, effectiveContainerPx);
      const boundedZoom = clamp(zoom, bounds.minZoom, bounds.maxZoom);
      const rawDistance = zoomToDistance(boundedZoom, lat, effectiveContainerPx);
      // Preserve top opening distance (50 Million meters) when at global Earth overview
      const distance = boundedZoom <= 0.2 ? Math.max(50_000_000, rawDistance) : rawDistance;
      skippedCoordinateLookupRef.current = `${lat.toFixed(6)},${lon.toFixed(6)}`;

      dispatch({
        type: "SET_FORM_FIELDS",
        fields: {
          latitude: lat.toFixed(6),
          longitude: lon.toFixed(6),
          distance: String(Math.round(distance)),
        },
      });

      if (!isFlyingRef.current && (distance <= 2_500_000 || boundedZoom >= 3.5)) {
        if (lookupTimerRef.current) {
          window.clearTimeout(lookupTimerRef.current);
        }
        lookupTimerRef.current = window.setTimeout(() => {
          updateLocationFromCoordinates(lat, lon);
        }, 350);
      }
    },
    [dispatch, effectiveContainerPx, updateLocationFromCoordinates],
  );

  useEffect(() => {
    const latText = String(form.latitude ?? "").trim();
    const lonText = String(form.longitude ?? "").trim();
    if (!latText || !lonText || selectedLocationRef.current) {
      return;
    }

    const lat = Number(latText);
    const lon = Number(lonText);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    const coordinateKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    if (skippedCoordinateLookupRef.current === coordinateKey) {
      skippedCoordinateLookupRef.current = "";
      return;
    }
    if (lastManualCoordinateLookupRef.current === coordinateKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastManualCoordinateLookupRef.current = coordinateKey;
      updateLocationFromCoordinates(lat, lon);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form.latitude, form.longitude, updateLocationFromCoordinates]);

  const flyToLocation = useCallback(
    (lat: number, lon: number, keepCurrentZoom = false, targetDistance?: number) => {
      const bounds = resolveZoomBounds(lat, effectiveContainerPx);
      const dist = targetDistance ?? formDistance;
      const zoom = keepCurrentZoom
        ? clamp(mapRef.current?.getZoom() ?? mapZoom, bounds.minZoom, bounds.maxZoom)
        : clamp(
            distanceToZoom(dist, lat, effectiveContainerPx),
            bounds.minZoom,
            bounds.maxZoom,
          );

      lastLookupCoordsRef.current = [lat, lon];
      lastLocationLookupAtRef.current = Date.now();
      isFlyingRef.current = true;

      mapRef.current?.flyTo({
        center: [lon, lat],
        zoom,
        duration: 5200,
        curve: 1.45,
        speed: 0.7,
        essential: true,
      });

      const map = mapRef.current;
      if (map) {
        const onEnd = () => {
          isFlyingRef.current = false;
        };
        map.once("moveend", onEnd);
      }
    },
    [mapRef, formDistance, effectiveContainerPx, mapZoom],
  );

  return {
    mapCenter,
    mapZoom,
    mapMinZoom: mapZoomBounds.minZoom,
    mapMaxZoom: mapZoomBounds.maxZoom,
    handleMove,
    handleMoveEnd,
    flyToLocation,
    setContainerWidth,
    overzoomScale,
  };
}
