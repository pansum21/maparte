import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as maplibregl from "maplibre-gl";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/features/map/infrastructure/maplibreWorker";
import type { MapInstanceRef } from "@/features/map/domain/types";
import {
  MAP_CENTER_SYNC_EPSILON,
  MAP_ZOOM_SYNC_EPSILON,
} from "@/features/map/infrastructure";

/**
 * Apply style changes incrementally via setPaintProperty / setLayoutProperty
 * instead of calling setStyle() which triggers a full style diff.
 */
function applyIncrementalStyleUpdate(
  map: maplibregl.Map,
  prev: StyleSpecification,
  next: StyleSpecification,
): void {
  const prevLayerMap = new Map(
    prev.layers.map((l) => [l.id, l] as [string, LayerSpecification]),
  );

  for (const layer of next.layers) {
    const prevLayer = prevLayerMap.get(layer.id);
    if (!prevLayer) continue;

    // Diff paint properties
    const nextPaint = (layer as Record<string, unknown>).paint as
      | Record<string, unknown>
      | undefined;
    const prevPaint = (prevLayer as Record<string, unknown>).paint as
      | Record<string, unknown>
      | undefined;
    if (nextPaint) {
      for (const key of Object.keys(nextPaint)) {
        if (JSON.stringify(nextPaint[key]) !== JSON.stringify(prevPaint?.[key])) {
          map.setPaintProperty(layer.id, key as never, nextPaint[key] as never);
        }
      }
    }

    // Diff layout properties
    const nextLayout = (layer as Record<string, unknown>).layout as
      | Record<string, unknown>
      | undefined;
    const prevLayout = (prevLayer as Record<string, unknown>).layout as
      | Record<string, unknown>
      | undefined;
    if (nextLayout) {
      for (const key of Object.keys(nextLayout)) {
        if (
          JSON.stringify(nextLayout[key]) !== JSON.stringify(prevLayout?.[key])
        ) {
          map.setLayoutProperty(layer.id, key as never, nextLayout[key] as never);
        }
      }
    }

    // Diff minzoom / maxzoom
    const nextAny = layer as Record<string, unknown>;
    const prevAny = prevLayer as Record<string, unknown>;
    if (nextAny.minzoom !== prevAny.minzoom || nextAny.maxzoom !== prevAny.maxzoom) {
      map.setLayerZoomRange(
        layer.id,
        (nextAny.minzoom as number) ?? 0,
        (nextAny.maxzoom as number) ?? 24,
      );
    }
  }
}

const MAX_MAP_PIXEL_RATIO = 4;

/** Render the WebGL canvas at device resolution, including browser pinch zoom. */
function getMapPixelRatio(): number {
  const deviceRatio = window.devicePixelRatio || 1;
  const viewport = window.visualViewport;
  const layoutWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportScale =
    viewport && viewport.width > 0 ? layoutWidth / viewport.width : 1;
  const pageScale = Math.max(viewport?.scale ?? 1, viewportScale);
  return Math.min(MAX_MAP_PIXEL_RATIO, Math.max(1, deviceRatio * pageScale));
}

interface MapPreviewProps {
  style: StyleSpecification;
  center: [lon: number, lat: number];
  zoom: number;
  mapRef: MapInstanceRef;
  interactive?: boolean;
  allowRotation?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onMoveEnd?: (center: [number, number], zoom: number) => void;
  onMove?: (center: [number, number], zoom: number) => void;
  containerStyle?: CSSProperties;
  overzoomScale?: number;
  onMapReady?: (map: maplibregl.Map) => void;
}

/**
 * MapLibre preview wrapper.
 *
 * - Keeps `preserveDrawingBuffer` enabled for export snapshots.
 * - Syncs controlled style/center/zoom from form state.
 * - Exposes full map instance via a shared ref for export/controls.
 */
export default function MapPreview({
  style,
  center,
  zoom,
  mapRef,
  interactive = false,
  allowRotation = false,
  minZoom,
  maxZoom,
  onMoveEnd,
  onMove,
  containerStyle,
  overzoomScale = 1,
  onMapReady,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const isSyncing = useRef(false);
  const hasMountedStyleRef = useRef(false);
  const prevStyleRef = useRef<StyleSpecification | null>(null);
  const onMoveEndRef = useRef(onMoveEnd);
  const onMoveRef = useRef(onMove);
  onMoveEndRef.current = onMoveEnd;
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!containerRef.current) return;

    let map: maplibregl.Map;
    try {
      const mapOptions = {
        container: containerRef.current,
        style,
        center,
        zoom,
        minZoom: Math.max(-2, minZoom ?? -2),
        maxZoom: maxZoom ?? 22,
        interactive: false,
        attributionControl: false,
        pixelRatio: getMapPixelRatio(),
        maxCanvasSize: [4096, 8192] as [number, number],
        cancelPendingTileRequestsWhileZooming: true,
        preserveDrawingBuffer: true,
      };
      map = new maplibregl.Map(mapOptions as maplibregl.MapOptions);
      setMapUnavailable(false);
    } catch (error) {
      // MapLibre throws during construction when WebGL is unavailable. Catch it
      // here so the editor shell and its controls still render instead of
      // unmounting the entire React tree.
      console.error("Map preview could not start WebGL:", error);
      mapRef.current = null;
      setMapUnavailable(true);
      return;
    }

    mapRef.current = map;
    if (typeof window !== "undefined") {
      (window as any).map = map;
    }
    onMapReady?.(map);

    let isAutoSpinning = false;

    map.on("moveend", () => {
      if (isSyncing.current || isAutoSpinning) return;
      const currentCenter = map.getCenter();
      onMoveEndRef.current?.([currentCenter.lng, currentCenter.lat], map.getZoom());
    });
    map.on("move", () => {
      if (isSyncing.current || isAutoSpinning) return;
      const currentCenter = map.getCenter();
      onMoveRef.current?.([currentCenter.lng, currentCenter.lat], map.getZoom());
    });

    // Tell MapLibre to re-measure its canvas whenever the container resizes.
    // On mobile the container may start at 0 / partial size while CSS
    // aspect-ratio is still being resolved, so the initial render can be
    // blank.  This observer ensures the map repaints once the real
    // dimensions are known.
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    // Browser page zoom can enlarge the page without changing the map's CSS
    // size. Rebuild the WebGL backing canvas at the settled zoom resolution.
    let pixelRatioTimer: number | undefined;
    const syncPixelRatio = () => {
      window.clearTimeout(pixelRatioTimer);
      pixelRatioTimer = window.setTimeout(() => {
        const nextPixelRatio = getMapPixelRatio();
        if (Math.abs(map.getPixelRatio() - nextPixelRatio) > 0.05) {
          map.setPixelRatio(nextPixelRatio);
        }
        map.resize();
      }, 100);
    };
    window.addEventListener("resize", syncPixelRatio, { passive: true });
    window.visualViewport?.addEventListener("resize", syncPixelRatio, { passive: true });
    window.visualViewport?.addEventListener("scroll", syncPixelRatio, { passive: true });

    // Gentle, majestic planetary spin when zoomed out to Globe level (zoom < 4.5)
    let animationFrameId: number | undefined;
    let isUserInteracting = false;
    let resumeSpinTimeout: number | undefined;
    let wheelTimeout: number | undefined;

    const spinGlobe = () => {
      if (!mapRef.current) return;
      const currentZoom = map.getZoom();
      if (!isUserInteracting && !isSyncing.current && currentZoom < 4.5) {
        const current = map.getCenter();
        isAutoSpinning = true;
        map.jumpTo({ center: [current.lng + 0.02, current.lat] });
        isAutoSpinning = false;
      }
      animationFrameId = requestAnimationFrame(spinGlobe);
    };

    animationFrameId = requestAnimationFrame(spinGlobe);

    const onUserInteractStart = () => {
      isUserInteracting = true;
      window.clearTimeout(resumeSpinTimeout);
    };

    const onUserInteractEnd = () => {
      window.clearTimeout(resumeSpinTimeout);
      resumeSpinTimeout = window.setTimeout(() => {
        isUserInteracting = false;
      }, 1500);
    };

    const onWheel = () => {
      onUserInteractStart();
      window.clearTimeout(wheelTimeout);
      wheelTimeout = window.setTimeout(() => {
        onUserInteractEnd();
      }, 400);
    };

    map.on("mousedown", onUserInteractStart);
    map.on("touchstart", onUserInteractStart);
    map.on("wheel", onWheel);
    map.on("dragstart", onUserInteractStart);
    map.on("mouseup", onUserInteractEnd);
    map.on("touchend", onUserInteractEnd);
    map.on("dragend", onUserInteractEnd);



    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncPixelRatio);
      window.visualViewport?.removeEventListener("resize", syncPixelRatio);
      window.visualViewport?.removeEventListener("scroll", syncPixelRatio);
      window.clearTimeout(pixelRatioTimer);
      window.clearTimeout(resumeSpinTimeout);
      window.clearTimeout(wheelTimeout);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      mapRef.current = null;
      map.remove();
    };
    // Mount once; follow-up updates are handled by effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (interactive) {
      map.scrollZoom.enable();
      map.dragPan.enable({
        linearity: 0.3,
        easing: (t) => 1 - (1 - t) ** 3,
        maxSpeed: 1400,
        deceleration: 2500,
      });
      map.touchZoomRotate.enable();
      // Disable double click zoom so accidental rapid clicks never zoom the globe
      map.doubleClickZoom.disable();
      map.keyboard.enable();
      if (allowRotation) {
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
      } else {
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
      }
    } else {
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.touchZoomRotate.disable();
      map.doubleClickZoom.disable();
      map.keyboard.disable();
      map.touchZoomRotate.disableRotation();
      map.dragRotate.disable();
    }
  }, [interactive, allowRotation, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (typeof minZoom === "number") {
      map.setMinZoom(Math.max(-2, minZoom));
    }
    if (typeof maxZoom === "number") {
      map.setMaxZoom(maxZoom);
    }
  }, [minZoom, maxZoom, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Initial style is already provided in map constructor — record it and skip.
    if (!hasMountedStyleRef.current) {
      hasMountedStyleRef.current = true;
      prevStyleRef.current = style;
      return;
    }

    // If the map hasn't finished loading the initial style yet, queue a full setStyle.
    if (!map.isStyleLoaded()) {
      const applyWhenReady = () => {
        map.setStyle(style);
        prevStyleRef.current = style;
      };
      map.once("load", applyWhenReady);
      return () => {
        map.off("load", applyWhenReady);
      };
    }

    // Fast path: apply only the changed paint/layout/zoom properties directly,
    // avoiding a full setStyle diff and any risk of source re-initialisation.
    if (
      prevStyleRef.current &&
      JSON.stringify(prevStyleRef.current.sources) ===
        JSON.stringify(style.sources)
    ) {
      applyIncrementalStyleUpdate(map, prevStyleRef.current, style);
    } else {
      map.setStyle(style);
    }

    prevStyleRef.current = style;
  }, [style, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const centerDelta = Math.max(
      Math.abs(currentCenter.lng - center[0]),
      Math.abs(currentCenter.lat - center[1]),
    );
    const zoomDelta = Math.abs(map.getZoom() - zoom);

    if (
      centerDelta < MAP_CENTER_SYNC_EPSILON &&
      zoomDelta < MAP_ZOOM_SYNC_EPSILON
    ) {
      return;
    }

    isSyncing.current = true;

    // Cinematic Google Earth flight when switching location or selecting a city
    if (centerDelta > 0.05) {
      map.flyTo({
        center,
        zoom,
        essential: true,
        duration: 5200,
        curve: 1.35,
        speed: 0.55,
      });
      const onMoveEnd = () => {
        isSyncing.current = false;
        map.off('moveend', onMoveEnd);
      };
      map.once('moveend', onMoveEnd);
      return;
    }

    map.jumpTo({ center, zoom });
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [center, zoom, mapRef]);

  const normalizedOverzoomScale = Math.max(1, overzoomScale);
  const innerStyle: CSSProperties =
    normalizedOverzoomScale === 1
      ? { width: "100%", height: "100%" }
      : {
          width: `${normalizedOverzoomScale * 100}%`,
          height: `${normalizedOverzoomScale * 100}%`,
          transform: `scale(${1 / normalizedOverzoomScale})`,
          transformOrigin: "top left",
        };

  return (
    <div className="map-container" style={{ ...containerStyle, overflow: "hidden" }}>
      <div ref={containerRef} style={innerStyle} />
      {mapUnavailable ? (
        <div className="map-preview-unavailable" role="status">
          <strong>Map preview unavailable</strong>
          <span>This browser could not start WebGL. Enable hardware acceleration or try another browser.</span>
        </div>
      ) : null}
    </div>
  );
}
