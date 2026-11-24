import { useEffect, useRef, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MapInstanceRef } from "@/features/map/domain/types";
import type { Route } from "@/features/routes/domain/types";
import { drawRoutesWithProjector } from "@/features/routes/infrastructure/rendering";

interface RouteOverlayProps {
  routes: Route[];
  mapRef: MapInstanceRef;
  /** Map instance once it exists. Passing it makes the listeners attach after the map is ready. */
  mapInstance?: MaplibreMap | null;
  visible: boolean;
  overzoomScale: number;
}

export default function RouteOverlay({
  routes,
  mapRef,
  mapInstance,
  visible,
  overzoomScale,
}: RouteOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  useEffect(() => {
    const map = mapInstance ?? mapRef.current;
    if (!map) return;

    const sync = () => setRenderTick((value) => value + 1);

    map.on("move", sync);
    map.on("moveend", sync);
    map.on("rotate", sync);
    map.on("resize", sync);
    map.on("load", sync);
    // Draw once right away: the map may already be loaded and fire no event.
    sync();

    return () => {
      map.off("move", sync);
      map.off("moveend", sync);
      map.off("rotate", sync);
      map.off("resize", sync);
      map.off("load", sync);
    };
  }, [mapRef, mapInstance]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setRenderTick((value) => value + 1);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const map = mapInstance ?? mapRef.current;
    if (!canvas || !container || !map) return;

    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;
    if (cssWidth <= 0 || cssHeight <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (!visible || routes.length === 0) return;

    drawRoutesWithProjector(
      ctx,
      routes,
      (lat, lon) => {
        try {
          const point = map.project([lon, lat]);
          return {
            x: point.x / overzoomScale,
            y: point.y / overzoomScale,
          };
        } catch {
          return null;
        }
      },
    );
  }, [mapRef, mapInstance, routes, visible, overzoomScale, renderTick]);

  return (
    <div
      ref={containerRef}
      className="poster-route-overlay"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="poster-route-canvas" />
    </div>
  );
}
