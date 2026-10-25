import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePosterContext } from "./PosterContext";
import AdUnit from "@/shared/ui/AdUnit";
import { AD_SLOT_SIDEBAR, ADS_SIDEBAR_ENABLED } from "@/core/config";
import { useMapSync } from "@/features/map/application/useMapSync";
import MapPreview from "@/features/map/ui/MapPreview";
import MarkerOverlay from "@/features/markers/ui/MarkerOverlay";
import RouteOverlay from "@/features/routes/ui/RouteOverlay";
import RouteEndpointsOverlay from "@/features/routes/ui/RouteEndpointsOverlay";
import GradientFades from "./GradientFades";
import PosterTextOverlay from "./PosterTextOverlay";
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
  readNeatlineSelection,
  type NeatlineSelection,
} from "@/features/layout/ui/NeatlinePicker";

const LOCKED_HINT = "Map is locked to prevent unintended movement.";
const UNLOCK_HINT = `${LOCKED_HINT}\nClick to unlock map editing.`;
const COUNTRY_VIEW_ZOOM_LEVEL = 10;
const CONTINENT_VIEW_ZOOM_LEVEL = 6;
const DEFAULT_LOCATION_LABEL = "Dehradun, Uttarakhand, India";

interface PreviewPanelProps {
  isCinemaMode?: boolean;
  onToggleCinema?: () => void;
  isEditing?: boolean;
  setIsEditing?: (val: boolean | ((prev: boolean) => boolean)) => void;
  wallPhoto?: string | null;
  cinemaPosterPlacement?: { x: number; y: number; scale: number };
  onCinemaPosterPlacementChange?: (placement: { x: number; y: number; scale: number }) => void;
}

export default function PreviewPanel({
  isCinemaMode = false,
  onToggleCinema,
  isEditing: controlledIsEditing,
  setIsEditing: controlledSetIsEditing,
  wallPhoto = null,
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
  const posterDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const ghostCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = controlledIsEditing !== undefined ? controlledIsEditing : internalIsEditing;
  const setIsEditing = controlledSetIsEditing !== undefined ? controlledSetIsEditing : setInternalIsEditing;

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
      ),
    [
      form.width,
      form.height,
      neatlineSelection.mapGapCm,
      neatlineSelection.lineId,
      neatlineSelection.thicknesses,
      neatlineSelection.designScale,
    ],
  );

  useEffect(() => {
    const handleNeatlineChange = (event: Event) => {
      const custom = event as CustomEvent<NeatlineSelection>;
      setNeatlineSelection(custom.detail || readNeatlineSelection());
    };
    window.addEventListener(NEATLINE_CHANGE_EVENT, handleNeatlineChange);
    return () => window.removeEventListener(NEATLINE_CHANGE_EVENT, handleNeatlineChange);
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
    const element = frameRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

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
    if (!map) return;

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

    map.on("render", syncGhostCanvas);
    return () => {
      map.off("render", syncGhostCanvas);
    };
  }, [mapRef]);

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
  const isCityCountryView = mapZoom >= COUNTRY_VIEW_ZOOM_LEVEL;
  const isCountryContinentView =
    mapZoom >= CONTINENT_VIEW_ZOOM_LEVEL && mapZoom < COUNTRY_VIEW_ZOOM_LEVEL;
  const cityLabel = isCityCountryView
    ? form.displayCity || form.location || "Dehradun"
    : isCountryContinentView
      ? form.displayCountry || "India"
      : form.displayContinent || "Earth";
  const countryLabel = isCityCountryView
    ? form.displayCountry || "India"
    : isCountryContinentView
      ? form.displayContinent || "Asia"
      : "Earth";

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
        className={`poster-viewport${isCinemaMode ? " is-wall-mockup" : ""}${wallPhoto && isCinemaMode ? " has-user-wall-photo" : ""}`}
        style={wallPhoto && isCinemaMode ? { "--cinema-wall-photo": `url("${wallPhoto}")` } as CSSProperties : undefined}
      >
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
        <div
          ref={frameRef}
          className="poster-frame"
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
              "--poster-bg": effectiveTheme.ui.bg,
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
          <div className="poster-map-window">
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
          {form.showMarkers ? (
            <GradientFades color={effectiveTheme.ui.bg} />
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
          <PosterTextOverlay
            city={cityLabel}
            country={countryLabel}
            lat={formLat}
            lon={formLon}
            fontFamily={form.fontFamily}
            fontSize={Number(form.fontSize) || 16}
            textColor={effectiveTheme.ui.text}
            landColor={effectiveTheme.map.land}
            showPosterText={form.showPosterText}
            includeCredits={form.includeCredits}
            showOverlay={form.showMarkers}
            customDate={form.customDate}
          />
          </div>
          <NeatlineArtwork
            selection={neatlineSelection}
            className="preview-neatline"
            widthCm={form.width}
            heightCm={form.height}
          />
        </div>
      </div>

      {!isCinemaMode ? (
        <div className="desktop-right-panel">
          <SettingsInfo
            location={infoLocationLabel}
            theme={effectiveTheme.name}
            layout={infoLayoutLabel}
            posterSize={posterSizeLabel}
            resolution={resolutionInfoLabel}
            markers={markersLabel}
            coordinates={coordinatesLabel}
          />
          <AdUnit
            slot={AD_SLOT_SIDEBAR}
            enabled={ADS_SIDEBAR_ENABLED}
            className="sidebar-ad-slot"
          />
        </div>
      ) : null}
    </section>
  );
}
