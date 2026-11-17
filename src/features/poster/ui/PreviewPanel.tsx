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
import ErrorBoundary from "@/shared/ui/ErrorBoundary";
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
  isMaparteSquareCaptionLayout,
  getMaparteCaptionVariant,
} from "@/features/layout/infrastructure/layoutRepository";
import { getSquareCaptionGeometry } from "@/features/layout/domain/squareCaptionGeometry";
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
const DEFAULT_LOCATION_LABEL = "Planet Earth";

interface PreviewPanelProps {
  isCinemaMode?: boolean;
  onToggleCinema?: () => void;
  isEditing?: boolean;
  setIsEditing?: (val: boolean | ((prev: boolean) => boolean)) => void;
  wallPhoto?: string | null;
  cameraStream?: MediaStream | null;
  cinemaPosterPlacement?: { x: number; y: number; scale: number };
  onCinemaPosterPlacementChange?: (placement: { x: number; y: number; scale: number }) => void;
  cinemaMapMovementLocked?: boolean;
  cinemaLayoutMovementLocked?: boolean;
  isPosterLayoutOpen?: boolean;
  onTogglePosterLayout?: () => void;
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
  cinemaMapMovementLocked = true,
  cinemaLayoutMovementLocked = true,
  isPosterLayoutOpen: propIsPosterLayoutOpen,
  onTogglePosterLayout,
}: PreviewPanelProps) {
  const [internalIsPosterLayoutOpen, setInternalIsPosterLayoutOpen] = useState(false);
  const isPosterLayoutOpen = propIsPosterLayoutOpen !== undefined ? propIsPosterLayoutOpen : internalIsPosterLayoutOpen;
  const handleTogglePosterLayout = onTogglePosterLayout || (() => setInternalIsPosterLayoutOpen((prev) => !prev));
  const { state, dispatch, effectiveTheme, mapStyle, mapRef } =
    usePosterContext();
  const {
    form,
    isMarkerEditorActive,
    activeMarkerId,
  } = state;
  const posterBg = effectiveTheme.ui.bg;
  const posterTextColor = form.posterTextColor || effectiveTheme.ui.text;
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
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

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
    const map = mapInstance || mapRef.current;
    if (!map) return;

    const syncBearing = () => {
      setMapBearing(map.getBearing());
    };

    map.on("rotate", syncBearing);
    return () => {
      map.off("rotate", syncBearing);
    };
  }, [mapInstance, mapRef]);


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
  const layoutOption = form.layout
    ? getLayoutOption(form.layout) ?? createCustomLayoutOption(widthCm, heightCm)
    : createCustomLayoutOption(widthCm, heightCm);
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
  const displayTitle = [form.displayTown?.trim(), cityLabel].filter(Boolean).join(" · ");
  const displaySubtitle = [form.displayState?.trim(), countryLabel].filter(Boolean).join(", ");

  const isSquareCaption = isMaparteSquareCaptionLayout(form.layout);
  const captionVariant = getMaparteCaptionVariant(form.layout) ?? "center-bottom";
  const squareCaptionGeometry = useMemo(() => {
    if (!isSquareCaption) return null;
    return getSquareCaptionGeometry(
      widthCm * 100,
      heightCm * 100,
      widthCm,
      heightCm,
      borderMetrics.mapInsetCm,
      borderMetrics.gapCm,
      captionVariant,
      form.textAlign,
    );
  }, [isSquareCaption, widthCm, heightCm, borderMetrics.mapInsetCm, borderMetrics.gapCm, captionVariant, form.textAlign]);

  const [baseGlobeZoom, setBaseGlobeZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1.0;
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const targetPx = minDim * 0.65;
    return Number(Math.log2((Math.PI * targetPx) / 512).toFixed(4));
  });

  const updateBaseGlobeZoom = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!isPosterLayoutOpen) {
      // Fullscreen globe mode: 65% of viewport min dimension
      const vWidth = window.innerWidth;
      const vHeight = window.innerHeight;
      const minDim = Math.min(vWidth, vHeight);
      const targetDiameterPx = minDim * 0.65;
      const targetZoom = Math.log2((Math.PI * targetDiameterPx) / 512);
      setBaseGlobeZoom(Number(targetZoom.toFixed(4)));
      return;
    }

    const frameEl = frameRef.current;
    if (!frameEl) return;

    const rect = frameEl.getBoundingClientRect();
    const frameW = rect.width;
    const frameH = rect.height;
    if (frameW <= 0 || frameH <= 0) return;

    if (isSquareCaption && squareCaptionGeometry) {
      const squareSizeCm = (squareCaptionGeometry.size / squareCaptionGeometry.posterWidth) * widthCm;
      const marginCm = Math.min(1.5, squareSizeCm * 0.1);
      const targetDiameterCm = Math.max(1, squareSizeCm - marginCm * 2);
      const ratio = targetDiameterCm / widthCm;
      const targetDiameterPx = frameW * ratio;
      const targetZoom = Math.log2((Math.PI * targetDiameterPx) / 512);
      setBaseGlobeZoom(Number(targetZoom.toFixed(4)));
      return;
    }

    let targetDiameterPx: number;
    if (heightCm >= widthCm) {
      // Portrait or square: exactly 1.5 cm margin on left and 1.5 cm on right
      const ratio = Math.max(0.1, (widthCm - 3.0) / widthCm);
      targetDiameterPx = frameW * ratio;
    } else {
      // Landscape: exactly 1.5 cm margin on top and 1.5 cm on bottom
      const ratio = Math.max(0.1, (heightCm - 3.0) / heightCm);
      targetDiameterPx = frameH * ratio;
    }

    const targetZoom = Math.log2((Math.PI * targetDiameterPx) / 512);
    setBaseGlobeZoom(Number(targetZoom.toFixed(4)));
  }, [isPosterLayoutOpen, widthCm, heightCm, isSquareCaption, squareCaptionGeometry]);

  useEffect(() => {
    updateBaseGlobeZoom();

    const frameEl = frameRef.current;
    let observer: ResizeObserver | null = null;
    if (frameEl && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateBaseGlobeZoom();
      });
      observer.observe(frameEl);
    }
    window.addEventListener("resize", updateBaseGlobeZoom);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateBaseGlobeZoom);
    };
  }, [updateBaseGlobeZoom]);

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
        className={`poster-viewport${isPosterLayoutOpen ? " is-poster-layout-mode" : " is-fullscreen-globe-mode"}${isCinemaMode ? " is-wall-mockup" : ""}${wallPhoto && isCinemaMode ? " has-user-wall-photo" : ""}${cameraStream && isCinemaMode ? " has-live-camera-background" : ""}`}
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
        {!isCinemaMode && isPosterLayoutOpen ? (
          <div className="desktop-layout-label" aria-hidden="true">
            {layoutLabel}
          </div>
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
        <div
          ref={frameRef}
          className={`poster-frame${neatlineSelection.showWhiteMat && neatlineSelection.lineId !== "none" ? " has-white-mat" : " is-full-bleed"}${isSquareCaption ? " is-maparte-square-caption" : ""}`}
          onPointerDown={(event) => {
            if (!isCinemaMode || cinemaLayoutMovementLocked || !onCinemaPosterPlacementChange || event.button !== 0) return;
            if (mapWindowRef.current?.contains(event.target as Node)) return;
            event.preventDefault();
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
              ...(squareCaptionGeometry ? {
                "--square-map-x": `${(squareCaptionGeometry.x / squareCaptionGeometry.posterWidth) * 100}%`,
                "--square-map-y": `${(squareCaptionGeometry.y / squareCaptionGeometry.posterHeight) * 100}%`,
                "--square-map-width": `${(squareCaptionGeometry.size / squareCaptionGeometry.posterWidth) * 100}%`,
                "--square-map-height": `${(squareCaptionGeometry.size / squareCaptionGeometry.posterHeight) * 100}%`,
                "--square-safe-x": `${(squareCaptionGeometry.safeInsetX / squareCaptionGeometry.posterWidth) * 100}%`,
                "--square-safe-y": `${(squareCaptionGeometry.safeInsetY / squareCaptionGeometry.posterHeight) * 100}%`,
              } : {}),
              "--cinema-poster-x": `${cinemaPosterPlacement.x}vw`,
              "--cinema-poster-y": `${cinemaPosterPlacement.y}vh`,
              "--cinema-poster-scale": cinemaPosterPlacement.scale,
            } as CSSProperties
          }
        >
          


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
              zoom={(!form.displayCity && mapZoom < 3.5) ? baseGlobeZoom : mapZoom}
              baseGlobeZoom={baseGlobeZoom}
              mapRef={mapRef}
              interactive={isCinemaMode ? !cinemaMapMovementLocked && !isMarkerEditorActive : (((!form.displayCity || mapZoom < 3.5) || !isPosterLayoutOpen || isEditing) && !isMarkerEditorActive)}
              allowRotation={isCinemaMode ? !cinemaMapMovementLocked : ((!form.displayCity || mapZoom < 3.5) || !isPosterLayoutOpen || isEditing)}
              autoRotate={!isCinemaMode}
              minZoom={mapMinZoom}
              maxZoom={mapMaxZoom}
              overzoomScale={1}
              onMove={handleMove}
              onMoveEnd={handleMoveEnd}
              onMapReady={setMapInstance}
            />
          </Suspense>
          {isPosterLayoutOpen ? (
            <GradientFades color={effectiveTheme.ui.bg} top={form.overlayTop ?? form.showMarkers} bottom={form.overlayBottom ?? form.showMarkers} />
          ) : null}
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
          {state.showGrid ? (
            <PosterGridOverlay
              backgroundColor={effectiveTheme.map.land}
              textColor={posterTextColor}
            />
          ) : null}
          </div>

          

          

          {/* PosterTextOverlay rendered at poster-frame level only in Poster Layout mode */}
          {isPosterLayoutOpen ? (
            <>
              <ErrorBoundary name="PosterTextOverlay" fallback={null}>
                <PosterTextOverlay
                  city={displayTitle}
                  country={displaySubtitle}
                  lat={formLat}
                  lon={formLon}
                  fontFamily={form.fontFamily}
                  fontSize={Number(form.fontSize) || 16}
                  textAlign={form.textAlign ?? "center"}
                  textColor={posterTextColor}
                  landColor={effectiveTheme.map.land}
                  showPosterText={form.showPosterText}
                  includeCredits={form.includeCredits}
                  showOverlay={form.overlayBottom ?? form.showMarkers}
                  customDate={activeCustomDate}
                  squareCaption={isSquareCaption}
                  squareCaptionGeometry={squareCaptionGeometry}
                  isCustomColor={Boolean(form.posterTextColor)}
                />
              </ErrorBoundary>
              <NeatlineArtwork
                selection={neatlineSelection}
                className="preview-neatline"
                widthCm={form.width}
                heightCm={form.height}
              />
            </>
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
