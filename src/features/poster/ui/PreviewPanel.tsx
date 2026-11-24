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
import { useMapSync, distanceToZoom } from "@/features/map/application/useMapSync";
const MapPreview = lazy(() => import("@/features/map/ui/MapPreview"));
import MarkerOverlay from "@/features/markers/ui/MarkerOverlay";
import RouteOverlay from "@/features/routes/ui/RouteOverlay";
import RouteEndpointsOverlay from "@/features/routes/ui/RouteEndpointsOverlay";
import GradientFades from "./GradientFades";
import PosterTextOverlay from "./PosterTextOverlay";
import CirclePosterCaption from "./CirclePosterCaption";
import DoubleMapCaption from "./DoubleMapCaption";
import { HEART_PATH_UNIT } from "@/features/poster/domain/heartShape";
import { getDoubleSlotViews } from "@/features/poster/domain/doubleMapSlots";
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
  isMaparteCircleLayout,
  isMaparteCirclePosterLayout,
  isMaparteLandscapeLeftLayout,
  getMaparteCaptionVariant,
  getDoubleMapShape,
} from "@/features/layout/infrastructure/layoutRepository";
import { getSquareCaptionGeometry, getCircleCaptionGeometry, getDoubleMapGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import { DEFAULT_NAV_MARKER_COLOR, type MinimapOverlayOptions } from "@/features/poster/domain/minimapOverlay";
import MinimapOverlay from "./MinimapOverlay";
import { getFrameLayoutGeometry, type FrameLayoutId } from "@/features/layout/domain/frameLayoutGeometry";
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
  const { state, dispatch, effectiveTheme, mapStyle, mapRef, doubleMapRefs } =
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
    containerPx,
    overzoomScale,
  } = useMapSync(state, dispatch, mapRef);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const mapWindowRef = useRef<HTMLDivElement | null>(null);
  const mapWindowRefB = useRef<HTMLDivElement | null>(null);
  const [doubleMaps, setDoubleMaps] = useState<[any, any]>([null, null]);
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
  }, [setContainerWidth, form.layout]);

  useEffect(() => {
    if (!form.showPosterText) return;
    const families = [
      form.fontFamily,
      form.headingFontFamily,
      form.midlineFontFamily,
      form.bottomLineFontFamily,
    ].map((family) => family?.trim()).filter((family): family is string => Boolean(family));
    void Promise.all(families.map((family) => ensureFont(family).catch(() => undefined)));
  }, [form.fontFamily, form.headingFontFamily, form.midlineFontFamily, form.bottomLineFontFamily, form.showPosterText]);

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

  const frameLayoutIds: FrameLayoutId[] = ["classic", "left", "right", "center", "dark", "box", "title", "full-map"];
  const selectedFrameLayout = frameLayoutIds.includes(form.frameLayout as FrameLayoutId)
    ? (form.frameLayout as FrameLayoutId)
    : null;
  const isSquareCaption = !selectedFrameLayout && isMaparteSquareCaptionLayout(form.layout);
  const isCircleCaption = isSquareCaption && isMaparteCircleLayout(form.layout);
  const isCirclePoster = isCircleCaption && isMaparteCirclePosterLayout(form.layout);
  const doubleShape = !selectedFrameLayout ? getDoubleMapShape(form.layout) : null;
  const doubleGeometry = useMemo(() => {
    if (!doubleShape) return null;
    return getDoubleMapGeometry(
      widthCm * 100,
      heightCm * 100,
      widthCm,
      heightCm,
      borderMetrics.mapInsetCm,
      borderMetrics.gapCm,
      doubleShape,
      form.textAlign,
    );
  }, [doubleShape, widthCm, heightCm, borderMetrics.mapInsetCm, borderMetrics.gapCm, form.textAlign]);
  const doubleViews = getDoubleSlotViews(form, state.doubleMap);
  const doubleActive = state.doubleMap.active;
  const doubleSeededRef = useRef(false);

  // The active map is the one the search box, zoom buttons and exports talk to.
  useEffect(() => {
    if (!doubleShape) return;
    const map = doubleMaps[doubleActive];
    if (!map) return;
    mapRef.current = map;
    (window as unknown as { map?: unknown }).map = map;
    setMapInstance(map);
  }, [doubleShape, doubleActive, doubleMaps, mapRef]);

  // Give the second map a sensible starting place so the poster is never half empty.
  useEffect(() => {
    if (!doubleShape) {
      doubleSeededRef.current = false;
      return;
    }
    const other = state.doubleMap.other;
    if (doubleSeededRef.current || other.displayCity || other.location || !form.displayCity) return;
    doubleSeededRef.current = true;
    dispatch({
      type: "SET_DOUBLE_OTHER",
      data: {
        location: "Paris, France",
        latitude: "48.856600",
        longitude: "2.352200",
        distance: "6000",
        displayCity: "Paris",
        displayCountry: "France",
        displayContinent: "Europe",
        selectedLocation: {
          id: "default:paris",
          label: "Paris, France",
          lat: 48.8566,
          lon: 2.3522,
          city: "Paris",
          country: "France",
          continent: "Europe",
        },
      },
    });
  }, [doubleShape, state.doubleMap.other, form.displayCity, dispatch]);
  const previewFrameLayoutGeometry = useMemo(() => {
    if (!selectedFrameLayout) return null;
    const previewWidth = 1000;
    const previewHeight = previewWidth * heightCm / Math.max(1, widthCm);
    return getFrameLayoutGeometry(previewWidth, previewHeight, widthCm, heightCm, borderMetrics.mapInsetCm, borderMetrics.gapCm, selectedFrameLayout);
  }, [selectedFrameLayout, widthCm, heightCm, borderMetrics.mapInsetCm, borderMetrics.gapCm]);
  const captionVariant = getMaparteCaptionVariant(form.layout) ?? "center-bottom";
  const squareCaptionGeometry = useMemo(() => {
    if (!isSquareCaption) return null;
    const isLandscapeLeft = isMaparteLandscapeLeftLayout(form.layout) || form.circleTextSide === "left";
    if (isCircleCaption) {
      return getCircleCaptionGeometry(
        widthCm * 100,
        heightCm * 100,
        widthCm,
        heightCm,
        borderMetrics.mapInsetCm,
        borderMetrics.gapCm,
        isLandscapeLeft ? "left" : "right",
        form.textAlign,
        isCirclePoster,
        captionVariant,
      );
    }
    return getSquareCaptionGeometry(
      widthCm * 100,
      heightCm * 100,
      widthCm,
      heightCm,
      borderMetrics.mapInsetCm,
      borderMetrics.gapCm,
      captionVariant,
      form.textAlign,
      isLandscapeLeft ? "left" : "right",
    );
  }, [isSquareCaption, isCircleCaption, isCirclePoster, widthCm, heightCm, borderMetrics.mapInsetCm, borderMetrics.gapCm, captionVariant, form.textAlign, form.circleTextSide, form.layout]);
  const minimapOptions = useMemo<MinimapOverlayOptions | null>(() => {
    if (!isSquareCaption) return null;
    return {
      shape: isCircleCaption ? "circle" : "square",
      ring: form.minimapRing !== false,
      route: false,
      marker: Boolean(form.navMarker),
      markerSize: form.navMarkerSize ?? 1,
      markerColor: form.navMarkerColor ?? DEFAULT_NAV_MARKER_COLOR,
      ringBackground: effectiveTheme.ui.bg,
      ringForeground: form.posterTextColor || effectiveTheme.ui.text,
      ringStyle: isCirclePoster ? "poster" : "band",
    };
  }, [isSquareCaption, isCircleCaption, isCirclePoster, form.minimapRing, form.navMarker, form.navMarkerSize, form.navMarkerColor, form.posterTextColor, effectiveTheme.ui.bg, effectiveTheme.ui.text]);

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

    if (previewFrameLayoutGeometry) {
      const mapWCm = (previewFrameLayoutGeometry.width / previewFrameLayoutGeometry.posterWidth) * widthCm;
      const mapHCm = (previewFrameLayoutGeometry.height / previewFrameLayoutGeometry.posterHeight) * heightCm;
      const minDimCm = Math.min(mapWCm, mapHCm);
      const targetDiameterCm = Math.max(1, minDimCm - 3.0);
      const ratio = targetDiameterCm / widthCm;
      const targetDiameterPx = frameW * ratio;
      const targetZoom = Math.log2((Math.PI * targetDiameterPx) / 512);
      setBaseGlobeZoom(Number(targetZoom.toFixed(4)));
      return;
    }

    if (doubleGeometry) {
      const slotCm = (doubleGeometry.slots[0].size / doubleGeometry.posterWidth) * widthCm;
      const targetDiameterPx = (frameW * Math.max(1, slotCm - 3.0)) / widthCm;
      setBaseGlobeZoom(Number(Math.log2((Math.PI * targetDiameterPx) / 512).toFixed(4)));
      return;
    }

    if (isSquareCaption && squareCaptionGeometry) {
      const squareSizeCm = (squareCaptionGeometry.size / squareCaptionGeometry.posterWidth) * widthCm;
      const targetDiameterCm = Math.max(1, squareSizeCm - 3.0);
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
  }, [isPosterLayoutOpen, widthCm, heightCm, isSquareCaption, squareCaptionGeometry, doubleGeometry, previewFrameLayoutGeometry]);

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
          className={`poster-frame${neatlineSelection.showWhiteMat && neatlineSelection.lineId !== "none" ? " has-white-mat" : " is-full-bleed"}${isSquareCaption ? " is-maparte-square-caption" : ""}${isCircleCaption ? " is-maparte-circle" : ""}${doubleShape ? ` is-double-map is-double-${doubleShape}` : ""}${previewFrameLayoutGeometry ? ` frame-layout-preview frame-layout-preview--${previewFrameLayoutGeometry.style}` : ""}`}
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
              "--poster-bg": previewFrameLayoutGeometry?.style === "full-map" ? posterBg : (isCirclePoster || doubleShape) ? effectiveTheme.ui.bg : "#fff",
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
          


          {doubleGeometry && doubleShape ? (
            <>
              <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
                <clipPath id="poster-heart-clip" clipPathUnits="objectBoundingBox">
                  <path d={HEART_PATH_UNIT} />
                </clipPath>
              </svg>
              {([0, 1] as const).map((p) => {
                const slot = doubleGeometry.slots[p];
                const view = doubleViews[p];
                const isActive = doubleActive === p;
                const other = state.doubleMap.other;
                const slotZoom = isActive
                  ? mapZoom
                  : distanceToZoom(Math.max(1, view.distance), view.lat, containerPx);
                const noPlace = isActive ? !form.displayCity : !other.displayCity;
                const box = {
                  left: `${(slot.x / doubleGeometry.posterWidth) * 100}%`,
                  top: `${(slot.y / doubleGeometry.posterHeight) * 100}%`,
                  width: `${(slot.size / doubleGeometry.posterWidth) * 100}%`,
                  height: `${(slot.size / doubleGeometry.posterHeight) * 100}%`,
                };
                return (
                  <div key={p}>
                    <div
                      ref={p === 0 ? mapWindowRef : mapWindowRefB}
                      className={`poster-map-window poster-double-window is-${doubleShape}${isActive ? " is-active" : ""}`}
                      data-double-slot={p}
                      style={{ inset: "auto", ...box }}
                    >
                      <Suspense
                        fallback={
                          <div className="map-container map-preview-loading" role="status" aria-live="polite">
                            Loading map preview…
                          </div>
                        }
                      >
                        <MapPreview
                          style={mapStyle}
                          center={isActive ? mapCenter : [view.lon, view.lat]}
                          zoom={noPlace && slotZoom < 3.5 ? baseGlobeZoom : slotZoom}
                          baseGlobeZoom={noPlace ? baseGlobeZoom : undefined}
                          mapRef={doubleMapRefs[p]}
                          interactive={isActive && (((!form.displayCity || mapZoom < 3.5) || !isPosterLayoutOpen || isEditing) && !isMarkerEditorActive)}
                          allowRotation={isActive && ((!form.displayCity || mapZoom < 3.5) || !isPosterLayoutOpen || isEditing)}
                          autoRotate={isActive}
                          minZoom={mapMinZoom}
                          maxZoom={mapMaxZoom}
                          overzoomScale={1}
                          onMove={isActive ? handleMove : undefined}
                          onMoveEnd={isActive ? handleMoveEnd : undefined}
                          onMapReady={(map) => setDoubleMaps((prev) => (p === 0 ? [map, prev[1]] : [prev[0], map]))}
                        />
                      </Suspense>
                      {!isActive ? (
                        <button
                          type="button"
                          className="poster-double-select"
                          aria-label={`Edit map ${p + 1}`}
                          title={`Click to edit map ${p + 1}`}
                          onClick={() => dispatch({ type: "SELECT_DOUBLE_SLOT", slot: p })}
                        />
                      ) : null}
                    </div>
                    <svg
                      className={`poster-double-outline${isActive ? " is-active" : ""}`}
                      style={box}
                      viewBox="0 0 1 1"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      {doubleShape === "heart" ? (
                        <path d={HEART_PATH_UNIT} vectorEffect="non-scaling-stroke" />
                      ) : doubleShape === "circle" ? (
                        <ellipse cx="0.5" cy="0.5" rx="0.5" ry="0.5" vectorEffect="non-scaling-stroke" />
                      ) : (
                        <rect x="0" y="0" width="1" height="1" vectorEffect="non-scaling-stroke" />
                      )}
                    </svg>
                  </div>
                );
              })}
            </>
          ) : (
          <div
            ref={mapWindowRef}
            className="poster-map-window"
            style={previewFrameLayoutGeometry ? {
              inset: "auto",
              left: `${(previewFrameLayoutGeometry.x / previewFrameLayoutGeometry.posterWidth) * 100}%`,
              top: `${(previewFrameLayoutGeometry.y / previewFrameLayoutGeometry.posterHeight) * 100}%`,
              width: `${(previewFrameLayoutGeometry.width / previewFrameLayoutGeometry.posterWidth) * 100}%`,
              height: `${(previewFrameLayoutGeometry.height / previewFrameLayoutGeometry.posterHeight) * 100}%`,
            } : undefined}
          >
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
              interactive={isCinemaMode ? (!cinemaMapMovementLocked && !isMarkerEditorActive) : ((!isPosterLayoutOpen || isEditing) && !isMarkerEditorActive)}
              allowRotation={isCinemaMode ? !cinemaMapMovementLocked : (!isPosterLayoutOpen || isEditing)}
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
          {minimapOptions && !isCirclePoster ? <MinimapOverlay options={minimapOptions} /> : null}
          {state.showGrid ? (
            <PosterGridOverlay
              backgroundColor={effectiveTheme.map.land}
              textColor={previewFrameLayoutGeometry?.style === "dark" ? "#fff" : posterTextColor}
            />
          ) : null}
          </div>
          )}

          

          

          {isCirclePoster && minimapOptions && squareCaptionGeometry ? (
            <div
              className="poster-circle-minimap-slot"
              style={{
                left: `${((squareCaptionGeometry.overlayX ?? 0) / squareCaptionGeometry.posterWidth) * 100}%`,
                top: `${((squareCaptionGeometry.overlayY ?? 0) / squareCaptionGeometry.posterHeight) * 100}%`,
                width: `${((squareCaptionGeometry.overlaySize ?? 0) / squareCaptionGeometry.posterWidth) * 100}%`,
                height: `${((squareCaptionGeometry.overlaySize ?? 0) / squareCaptionGeometry.posterHeight) * 100}%`,
              }}
            >
              <MinimapOverlay options={minimapOptions} />
            </div>
          ) : null}
          {previewFrameLayoutGeometry && previewFrameLayoutGeometry.style !== "full-map" && previewFrameLayoutGeometry.style !== "box" ? (
            <div className={`frame-layout-caption-band frame-layout-caption-band--${previewFrameLayoutGeometry.style}`}
              aria-hidden="true"
              style={{
                left: `${(previewFrameLayoutGeometry.x / previewFrameLayoutGeometry.posterWidth) * 100}%`,
                width: `${(previewFrameLayoutGeometry.width / previewFrameLayoutGeometry.posterWidth) * 100}%`,
                top: `${((previewFrameLayoutGeometry.y + previewFrameLayoutGeometry.height) / previewFrameLayoutGeometry.posterHeight) * 100}%`,
                height: `${(previewFrameLayoutGeometry.captionHeight / previewFrameLayoutGeometry.posterHeight) * 100}%`,
              }}
            />
          ) : null}
          {previewFrameLayoutGeometry?.style === "box" ? (
            <div className="frame-layout-caption-card" aria-hidden="true"
              style={{
                left: `${((previewFrameLayoutGeometry.captionX - previewFrameLayoutGeometry.captionWidth / 2) / previewFrameLayoutGeometry.posterWidth) * 100}%`,
                top: `${((previewFrameLayoutGeometry.captionY - previewFrameLayoutGeometry.captionHeight / 2) / previewFrameLayoutGeometry.posterHeight) * 100}%`,
                width: `${(previewFrameLayoutGeometry.captionWidth / previewFrameLayoutGeometry.posterWidth) * 100}%`,
                height: `${(previewFrameLayoutGeometry.captionHeight / previewFrameLayoutGeometry.posterHeight) * 100}%`,
              }}
            />
          ) : null}
          {/* PosterTextOverlay rendered at poster-frame level only in Poster Layout mode */}
          {isPosterLayoutOpen ? (
            <>
              <ErrorBoundary name="PosterTextOverlay" fallback={null}>
                {doubleGeometry ? (
                  <DoubleMapCaption
                    geometry={doubleGeometry}
                    slots={[doubleViews[0], doubleViews[1]]}
                    fontFamily={form.fontFamily}
                    fontSize={Number(form.fontSize) || 16}
                    headingFontFamily={form.headingFontFamily}
                    headingFontSize={Number(form.headingFontSize) || undefined}
                    midlineFontFamily={form.midlineFontFamily}
                    midlineFontSize={Number(form.midlineFontSize) || undefined}
                    bottomLineFontFamily={form.bottomLineFontFamily}
                    bottomLineFontSize={Number(form.bottomLineFontSize) || undefined}
                    textColor={posterTextColor}
                    showPosterText={form.showPosterText}
                    includeCredits={form.includeCredits}
                    customDate={activeCustomDate}
                  />
                ) : isCirclePoster && squareCaptionGeometry ? (
                  <CirclePosterCaption
                    geometry={squareCaptionGeometry}
                    city={displayTitle}
                    country={displaySubtitle}
                    lat={formLat}
                    lon={formLon}
                    fontFamily={form.fontFamily}
                    fontSize={Number(form.fontSize) || 16}
                    headingFontFamily={form.headingFontFamily}
                    headingFontSize={Number(form.headingFontSize) || undefined}
                    midlineFontFamily={form.midlineFontFamily}
                    midlineFontSize={Number(form.midlineFontSize) || undefined}
                    bottomLineFontFamily={form.bottomLineFontFamily}
                    bottomLineFontSize={Number(form.bottomLineFontSize) || undefined}
                    textColor={posterTextColor}
                    showPosterText={form.showPosterText}
                    includeCredits={form.includeCredits}
                    customDate={activeCustomDate}
                  />
                ) : (
                <PosterTextOverlay
                  city={displayTitle}
                  country={displaySubtitle}
                  lat={formLat}
                  lon={formLon}
                  fontFamily={form.fontFamily}
                  fontSize={Number(form.fontSize) || 16}
                  headingFontFamily={form.headingFontFamily}
                  headingFontSize={Number(form.headingFontSize) || undefined}
                  midlineFontFamily={form.midlineFontFamily}
                  midlineFontSize={Number(form.midlineFontSize) || undefined}
                  bottomLineFontFamily={form.bottomLineFontFamily}
                  bottomLineFontSize={Number(form.bottomLineFontSize) || undefined}
                  textAlign={previewFrameLayoutGeometry?.style === "left" || previewFrameLayoutGeometry?.style === "right" ? previewFrameLayoutGeometry.style : (form.textAlign ?? "center")}
                  textPosition={form.textPosition ?? "bottom"}
                  textColor={posterTextColor}
                  landColor={effectiveTheme.map.land}
                  showPosterText={form.showPosterText && previewFrameLayoutGeometry?.style !== "full-map"}
                  includeCredits={form.includeCredits}
                  showOverlay={form.overlayBottom ?? form.showMarkers}
                  customDate={activeCustomDate}
                  squareCaption={isSquareCaption}
                  circleCaption={isCircleCaption}
                  squareCaptionGeometry={squareCaptionGeometry}
                  frameLayoutGeometry={previewFrameLayoutGeometry}
                  isCustomColor={Boolean(form.posterTextColor)}
                  posterWidthCm={widthCm}
                  posterHeightCm={heightCm}
                />
                )}
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
