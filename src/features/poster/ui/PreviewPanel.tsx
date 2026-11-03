import MapShapeDefs from "@/features/layout/ui/MapShapeDefs";
import { MAP_SHAPES } from "@/features/layout/domain/shapeTypes";
import { resolvePosterLabels, getActivePosterLabels } from "@/features/poster/domain/textLayout";
import {
  useCallback,
  useEffect,
  lazy,
  useMemo,
  useRef,
  useState,
  Suspense,
  type CSSProperties,
} from "react";
import { usePosterContext } from "./PosterContext";
import AdUnit from "@/shared/ui/AdUnit";
import { AD_SLOT_SIDEBAR, ADS_SIDEBAR_ENABLED } from "@/core/config";
import { useMapSync } from "@/features/map/application/useMapSync";
const MapPreview = lazy(() => import("@/features/map/ui/MapPreview"));
import MarkerOverlay from "@/features/markers/ui/MarkerOverlay";
import RouteOverlay from "@/features/routes/ui/RouteOverlay";
import RouteEndpointsOverlay from "@/features/routes/ui/RouteEndpointsOverlay";
import GradientFades from "./GradientFades";
import PosterTextOverlay from "./PosterTextOverlay";
import PosterGridOverlay from "./PosterGridOverlay";
import { GridIcon } from "@/shared/ui/Icons";
import SettingsInfo from "./SettingsInfo";
import {
  PlusIcon,
  MinusIcon,
  RotateIcon,
  RotateLeftIcon,
  RotateRightIcon,
} from "@/shared/ui/Icons";
import {
  MAP_BUTTON_ZOOM_DURATION_MS,
  MAP_BUTTON_ZOOM_STEP,
} from "@/features/map/infrastructure";
import {
  DEFAULT_POSTER_WIDTH_CM,
  DEFAULT_POSTER_HEIGHT_CM,
} from "@/core/config";
import { ensureFont } from "@/core/services";
import {
  createCustomLayoutOption,
  formatLayoutDimensions,
  getLayoutOption,
} from "@/features/layout/infrastructure/layoutRepository";
import { formatLayoutCm } from "@/features/layout/domain/layoutMatcher";
import { resolveCanvasSize } from "@/features/poster/infrastructure/renderer/canvas";
import {
  NeatlineArtwork,
  getPosterBorderMetrics,
  NEATLINE_CHANGE_EVENT,
  NEATLINE_RESET_EVENT,
  readNeatlineSelection,
  type NeatlineSelection,
} from "@/features/layout/ui/NeatlinePicker";

const LOCKED_HINT = "Map is locked to prevent unintended movement.";
const UNLOCK_HINT = `${LOCKED_HINT}\nClick to unlock map editing.`;
const DEFAULT_LOCATION_LABEL = "Dehradun, Uttarakhand, India";

interface PreviewPanelProps {
  isCinemaMode?: boolean;
  onToggleCinema?: () => void;
  isEditing?: boolean;
  setIsEditing?: (val: boolean | ((prev: boolean) => boolean)) => void;
  wallPhoto?: string | null;
  cameraStream?: MediaStream | null;
  cinemaPosterPlacement?: { x: number; y: number; scale: number };
  onCinemaPosterPlacementChange?: (placement: { x: number; y: number; scale: number }) => void;
}


function renderThematicFrame(shapeId?: string) {
  if (!shapeId) return null;
  if (shapeId === "house") {
    return (
      <svg
        className="poster-shape-thematic-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", zIndex: 4, pointerEvents: "none", overflow: "visible" }}
      >
        {/* Architectural terracotta chimney */}
        <rect x="25" y="13" width="10" height="14" fill="#9a3412" rx="1" />
        <rect x="23" y="10" width="14" height="4" rx="1" fill="#ea580c" />
        {/* 3D Terracotta gable roof with dimensional bevel */}
        <path
          d="M 50 3 L 94 38 L 88 42 L 50 11 L 12 42 L 6 38 Z"
          fill="#c2410c"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.28))"
        />
        <path
          d="M 50 3 L 94 38 L 91 40 L 50 6 L 9 40 L 6 38 Z"
          fill="#fb923c"
          fillOpacity="0.85"
        />
      </svg>
    );
  }
  if (shapeId === "mountain") {
    return (
      <svg
        className="poster-shape-thematic-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", zIndex: 4, pointerEvents: "none", overflow: "visible" }}
      >
        {/* Center Peak Frosted Snow Cap */}
        <path
          d="M 47 22 L 50 17 L 53 22 L 58 35 L 50 30 L 42 35 Z"
          fill="#e0f2fe"
          filter="drop-shadow(0 3px 6px rgba(14,165,233,0.35))"
        />
        {/* Left Peak Snow Cap */}
        <path
          d="M 23 38 L 27 33 L 31 38 L 35 48 L 27 43 L 19 48 Z"
          fill="#e0f2fe"
          fillOpacity="0.95"
        />
        {/* Right Peak Snow Cap */}
        <path
          d="M 68 40 L 72 35 L 76 40 L 80 50 L 72 45 L 64 50 Z"
          fill="#e0f2fe"
          fillOpacity="0.95"
        />
        {/* Sculpted Alpine Ridgelines */}
        <path
          d="M 50 30 L 50 65 M 27 43 L 29 68 M 72 45 L 70 68"
          stroke="#0284c7"
          strokeWidth="1.2"
          strokeDasharray="2,3"
          strokeOpacity="0.75"
        />
      </svg>
    );
  }
  if (shapeId === "stamp") {
    return (
      <svg
        className="poster-shape-thematic-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", zIndex: 4, pointerEvents: "none", overflow: "visible" }}
      >
        {/* Classic Vintage Airmail Chevron Flags */}
        <polygon points="1,1 8,1 1,8" fill="#ef4444" />
        <polygon points="11,1 18,1 1,18 1,11" fill="#2563eb" />
        <polygon points="21,1 28,1 1,28 1,21" fill="#ef4444" />
        <polygon points="99,1 92,1 99,8" fill="#2563eb" />
        <polygon points="89,1 82,1 99,18 99,11" fill="#ef4444" />
        <polygon points="79,1 72,1 99,28 99,21" fill="#2563eb" />
        <polygon points="99,99 92,99 99,92" fill="#ef4444" />
        <polygon points="89,99 82,99 99,82 99,89" fill="#2563eb" />
        <polygon points="1,99 8,99 1,92" fill="#2563eb" />
        <polygon points="11,99 18,99 1,82 1,89" fill="#ef4444" />
        {/* Postmark cancellation waves */}
        <path d="M 66 14 Q 72 10 78 14 T 90 14" stroke="#dc2626" strokeWidth="1.2" fill="none" strokeOpacity="0.85" />
        <path d="M 66 18 Q 72 14 78 18 T 90 18" stroke="#dc2626" strokeWidth="1.2" fill="none" strokeOpacity="0.85" />
        <path d="M 66 22 Q 72 18 78 22 T 90 22" stroke="#dc2626" strokeWidth="1.2" fill="none" strokeOpacity="0.85" />
      </svg>
    );
  }
  if (shapeId === "scroll") {
    return (
      <svg
        className="poster-shape-thematic-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", zIndex: 4, pointerEvents: "none", overflow: "visible" }}
      >
        {/* Top parchment scroll roll */}
        <path d="M 8 12 C 8 8, 92 8, 92 12 C 94 15, 94 18, 92 20 C 90 22, 10 22, 8 20 C 6 18, 6 15, 8 12 Z" fill="#b45309" filter="drop-shadow(0 3px 5px rgba(0,0,0,0.25))" />
        <path d="M 12 12 L 88 12" stroke="#fef3c7" strokeWidth="1.2" strokeLinecap="round" />
        {/* Bottom parchment scroll roll */}
        <path d="M 8 84 C 8 80, 92 80, 92 84 C 94 87, 94 90, 92 92 C 90 94, 10 94, 8 92 C 6 90, 6 87, 8 84 Z" fill="#b45309" filter="drop-shadow(0 3px 5px rgba(0,0,0,0.25))" />
        {/* Finisher medal wax seal */}
        <circle cx="50" cy="88" r="4.8" fill="#ef4444" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
        <circle cx="50" cy="88" r="3.2" fill="#facc15" />
        <path d="M 47.5 92 L 45 97.5 L 48.5 96 L 50 93 Z" fill="#dc2626" />
        <path d="M 52.5 92 L 55 97.5 L 51.5 96 L 50 93 Z" fill="#dc2626" />
      </svg>
    );
  }
  if (shapeId === "baby") {
    return (
      <svg
        className="poster-shape-thematic-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", zIndex: 4, pointerEvents: "none", overflow: "visible" }}
      >
        <circle cx="28" cy="88" r="1.5" fill="#f472b6" fillOpacity="0.8" />
        <circle cx="72" cy="84" r="1.5" fill="#38bdf8" fillOpacity="0.8" />
        <circle cx="50" cy="50" r="1.2" fill="#fbbf24" fillOpacity="0.85" />
      </svg>
    );
  }
  return null;
}

export default function PreviewPanel({
  isCinemaMode = false,
  onToggleCinema,
  isEditing: controlledIsEditing,
  setIsEditing: controlledSetIsEditing,
  wallPhoto = null,
  cameraStream = null,
  cinemaPosterPlacement = { x: 0, y: 0, scale: 1 },
  onCinemaPosterPlacementChange,
}: PreviewPanelProps) {
  const { state, dispatch, effectiveTheme, mapStyle, mapRef } =
    usePosterContext();
  const {
    form,
    isMarkerEditorActive,
    activeMarkerId,
  } = state;
  const activeShapeDef = useMemo(
    () => MAP_SHAPES.find((s) => s.id === (form.mapShape || "full")),
    [form.mapShape],
  );
  const isShaped = Boolean(form.mapShape && form.mapShape !== "full");
  const posterBg = isShaped ? "#ffffff" : effectiveTheme.ui.bg;
  const posterTextColor = form.posterTextColor || (isShaped ? "#0f172a" : effectiveTheme.ui.text);
  const hasVisibleMarkers = form.showMarkers && state.markers.length > 0;
  const {
    mapCenter,
    mapZoom,
    mapMinZoom,
    mapMaxZoom,
    handleMove,
    handleMoveEnd,
    setContainerWidth,
    overzoomScale,
  } = useMapSync(state, dispatch, mapRef);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const mapWindowRef = useRef<HTMLDivElement | null>(null);
  const posterDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const ghostCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalIsEditing, setInternalIsEditing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeEl = document.activeElement;
        if (
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          (activeEl instanceof HTMLElement && activeEl.isContentEditable)
        ) {
          return;
        }
        dispatch({ type: "TOGGLE_GRID" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);
  const [mainSettingsOpen, setMainSettingsOpen] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const isEditing = controlledIsEditing !== undefined ? controlledIsEditing : internalIsEditing;
  const setIsEditing = controlledSetIsEditing !== undefined ? controlledSetIsEditing : setInternalIsEditing;

  useEffect(() => {
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  const [neatlineSelection, setNeatlineSelection] = useState<NeatlineSelection>(readNeatlineSelection);
  const borderMetrics = useMemo(
    () =>
      getPosterBorderMetrics(
        form.width,
        form.height,
        neatlineSelection.mapGapCm,
        neatlineSelection.lineId,
        neatlineSelection.thicknesses,
        neatlineSelection.designScale,
        neatlineSelection.showWhiteMat,
      ),
    [
      form.width,
      form.height,
      neatlineSelection.mapGapCm,
      neatlineSelection.lineId,
      neatlineSelection.thicknesses,
      neatlineSelection.designScale,
      neatlineSelection.showWhiteMat,
    ],
  );

  useEffect(() => {
    const handleNeatlineChange = (event: Event) => {
      const custom = event as CustomEvent<NeatlineSelection>;
      setNeatlineSelection(custom.detail || readNeatlineSelection());
    };
    const handleNeatlineReset = () => {
      setNeatlineSelection(readNeatlineSelection());
    };
    window.addEventListener(NEATLINE_CHANGE_EVENT, handleNeatlineChange);
    window.addEventListener(NEATLINE_RESET_EVENT, handleNeatlineReset);
    return () => {
      window.removeEventListener(NEATLINE_CHANGE_EVENT, handleNeatlineChange);
      window.removeEventListener(NEATLINE_RESET_EVENT, handleNeatlineReset);
    };
  }, []);

  const [mapBearing, setMapBearing] = useState(0);
  const [isRotationEnabled, setIsRotationEnabled] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);



  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(
      "(max-width: 768px), (hover: none) and (pointer: coarse)",
    );
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    const element = mapWindowRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

    // Border/mat insets change the drawable map area without changing the
    // poster frame. Calibrate zoom against the visible map window itself.
    observer.observe(element);
    return () => observer.disconnect();
  }, [setContainerWidth]);

  useEffect(() => {
    if (!form.showPosterText) return;
    const family = form.fontFamily.trim();
    if (!family) return;

    void ensureFont(family).catch(() => {
      // Ignore font loading failures; fallback stack remains in place.
    });
  }, [form.fontFamily, form.showPosterText]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncBearing = () => {
      setMapBearing(map.getBearing());
    };

    map.on("rotate", syncBearing);
    return () => {
      map.off("rotate", syncBearing);
    };
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    // The blurred desktop backdrop is hidden in cinema mode and on phones.
    // Avoid copying the full-resolution WebGL canvas there; that work
    // competes directly with touch and mouse panning.
    if (!map || isCinemaMode || isMobileViewport) return;

    const syncGhostCanvas = () => {
      const ghost = ghostCanvasRef.current;
      if (!ghost) return;
      const src = map.getCanvas();
      if (!src) return;

      if (ghost.width !== src.width || ghost.height !== src.height) {
        ghost.width = src.width;
        ghost.height = src.height;
      }

      const ctx = ghost.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(src, 0, 0);
    };

    // Refresh the backdrop after the map settles instead of doing a costly
    // WebGL-to-2D copy for every animation frame while the map is moving.
    map.on("idle", syncGhostCanvas);
    return () => {
      map.off("idle", syncGhostCanvas);
    };
  }, [mapRef, isCinemaMode, isMobileViewport]);

  useEffect(() => {
    if (!isMarkerEditorActive) {
      return;
    }
    setIsEditing(false);
    setIsRotationEnabled(false);
  }, [isMarkerEditorActive]);

  const widthCm = Number(form.width) || DEFAULT_POSTER_WIDTH_CM;
  const heightCm = Number(form.height) || DEFAULT_POSTER_HEIGHT_CM;
  const aspect = widthCm / heightCm;
  const formLat = Number(form.latitude) || 0;
  const formLon = Number(form.longitude) || 0;
  const layoutOption =
    getLayoutOption(form.layout) ?? createCustomLayoutOption(widthCm, heightCm);
  const posterSizeLabel = formatLayoutDimensions(layoutOption);
  const previewCanvasSize = resolveCanvasSize(widthCm / 2.54, heightCm / 2.54, 500);
  const resolutionInfoLabel = `${previewCanvasSize.width} × ${previewCanvasSize.height} px (${previewCanvasSize.effectiveDpi} PPI)`;
  const layoutLabel = `${layoutOption.name} (${formatLayoutDimensions(layoutOption)})`;
  const infoLocationLabel =
    [form.displayCity, form.displayCountry].filter(Boolean).join(", ") ||
    form.location ||
    DEFAULT_LOCATION_LABEL;
  const infoLayoutLabel = layoutOption.name;
  const markerCount = state.markers.length;
  const markersLabel = `${markerCount} marker${markerCount === 1 ? "" : "s"}`;
  const coordinatesLabel = `${formLat.toFixed(4)}, ${formLon.toFixed(4)}`;
  const { city: cityLabel, country: countryLabel, customDate: activeCustomDate } = getActivePosterLabels(form);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    const map = mapRef.current;
    if (map) {
      setMapBearing(map.getBearing());
    }
  }, [mapRef]);

  const handleFinishEditing = useCallback(() => {
    setIsEditing(false);
    setIsRotationEnabled(false);
  }, []);

  const handleToggleRotation = useCallback(() => {
    setIsRotationEnabled((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextZoom = Math.min(map.getZoom() + MAP_BUTTON_ZOOM_STEP, mapMaxZoom);
    if (Math.abs(nextZoom - map.getZoom()) < 0.0001) return;

    map.zoomTo(nextZoom, { duration: MAP_BUTTON_ZOOM_DURATION_MS });
  }, [mapRef, mapMaxZoom]);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextZoom = Math.max(map.getZoom() - MAP_BUTTON_ZOOM_STEP, mapMinZoom);
    if (Math.abs(nextZoom - map.getZoom()) < 0.0001) return;

    map.zoomTo(nextZoom, { duration: MAP_BUTTON_ZOOM_DURATION_MS });
  }, [mapRef, mapMinZoom]);

  const handleZoomSliderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const map = mapRef.current;
      if (!map) return;
      const nextZoom = Number(event.target.value);
      if (!Number.isFinite(nextZoom)) return;
      map.zoomTo(nextZoom, { duration: MAP_BUTTON_ZOOM_DURATION_MS });
    },
    [mapRef],
  );

  const handleRotationSliderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const map = mapRef.current;
      if (!map) return;
      const nextBearing = Number(event.target.value);
      if (!Number.isFinite(nextBearing)) return;
      setMapBearing(nextBearing);
      map.rotateTo(nextBearing, { duration: MAP_BUTTON_ZOOM_DURATION_MS });
    },
    [mapRef],
  );

  const handleRotateBy = useCallback(
    (deltaDeg: number) => {
      const map = mapRef.current;
      if (!map) return;
      const current = map.getBearing();
      const nextBearing = Math.max(-180, Math.min(180, current + deltaDeg));
      setMapBearing(nextBearing);
      map.rotateTo(nextBearing, { duration: MAP_BUTTON_ZOOM_DURATION_MS });
    },
    [mapRef],
  );

  const handleMarkerPositionChange = useCallback(
    (markerId: string, lat: number, lon: number) => {
      dispatch({
        type: "UPDATE_MARKER",
        markerId,
        changes: { lat, lon },
      });
    },
    [dispatch],
  );

  const handleMarkerActiveChange = useCallback(
    (markerId: string | null) => {
      dispatch({ type: "SET_ACTIVE_MARKER", markerId });
    },
    [dispatch],
  );

  const handleMarkerSizeChange = useCallback(
    (markerId: string, size: number) => {
      dispatch({
        type: "UPDATE_MARKER",
        markerId,
        changes: { size },
      });
    },
    [dispatch],
  );

  const isPhoneWallpaper =
    form.layout === "wallpaper_iphone_15_pro" ||
    form.layout.startsWith("wallpaper_iphone") ||
    form.layout === "social_instagram_story_tiktok";

  const handleTogglePhoneWallpaper = useCallback(() => {
    const targetId = isPhoneWallpaper
      ? "print_a4_portrait"
      : "wallpaper_iphone_15_pro";
    const layoutOption = getLayoutOption(targetId);
    if (!layoutOption) return;

    dispatch({
      type: "SET_LAYOUT",
      layoutId: layoutOption.id,
      widthCm: formatLayoutCm(layoutOption.widthCm),
      heightCm: formatLayoutCm(layoutOption.heightCm),
    });
  }, [isPhoneWallpaper, dispatch]);

  return (
    <section className="preview-panel">
      <div
        className={`poster-viewport${isCinemaMode ? " is-wall-mockup" : ""}${wallPhoto && isCinemaMode ? " has-user-wall-photo" : ""}${cameraStream && isCinemaMode ? " has-live-camera-background" : ""}`}
        style={wallPhoto && isCinemaMode ? { "--cinema-wall-photo": `url("${wallPhoto}")` } as CSSProperties : undefined}
      >
        {wallPhoto && isCinemaMode ? (
          <img
            className="cinema-wall-photo-backdrop"
            src={wallPhoto}
            alt=""
            aria-hidden="true"
          />
        ) : null}
        {cameraStream && isCinemaMode ? <video ref={cameraVideoRef} className="cinema-live-camera-backdrop" autoPlay muted playsInline aria-hidden="true" /> : null}
        {/* Desktop ghost layer: canvas clone of the main map at reduced opacity (hidden in cinema mode) */}
        {!isCinemaMode ? (
          <>
            <div className="poster-ghost-layer" aria-hidden="true">
              <canvas
                ref={ghostCanvasRef}
                className="poster-ghost-canvas"
              />
            </div>
            <div className="desktop-layout-label" aria-hidden="true">
              {layoutLabel}
            </div>
          </>
        ) : null}

        {!isCinemaMode ? (
          <button
            type="button"
            className={`poster-grid-toggle-btn${state.showGrid ? " is-active" : ""}`}
            onClick={() => dispatch({ type: "TOGGLE_GRID" })}
            title={state.showGrid ? "Hide Alignment Grid (G)" : "Show Alignment Grid & Center Finder (G)"}
            aria-label="Toggle alignment grid"
            aria-pressed={Boolean(state.showGrid)}
          >
            <GridIcon className="poster-grid-toggle-icon" />
            <span>Grid</span>
          </button>
        ) : null}
        <MapShapeDefs />
        <div
          ref={frameRef}
          className={`poster-frame${neatlineSelection.showWhiteMat ? " has-white-mat" : " is-full-bleed"} shape-finish-${form.shapeFinish || "shadow"}`}
          data-map-shape={form.mapShape || "full"}
          onPointerDown={(event) => {
            if (!isCinemaMode || !onCinemaPosterPlacementChange || event.button !== 0) return;
            posterDragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: cinemaPosterPlacement.x,
              originY: cinemaPosterPlacement.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = posterDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId || !onCinemaPosterPlacementChange) return;
            onCinemaPosterPlacementChange({
              ...cinemaPosterPlacement,
              x: Math.max(-30, Math.min(30, drag.originX + ((event.clientX - drag.startX) / window.innerWidth) * 100)),
              y: Math.max(-30, Math.min(30, drag.originY + ((event.clientY - drag.startY) / window.innerHeight) * 100)),
            });
          }}
          onPointerUp={(event) => {
            if (posterDragRef.current?.pointerId === event.pointerId) posterDragRef.current = null;
          }}
          onPointerCancel={() => { posterDragRef.current = null; }}
          style={
            {
              "--poster-aspect": `${aspect}`,
              "--poster-bg": posterBg,
              "--map-inset-x": borderMetrics.mapInsetX,
              "--map-inset-y": borderMetrics.mapInsetY,
              "--mat-inset-x": borderMetrics.matInsetX,
              "--mat-inset-y": borderMetrics.matInsetY,
              "--cinema-poster-x": `${cinemaPosterPlacement.x}vw`,
              "--cinema-poster-y": `${cinemaPosterPlacement.y}vh`,
              "--cinema-poster-scale": cinemaPosterPlacement.scale,
            } as CSSProperties
          }
        >
          {/* 3D Depth Shadow Caster rendered behind the map window */}

          {isShaped && form.shapeFinish === "shadow" && activeShapeDef?.svgPath ? (

            <svg

              className="poster-shape-shadow-caster"

              viewBox="0 0 100 100"

              preserveAspectRatio="none"

              aria-hidden="true"

            >

              <path d={activeShapeDef.svgPath} fill={effectiveTheme.ui.text || "#0f172a"} />

            </svg>

          ) : null}


          <div ref={mapWindowRef} className="poster-map-window">
          <Suspense
            fallback={
              <div className="map-container map-preview-loading" role="status" aria-live="polite">
                Loading map preview…
              </div>
            }
          >
            <MapPreview
              style={mapStyle}
              center={mapCenter}
              zoom={mapZoom}
              mapRef={mapRef}
              interactive={isEditing && !isMarkerEditorActive}
              allowRotation={isEditing}
              minZoom={mapMinZoom}
              maxZoom={mapMaxZoom}
              overzoomScale={overzoomScale}
              onMove={handleMove}
              onMoveEnd={handleMoveEnd}
            />
          </Suspense>
          <GradientFades color={effectiveTheme.ui.bg}
            top={isShaped ? false : (form.overlayTop ?? form.showMarkers)}
            bottom={isShaped ? false : (form.overlayBottom ?? form.showMarkers)} />
          <RouteOverlay
            routes={state.routes}
            mapRef={mapRef}
            visible={form.showRoutes}
            overzoomScale={overzoomScale}
          />
          <RouteEndpointsOverlay
            routes={state.routes}
            customIcons={state.customMarkerIcons}
            mapRef={mapRef}
            visible={form.showRoutes}
            overzoomScale={overzoomScale}
          />
          {hasVisibleMarkers ? (
            <MarkerOverlay
              markers={state.markers}
              customIcons={state.customMarkerIcons}
              mapRef={mapRef}
              isMarkerEditMode={isMarkerEditorActive}
              activeMarkerId={activeMarkerId}
              onActiveMarkerChange={handleMarkerActiveChange}
              onMarkerPositionChange={handleMarkerPositionChange}
              onMarkerSizeChange={handleMarkerSizeChange}
              overzoomScale={overzoomScale}
            />
          ) : null}
          </div>

          {/* Stroke overlay when Fine Border finish is chosen */}
          {isShaped && form.shapeFinish === "border" && activeShapeDef?.svgPath ? (
            <svg
              className="poster-shape-stroke-overlay"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={activeShapeDef.svgPath}
                fill="none"
                stroke={posterTextColor}
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
                strokeOpacity="0.85"
              />
            </svg>
          ) : null}

          {/* 3D Colorful Thematic Designer Frame Accents */}
          {isShaped ? renderThematicFrame(form.mapShape) : null}

          {/* PosterTextOverlay rendered at poster-frame level so it is NEVER clipped by the shape */}
          <PosterTextOverlay
            city={cityLabel}
            country={countryLabel}
            lat={formLat}
            lon={formLon}
            fontFamily={form.fontFamily}
            fontSize={Number(form.fontSize) || 16}
            textColor={posterTextColor}
            landColor={isShaped ? "#475569" : effectiveTheme.map.land}
            showPosterText={form.showPosterText}
            includeCredits={form.includeCredits}
            showOverlay={isShaped ? false : (form.overlayBottom ?? form.showMarkers)}
            customDate={activeCustomDate}
          />
          <NeatlineArtwork
            selection={neatlineSelection}
            className="preview-neatline"
            widthCm={form.width}
            heightCm={form.height}
          />
          {state.showGrid ? (
            <PosterGridOverlay
              backgroundColor={posterBg}
              textColor={posterTextColor}
            />
          ) : null}
        </div>
      </div>

      {!isCinemaMode ? (
        <aside className={`desktop-right-panel${mainSettingsOpen ? " is-open" : ""}`} aria-label="Current settings">
          <button type="button" className="desktop-current-settings-toggle" onClick={() => setMainSettingsOpen((open) => !open)} aria-expanded={mainSettingsOpen} aria-controls="desktop-current-settings-panel">⚙ Current Settings</button>
          <div id="desktop-current-settings-panel" className="desktop-current-settings-panel">
            <SettingsInfo location={infoLocationLabel} theme={effectiveTheme.name} layout={infoLayoutLabel} posterSize={posterSizeLabel} resolution={resolutionInfoLabel} markers={markersLabel} coordinates={coordinatesLabel} />
            <AdUnit slot={AD_SLOT_SIDEBAR} enabled={ADS_SIDEBAR_ENABLED} className="sidebar-ad-slot" />
          </div>
        </aside>
      ) : null}
    </section>
  );
}
