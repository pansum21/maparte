import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import type { ResolvedTheme } from "../domain/types";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import { distanceToZoom } from "@/features/map/application/useMapSync";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/features/map/infrastructure/maplibreWorker";
import "./themeMapPreview.css";

interface ThemeMapPreviewProps {
  theme: ResolvedTheme;
  center: [lon: number, lat: number];
  mapOptions: Parameters<typeof generateMapStyle>[1];
}

/** A real, non-interactive MapLibre rendering used inside the theme picker. */
export default function ThemeMapPreview({
  theme,
  center,
  mapOptions,
}: ThemeMapPreviewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initialStyleRef = useRef<StyleSpecification | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const distanceMeters = Number(mapOptions.distanceMeters) || 4_000;

  const style = useMemo(
    () => generateMapStyle(theme, mapOptions),
    [mapOptions, theme],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!("IntersectionObserver" in window)) {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setNearViewport(entry.isIntersecting),
      { rootMargin: "0px", threshold: 0.01 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !nearViewport || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      const previewZoom = distanceToZoom(
        distanceMeters,
        center[1],
        Math.max(host.clientWidth, 120),
      );
      map = new maplibregl.Map({
        container: host,
        style,
        center,
        zoom: previewZoom,
        interactive: false,
        attributionControl: false,
        renderWorldCopies: false,
        fadeDuration: 0,
        pixelRatio: 1,
        maxCanvasSize: [1024, 1024],
        canvasContextAttributes: { preserveDrawingBuffer: false },
      });
    } catch (error) {
      console.warn("Theme map preview could not start WebGL:", error);
      setFailed(true);
      return;
    }

    mapRef.current = map;
    initialStyleRef.current = style;
    map.once("load", () => setLoaded(true));
    map.on("error", (event) => {
      const message = event.error?.message ?? "";
      if (/webgl|context lost|failed to initialize/i.test(message)) {
        setFailed(true);
      }
    });
    map.once("idle", () => setLoaded(true));

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      mapRef.current = null;
      initialStyleRef.current = null;
      map.remove();
      setLoaded(false);
    };
    // A MapLibre instance is created once per visible card; changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearViewport]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (initialStyleRef.current === style) {
      initialStyleRef.current = null;
      return;
    }
    setLoaded(false);
    setFailed(false);
    map.setStyle(style);
    map.once("idle", () => setLoaded(true));
  }, [style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const host = hostRef.current;
    const previewZoom = distanceToZoom(
      distanceMeters,
      center[1],
      Math.max(host?.clientWidth ?? 160, 120),
    );
    map.jumpTo({ center, zoom: previewZoom });
  }, [center, distanceMeters]);

  return (
    <div className="theme-map-preview" aria-hidden="true">
      <div className="theme-map-preview__canvas" ref={hostRef} />
      {!loaded && !failed ? <span className="theme-map-preview__loading" /> : null}
      {failed ? <span className="theme-map-preview__unavailable">Map preview unavailable</span> : null}
    </div>
  );
}
