import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_DISTANCE_METERS,
  MAX_DISTANCE_METERS,
  MAX_MAP_ZOOM,
  MIN_DISTANCE_METERS,
  MIN_MAP_ZOOM,
} from "@/core/config";
import { useMapSync } from "@/features/map/application/useMapSync";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { RotateIcon } from "@/shared/ui/Icons";

interface SearchedLocationInfo {
  lat: number;
  lon: number;
  distance: number;
}

export default function EditMapPanel() {
  const { state, dispatch, mapRef } = usePosterContext();
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);
  const [bearing, setBearing] = useState(0);
  const [zoom, setZoom] = useState(MIN_MAP_ZOOM);
  const searchedLocationRef = useRef<SearchedLocationInfo | null>(null);

  useEffect(() => {
    if (
      state.selectedLocation &&
      Number.isFinite(state.selectedLocation.lat) &&
      Number.isFinite(state.selectedLocation.lon)
    ) {
      searchedLocationRef.current = {
        lat: state.selectedLocation.lat,
        lon: state.selectedLocation.lon,
        distance: Number.parseFloat(state.form.distance) || DEFAULT_DISTANCE_METERS,
      };
    } else if (!searchedLocationRef.current) {
      const lat = Number.parseFloat(state.form.latitude);
      const lon = Number.parseFloat(state.form.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        searchedLocationRef.current = {
          lat,
          lon,
          distance: Number.parseFloat(state.form.distance) || DEFAULT_DISTANCE_METERS,
        };
      }
    }
  }, [state.selectedLocation, state.form.latitude, state.form.longitude, state.form.distance]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncBearing = () => {
      const normalized = Math.round(((map.getBearing() % 360) + 360) % 360);
      setBearing((previous) => (previous === 360 && normalized === 0 ? 360 : normalized));
    };
    const syncZoom = () => setZoom(map.getZoom());

    syncBearing();
    syncZoom();
    map.on("rotate", syncBearing);
    map.on("zoom", syncZoom);
    return () => {
      map.off("rotate", syncBearing);
      map.off("zoom", syncZoom);
    };
  }, [mapRef]);

  const distanceMeters = Math.max(
    MIN_DISTANCE_METERS,
    Math.min(MAX_DISTANCE_METERS, Number(state.form.distance) || DEFAULT_DISTANCE_METERS),
  );
  const distanceSliderValue = Math.round(
    ((Math.log(distanceMeters) - Math.log(MIN_DISTANCE_METERS)) /
      (Math.log(MAX_DISTANCE_METERS) - Math.log(MIN_DISTANCE_METERS))) * 1000,
  );
  const formatDistance = (meters: number) =>
    meters >= 1_000_000
      ? `${Number((meters / 1_000_000).toFixed(1))}M m`
      : meters >= 100_000
        ? `${Number((meters / 1_000).toFixed(1))}K m`
        : `${Math.round(meters).toLocaleString()} m`;

  const handleDistanceChange = (value: number) => {
    const ratio = value / 1000;
    const nextDistance = Math.round(
      Math.exp(
        Math.log(MIN_DISTANCE_METERS) +
          ratio * (Math.log(MAX_DISTANCE_METERS) - Math.log(MIN_DISTANCE_METERS)),
      ),
    );
    dispatch({ type: "SET_FIELD", name: "distance", value: String(nextDistance) });
  };

  const handleZoomChange = (value: number) => {
    mapRef.current?.zoomTo(value, { duration: 150 });
  };

  const handleRotationChange = (value: number) => {
    const nextBearing = Math.max(0, Math.min(360, value));
    setBearing(nextBearing);
    mapRef.current?.setBearing(nextBearing === 360 ? 0 : nextBearing);
  };

  const handleRecenter = () => {
    const fallbackDistance = Number.parseFloat(state.form.distance) || DEFAULT_DISTANCE_METERS;
    const target = searchedLocationRef.current ?? {
      lat: Number.parseFloat(state.form.latitude),
      lon: Number.parseFloat(state.form.longitude),
      distance: fallbackDistance,
    };
    if (!Number.isFinite(target.lat) || !Number.isFinite(target.lon)) return;

    mapRef.current?.setBearing(0);
    mapRef.current?.setPitch(0);
    setBearing(0);
    flyToLocation(target.lat, target.lon, false, target.distance);
    dispatch({
      type: "SET_FORM_FIELDS",
      fields: {
        latitude: target.lat.toFixed(6),
        longitude: target.lon.toFixed(6),
        distance: String(Math.round(target.distance)),
      },
    });
  };

  const handleReset = () => {
    setBearing(0);
    mapRef.current?.rotateTo(0, { duration: 300 });
  };

  return (
    <section className="desktop-edit-map-panel" aria-label="Edit Map controls">
      <div className="desktop-edit-map-panel__heading">
        <span className="desktop-edit-map-panel__eyebrow">MAP CONTROLS</span>
        <span className="desktop-edit-map-panel__hint">Adjust your view</span>
      </div>

      <div className="edit-map-control-section edit-map-control-section--horizontal" aria-label="Zoom">
        <span className="edit-map-title">ZOOM</span>
        <button type="button" className="edit-map-horizontal-step" onClick={() => handleZoomChange(Math.max(MIN_MAP_ZOOM, zoom - 0.5))} aria-label="Zoom out">−</button>
        <input type="range" className="edit-map-horizontal-slider" min={MIN_MAP_ZOOM} max={MAX_MAP_ZOOM} step="0.1" value={zoom} onChange={(event) => handleZoomChange(Number(event.target.value))} aria-label="Map zoom level" />
        <button type="button" className="edit-map-horizontal-step" onClick={() => handleZoomChange(Math.min(MAX_MAP_ZOOM, zoom + 0.5))} aria-label="Zoom in">+</button>
        <output className="edit-map-value-box">{zoom.toFixed(1)}</output>
      </div>

      <div className="edit-map-control-section edit-map-control-section--horizontal" aria-label="Distance">
        <span className="edit-map-title">DISTANCE</span>
        <input type="range" className="edit-map-horizontal-slider" min="0" max="1000" step="1" value={distanceSliderValue} onChange={(event) => handleDistanceChange(Number(event.target.value))} aria-label="Map distance" />
        <output className="edit-map-value-box edit-map-value-box--distance">{formatDistance(distanceMeters)}</output>
      </div>

      <div className="edit-map-control-section edit-map-control-section--horizontal" aria-label="Rotation">
        <span className="edit-map-title">ROTATION</span>
        <input type="range" className="edit-map-horizontal-slider" min="0" max="360" step="1" value={bearing} onChange={(event) => handleRotationChange(Number(event.target.value))} aria-label="Map rotation angle" />
        <button type="button" className="edit-map-value-box edit-map-value-box--button" onClick={() => handleRotationChange(0)} title="Reset rotation to north" aria-label={`Rotation ${bearing} degrees; click to reset`}>{bearing}°</button>
      </div>

      <div className="edit-map-bottom-actions">
        <button type="button" className="edit-map-action-pill edit-map-action-pill--recenter" onClick={handleRecenter} title="Recenter map to the selected place">
          <span className="edit-map-action-glyph" aria-hidden="true">⛶</span><span>Re-center</span>
        </button>
        <button type="button" className="edit-map-action-pill edit-map-action-pill--reset" onClick={handleReset} title="Reset rotation to north">
          <RotateIcon className="edit-map-action-icon" /><span>Reset</span>
        </button>
      </div>
    </section>
  );
}
