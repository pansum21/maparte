import {
  lazy,
  Suspense,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useExport } from "@/features/export/application/useExport";
import {
  MAX_MARKER_SIZE,
  MIN_MARKER_SIZE,
} from "@/features/markers/domain/constants";
import GeneralHeader from "@/shared/ui/GeneralHeader";
import DesktopNavBar from "@/shared/ui/DesktopNavBar";
import FooterNote from "@/shared/ui/FooterNote";
import PreviewPanel from "@/features/poster/ui/PreviewPanel";
import MobileNavBar, { type MobileTab } from "@/shared/ui/MobileNavBar";
import InstallPrompt from "@/features/install/ui/InstallPrompt";
import { useSwipeDown } from "@/shared/hooks/useSwipeDown";
import StartupLocationModal from "@/features/location/ui/StartupLocationModal";
import { CheckIcon } from "@/shared/ui/Icons";
import SupportModal from "@/features/export/ui/SupportModal";
import {
  SUPPORT_PROMPT_EVENT,
  type SupportPromptState,
} from "@/features/export/application/supportPrompt";
import { useSessionAnalytics } from "@/features/export/application/useSessionAnalytics";
import {
  LEGAL_DOC_EVENT,
  type LegalDocDetail,
  type LegalDocType,
} from "@/features/legal/application/legalDoc";
import { initBackdropThemeFromStorage } from "@/features/theme/application/useBackdropTheme";
import CinemaWallDock from "@/features/theme/ui/CinemaWallDock";
import BackdropThemeModal from "@/features/theme/ui/BackdropThemeModal";

const AboutModal = lazy(() => import("@/shared/ui/AboutModal"));
const LegalModal = lazy(() => import("@/features/legal/ui/LegalModal"));
const SettingsPanel = lazy(() => import("@/features/poster/ui/SettingsPanel"));
const AnnouncementModal = lazy(
  () => import("@/features/updates/ui/AnnouncementModal"),
);
const ExportFab = lazy(() => import("@/features/export/ui/ExportFab"));
const loadDesktopLocationBar = () => import("@/shared/ui/DesktopLocationBar");
const DesktopLocationBar = lazy(loadDesktopLocationBar);
const AppSettingsModal = lazy(() => import("@/shared/ui/AppSettingsModal"));
const EditMapPanel = lazy(() => import("@/features/map/ui/EditMapPanel"));
const loadAllCitiesModal = () => import("@/features/location/ui/AllCitiesModal");

function SettingsDrawer({
  mobileTab,
  onClose,
  isEditing,
  onToggleEditing,
  isPosterLayoutOpen,
}: {
  mobileTab: MobileTab;
  onClose: () => void;
  isEditing: boolean;
  onToggleEditing: () => void;
  isPosterLayoutOpen?: boolean;
}) {
  // Start as a content-sized sheet; long sections remain reachable by scrolling
  // and users can still expand the sheet from its handle when they need more room.
  const [isExpanded, setIsExpanded] = useState(false);
  const { sheetRef, handleRef, handleProps } = useSwipeDown(onClose, 80, {
    onExpand: () => {
      if (mobileTab !== "frames") setIsExpanded(true);
    },
  });

  return (
    <div className="mobile-drawer" role="dialog" aria-label="Settings">
      <div
        className="mobile-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`mobile-drawer-sheet${isExpanded ? " is-expanded" : ""}`}
        ref={sheetRef}
        data-mobile-tab={mobileTab}
      >
        <div
          className="mobile-drawer-handle"
          ref={handleRef}
          aria-hidden="true"
          {...handleProps}
        />
        <div className="mobile-drawer-content">
          {mobileTab === "settings" ? (
            <Suspense fallback={<div className="mobile-drawer-loading" role="status">Loading settings…</div>}>
              <AppSettingsModal
                isOpen
                presentation="panel"
                onClose={onClose}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<div className="mobile-drawer-loading" role="status">Loading controls…</div>}>
              <SettingsPanel
                mobileTab={mobileTab}
                isEditing={isEditing}
                onToggleEditing={onToggleEditing}
                isPosterLayoutOpen={isPosterLayoutOpen}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

function AppUpdateNotice({
  onRefresh,
  onDismiss,
}: {
  onRefresh: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="app-update-notice" role="status" aria-live="polite">
      <span className="app-update-notice__message">
        A new version is ready. Refresh when you are ready.
      </span>
      <button
        type="button"
        className="app-update-notice__refresh"
        onClick={onRefresh}
      >
        Refresh
      </button>
      <button
        type="button"
        className="app-update-notice__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss update notice"
      >
        ×
      </button>
    </div>
  );
}

type CityModalComponent = (props: {
  isOpen: boolean;
  onClose: () => void;
}) => ReactElement;

/**
 * React.lazy waits on its own promise before it will commit, and in this shell
 * that retry can be starved by the map's continuous re-renders: with the chunk
 * already fetched (both requests 200), the modal still sat on the fallback for
 * 45 s at 4x CPU while the component rendered 300+ times without committing.
 * Importing the module here and rendering the resolved component commits on the
 * next ordinary update instead, so the guard cannot park on the fallback.
 */
function CityModalLoader({ onClose }: { onClose: () => void }) {
  const [Modal, setModal] = useState<CityModalComponent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadAllCitiesModal().then(
      (mod) => {
        if (active) setModal(() => mod.default as unknown as CityModalComponent);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <section className="all-cities-modal all-cities-modal--loading" role="alert">
        Couldn’t load the city list — close this and try again.
      </section>
    );
  }

  if (!Modal) return <CityModalFallback />;
  return <Modal isOpen onClose={onClose} />;
}

function CityModalFallback() {
  return (
    <section className="all-cities-modal all-cities-modal--loading" role="status">
      Loading locations…
    </section>
  );
}

export default function AppShell() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdateReady = () => setUpdateAvailable(true);
    window.addEventListener("maparte:update-ready", handleUpdateReady);
    return () =>
      window.removeEventListener("maparte:update-ready", handleUpdateReady);
  }, []);

  const refreshForUpdate = useCallback(() => window.location.reload(), []);

  useEffect(() => {
    initBackdropThemeFromStorage();
  }, []);
  const { state, dispatch } = usePosterContext();
  const { exportPoster } = useExport();

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).exportPoster = exportPoster;
      (window as any).posterDispatch = dispatch;
      (window as any).posterState = state;
      (window as any).enablePosterLayout = () => setIsPosterLayoutOpen(true);
    }
  }, [exportPoster, dispatch, state]);

  // Fire once-per-session analytics on load (app_open).
  useSessionAnalytics();
  const { isMarkerEditorActive } = state;
  const activeMarker =
    state.activeMarkerId !== null
      ? state.markers.find((marker) => marker.id === state.activeMarkerId) ?? null
      : null;

  // Mobile state
  const [mobileTab, setMobileTab] = useState<MobileTab>("theme");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileLocationRowVisible, setMobileLocationRowVisible] =
    useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [deviceView, setDeviceView] = useState<"phone" | "tablet" | "desktop">(
    "desktop",
  );

  // Desktop state
  const [desktopTab, setDesktopTab] = useState<MobileTab>("theme");
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  const desktopSettingsPanelRef = useRef<HTMLDivElement | null>(null);
  const [desktopLocationRowVisible, setDesktopLocationRowVisible] =
    useState(false);
  const [aboutOpen, setAboutOpen] = useState(() => new URLSearchParams(window.location.search).get("guide") === "1");
  const [aboutInitialTab, setAboutInitialTab] = useState<"about" | "guide">(() => new URLSearchParams(window.location.search).get("guide") === "1" ? "guide" : "about");
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [cinemaMapMovementLocked, setCinemaMapMovementLocked] = useState(true);
  const [cinemaLayoutMovementLocked, setCinemaLayoutMovementLocked] = useState(true);
  const cinemaHistoryEntryRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [cinemaWallPhoto, setCinemaWallPhoto] = useState<string | null>(null);
  const [cinemaCameraStream, setCinemaCameraStream] = useState<MediaStream | null>(null);
  const cinemaWallPhotoUrlRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (
      !desktopPanelOpen ||
      !window.matchMedia("(min-width: 769px) and (hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const panel = desktopSettingsPanelRef.current;
    if (!panel) return;

    const animation = panel.animate(
      [
        { opacity: 0, transform: "translateX(-12px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 220, easing: "cubic-bezier(0.22, 0.8, 0.28, 1)" },
    );
    return () => animation.cancel();
  }, [desktopPanelOpen, desktopTab]);
  const handleCinemaWallPhotoChange = useCallback((photo: string | null) => {
    const previousPhoto = cinemaWallPhotoUrlRef.current;
    if (previousPhoto?.startsWith("blob:") && previousPhoto !== photo) {
      URL.revokeObjectURL(previousPhoto);
    }
    cinemaWallPhotoUrlRef.current = photo;
    setCinemaWallPhoto(photo);
  }, []);

  useEffect(() => () => {
    const photo = cinemaWallPhotoUrlRef.current;
    if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
    cinemaCameraStream?.getTracks().forEach((track) => track.stop());
  }, [cinemaCameraStream]);

  useEffect(() => {
    if (isCinemaMode || !cinemaCameraStream) return;
    cinemaCameraStream.getTracks().forEach((track) => track.stop());
    setCinemaCameraStream(null);
  }, [isCinemaMode, cinemaCameraStream]);

  useEffect(() => {
    const resetWallPhoto = () => {
      handleCinemaWallPhotoChange(null);
      setCinemaPosterPlacement({ x: 0, y: 0, scale: 1 });
    };
    window.addEventListener("maparte:reset-wall-photo", resetWallPhoto);
    return () => window.removeEventListener("maparte:reset-wall-photo", resetWallPhoto);
  }, [handleCinemaWallPhotoChange]);
  const [cinemaPosterPlacement, setCinemaPosterPlacement] = useState({ x: 0, y: 0, scale: 1 });
  const [allCitiesOpen, setAllCitiesOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isPosterLayoutOpen, setIsPosterLayoutOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("layout");
  });

  useEffect(() => {
    const handleEnableLayout = () => {
      setIsPosterLayoutOpen(true);
    };
    const handleDisableLayout = () => {
      setIsPosterLayoutOpen(false);
    };
    window.addEventListener("maparte:enable-poster-layout", handleEnableLayout);
    window.addEventListener("maparte:disable-poster-layout", handleDisableLayout);
    return () => {
      window.removeEventListener("maparte:enable-poster-layout", handleEnableLayout);
      window.removeEventListener("maparte:disable-poster-layout", handleDisableLayout);
    };
  }, []);

  const handleToggleCinema = useCallback((forceState?: boolean) => {
    setIsCinemaMode((prev) => {
      const next = typeof forceState === "boolean" ? forceState : !prev;
      if (next) {
        setDesktopLocationRowVisible(false);
        setAllCitiesOpen(false);
        setIsEditing(false);
        setDesktopPanelOpen(false);
        setBackdropOpen(false);
        setMobileDrawerOpen(false);
        if (
          typeof document !== "undefined" &&
          document.documentElement.requestFullscreen &&
          !document.fullscreenElement
        ) {
          void document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        setCinemaCameraStream((stream) => {
          stream?.getTracks().forEach((track) => track.stop());
          return null;
        });
        if (typeof document !== "undefined" && document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Escape exits cinema mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCinemaMode) {
        if (backdropOpen || aboutOpen || (desktopPanelOpen && desktopTab === "settings") || (mobileDrawerOpen && mobileTab === "settings")) return;
        handleToggleCinema(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCinemaMode,
    backdropOpen,
    aboutOpen,
    desktopPanelOpen,
    desktopTab,
    mobileDrawerOpen,
    mobileTab,
    handleToggleCinema,
  ]);

  useEffect(() => {
    if (!isCinemaMode) return;

    const previousState = window.history.state;
    const nextState =
      previousState && typeof previousState === "object"
        ? { ...previousState, __maparteCinemaMode: true }
        : { __maparteCinemaMode: true };
    window.history.pushState(nextState, "", window.location.href);
    cinemaHistoryEntryRef.current = true;

    const handleBack = () => {
      if (!cinemaHistoryEntryRef.current) return;
      cinemaHistoryEntryRef.current = false;
      const currentState = window.history.state;
      window.history.pushState(
        currentState && typeof currentState === "object" ? currentState : {},
        "",
        window.location.href,
      );
      setIsCinemaMode(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {});
      }
    };

    window.addEventListener("popstate", handleBack);
    return () => {
      window.removeEventListener("popstate", handleBack);
      if (
        cinemaHistoryEntryRef.current &&
        window.history.state?.__maparteCinemaMode === true
      ) {
        cinemaHistoryEntryRef.current = false;
        window.history.back();
      }
    };
  }, [isCinemaMode]);

  useEffect(() => {
    if (!isCinemaMode) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehavior;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [isCinemaMode]);

  const [supportPrompt, setSupportPrompt] = useState<SupportPromptState | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setSupportPrompt((e as CustomEvent<SupportPromptState>).detail);
    };
    window.addEventListener(SUPPORT_PROMPT_EVENT, handler);
    return () => window.removeEventListener(SUPPORT_PROMPT_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      setLegalDoc((e as CustomEvent<LegalDocDetail>).detail.doc);
    };
    window.addEventListener(LEGAL_DOC_EVENT, handler);
    return () => window.removeEventListener(LEGAL_DOC_EVENT, handler);
  }, []);

  useEffect(() => {
    const preload = () => {
      void import("@/features/poster/ui/SettingsPanel");
      void import("@/shared/ui/DesktopLocationBar");
      void import("@/features/export/ui/ExportFab");
      void import("@/features/updates/ui/AnnouncementModal");
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = setTimeout(preload, 300);
    return () => clearTimeout(timer);
  }, []);

  /**
   * The city list is a 438 KB chunk. It used to be warmed on idle for every
   * editor load, so phones downloaded it even when nobody opened the location
   * search. Warm it on intent instead: on the first pointer or focus that
   * reaches a location control.
   */
  useEffect(() => {
    const selector = '[data-warm-city-list="true"]';
    let warmed = false;

    const warm = () => {
      if (warmed) return;
      warmed = true;
      void loadAllCitiesModal();
    };

    const handleIntent = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.(selector)) warm();
    };

    document.addEventListener("pointerover", handleIntent, { passive: true });
    document.addEventListener("focusin", handleIntent);
    return () => {
      document.removeEventListener("pointerover", handleIntent);
      document.removeEventListener("focusin", handleIntent);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const syncViewport = () => {
      const width = window.innerWidth;
      const nextView =
        width <= 600
          ? "phone"
          : width <= 1024 || (pointerQuery.matches && width <= 1280)
            ? "tablet"
            : "desktop";
      setDeviceView(nextView);
      setIsMobileViewport(nextView !== "desktop");
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    pointerQuery.addEventListener("change", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      pointerQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [mobileDrawerOpen]);

  const handleMobileTabChange = (tab: MobileTab) => {
    if (tab === "wall") {
      setMobileLocationRowVisible(false);
      setMobileDrawerOpen(false);
      setMobileTab(tab);
      setBackdropOpen((open) => !open);
      return;
    }
    if (tab === "location") {
      setBackdropOpen(false);
      setMobileLocationRowVisible((isVisible) => !isVisible);
      setMobileDrawerOpen(false);
      return;
    }

    setMobileLocationRowVisible(false);
    setBackdropOpen(false);

    if (tab === mobileTab && mobileDrawerOpen) {
      setMobileDrawerOpen(false);
    } else {
      setMobileTab(tab);
      setMobileDrawerOpen(true);
    }
  };

  const handleDesktopTabChange = (tab: MobileTab) => {
    setDesktopLocationRowVisible(false);
    setAllCitiesOpen(false);
    setBackdropOpen(false);
    if (tab === desktopTab && desktopPanelOpen) {
      setDesktopPanelOpen(false);
    } else {
      setDesktopTab(tab);
      setDesktopPanelOpen(true);
    }
  };

  const handleDesktopLocationToggle = () => {
    void loadDesktopLocationBar();
    void loadAllCitiesModal();
    setDesktopLocationRowVisible(false);
    setBackdropOpen(false);
    setDesktopPanelOpen(false);
    setAllCitiesOpen((open) => !open);
  };

  const handleEditMapToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      if (desktopTab === "edit-map") setDesktopPanelOpen(false);
    } else {
      setIsEditing(true);
      setDesktopTab("edit-map");
      setDesktopPanelOpen(false);
      setDesktopLocationRowVisible(false);
      setBackdropOpen(false);
      setAllCitiesOpen(false);
    }
  };

  const handleMobileMarkerSizeChange = useCallback(
    (nextSize: number) => {
      if (!activeMarker) {
        return;
      }
      const clampedSize = Math.max(
        MIN_MARKER_SIZE,
        Math.min(MAX_MARKER_SIZE, Math.round(nextSize)),
      );
      dispatch({
        type: "UPDATE_MARKER",
        markerId: activeMarker.id,
        changes: { size: clampedSize },
      });
    },
    [activeMarker, dispatch],
  );

  // ══════════════════════════════════════════════════════════
  // CINEMA / FULLSCREEN ROOM WALL MODE (Zero Distraction DOM)
  // ══════════════════════════════════════════════════════════
  if (isCinemaMode) {
    return (
      <div
        className="app-shell is-cinema-mode"
        data-mobile-tab={mobileTab}
        data-desktop-tab={desktopTab}
        data-device-view={deviceView}
      >
        {updateAvailable ? (
          <AppUpdateNotice
            onRefresh={refreshForUpdate}
            onDismiss={() => setUpdateAvailable(false)}
          />
        ) : null}
        <PreviewPanel
          isCinemaMode={true}
          isPosterLayoutOpen={isPosterLayoutOpen}
          onToggleCinema={() => handleToggleCinema(false)}
          wallPhoto={cinemaWallPhoto}
          cameraStream={cinemaCameraStream}
          cinemaPosterPlacement={cinemaPosterPlacement}
          onCinemaPosterPlacementChange={setCinemaPosterPlacement}
          cinemaMapMovementLocked={cinemaMapMovementLocked}
          cinemaLayoutMovementLocked={cinemaLayoutMovementLocked}
        />

        <CinemaWallDock
          onExit={() => handleToggleCinema(false)}
          onWallPhotoChange={handleCinemaWallPhotoChange}
          hasWallPhoto={Boolean(cinemaWallPhoto)}
          isMobile={isMobileViewport}
          cameraStream={cinemaCameraStream}
          onCameraStreamChange={setCinemaCameraStream}
          placement={cinemaPosterPlacement}
          onPlacementChange={setCinemaPosterPlacement}
          mapMovementLocked={cinemaMapMovementLocked}
          layoutMovementLocked={cinemaLayoutMovementLocked}
          onMapMovementLockChange={setCinemaMapMovementLocked}
          onLayoutMovementLockChange={setCinemaLayoutMovementLocked}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STANDARD EDITOR MODE
  // ══════════════════════════════════════════════════════════
  return (
    <div
      className="app-shell"
      data-mobile-tab={mobileTab}
      data-mobile-drawer-open={mobileDrawerOpen ? "true" : undefined}
      data-desktop-tab={desktopTab}
      data-device-view={deviceView}
    >
      {updateAvailable ? (
        <AppUpdateNotice
          onRefresh={refreshForUpdate}
          onDismiss={() => setUpdateAvailable(false)}
        />
      ) : null}
      <GeneralHeader
        onAboutOpen={() => {
          setAboutInitialTab("about");
          setAboutOpen(true);
        }}
        onCinemaToggle={() => handleToggleCinema(true)}
      />
      <InstallPrompt />
      {/* StartupLocationModal omitted at startup to reduce layers and let user explore 3D Globe directly */}

      <DesktopNavBar
        activeTab={desktopTab}
        panelOpen={desktopPanelOpen}
        isLocationVisible={allCitiesOpen}
        allCitiesOpen={allCitiesOpen}
        onLocationToggle={handleDesktopLocationToggle}
        onTabChange={handleDesktopTabChange}
        onSettingsClick={() => {
          setDesktopLocationRowVisible(false);
          setAllCitiesOpen(false);
          setBackdropOpen(false);
          handleDesktopTabChange("settings");
        }}
        onToggleCinema={() => handleToggleCinema(true)}
        onDownloadClick={() => setIsDownloadOpen(true)}
        onOpenAllCities={() => setAllCitiesOpen(true)}
        wallOpen={backdropOpen}
        onOpenWall={() => {
          setDesktopLocationRowVisible(false);
          setDesktopPanelOpen(false);
          setAllCitiesOpen(false);
          setBackdropOpen((open) => !open);
        }}
        isEditing={isEditing}
        onEditMapToggle={handleEditMapToggle}
      />

      <div
        className={`mobile-location-row-wrap${mobileLocationRowVisible ? "" : " is-hidden"}`}
      >
        <Suspense fallback={null}>
          <DesktopLocationBar />
        </Suspense>
      </div>

      {isMobileViewport && isMarkerEditorActive && activeMarker ? (
        <div
          className="mobile-marker-size-bar"
          role="group"
          aria-label="Selected marker size"
        >
          <p className="mobile-marker-size-bar__label">Marker Size</p>
          <div className="mobile-marker-size-bar__controls">
            <input
              type="range"
              className="mobile-marker-size-bar__slider map-control-slider"
              min={MIN_MARKER_SIZE}
              max={MAX_MARKER_SIZE}
              step={1}
              value={Math.round(activeMarker.size)}
              onChange={(event) =>
                handleMobileMarkerSizeChange(Number(event.target.value))
              }
            />
            <span className="mobile-marker-size-bar__value">
              {Math.round(activeMarker.size)}px
            </span>
          </div>
        </div>
      ) : null}

      <div className="desktop-left-panel">
        {isEditing && !isMobileViewport ? (
          <div
            className={`desktop-edit-map-layer${desktopTab === "edit-map" && !desktopPanelOpen && !backdropOpen && !allCitiesOpen && !desktopLocationRowVisible ? " is-visible" : ""}`}
            aria-hidden={desktopTab !== "edit-map" || desktopPanelOpen || backdropOpen || allCitiesOpen || desktopLocationRowVisible}
          >
            <Suspense fallback={null}>
              <EditMapPanel />
            </Suspense>
          </div>
        ) : null}
        <div
          ref={desktopSettingsPanelRef}
          className={`desktop-settings-slide${desktopPanelOpen ? " is-open" : ""}`}
        >
          <Suspense fallback={null}>
            {desktopTab === "settings" ? (
              <AppSettingsModal
                isOpen={desktopPanelOpen}
                presentation="panel"
                onClose={() => setDesktopPanelOpen(false)}
              />
            ) : (
              <SettingsPanel
                mobileTab={desktopTab}
                isEditing={isEditing}
                onToggleEditing={() => setIsEditing((prev) => !prev)}
                isPosterLayoutOpen={isPosterLayoutOpen}
              />
            )}
          </Suspense>
        </div>
      </div>

      <PreviewPanel
        isCinemaMode={false}
        onToggleCinema={() => handleToggleCinema(true)}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isPosterLayoutOpen={isPosterLayoutOpen}
        onTogglePosterLayout={() => setIsPosterLayoutOpen((prev) => !prev)}
      />

      {mobileDrawerOpen ? (
        <SettingsDrawer
          mobileTab={mobileTab}
          onClose={() => setMobileDrawerOpen(false)}
          isEditing={isEditing}
          onToggleEditing={() => setIsEditing((prev) => !prev)}
          isPosterLayoutOpen={isPosterLayoutOpen}
        />
      ) : null}

      {isMobileViewport && isMarkerEditorActive ? (
        <button
          type="button"
          className="mobile-marker-edit-done"
          onClick={() => {
            dispatch({ type: "SET_MARKER_EDITOR_ACTIVE", active: false });
            dispatch({ type: "SET_ACTIVE_MARKER", markerId: null });
            setMobileDrawerOpen(false);
          }}
        >
          <CheckIcon />
          <span>Done Editing</span>
        </button>
      ) : null}

      <MobileNavBar
        activeTab={mobileTab}
        drawerOpen={mobileDrawerOpen}
        isLocationVisible={mobileLocationRowVisible}
        onTabChange={handleMobileTabChange}
        onOpenFullScreen={() => {
          setMobileDrawerOpen(false);
          handleToggleCinema(true);
        }}
        onSettingsClick={() => {
          setBackdropOpen(false);
          setMobileLocationRowVisible(false);
          if (mobileDrawerOpen && mobileTab === "settings") {
            setMobileDrawerOpen(false);
          } else {
            setMobileTab("settings");
            setMobileDrawerOpen(true);
          }
        }}
        settingsOpen={mobileDrawerOpen && mobileTab === "settings"}
        wallOpen={backdropOpen}
        isEditing={isEditing}
        onEditMapToggle={() => {
          setBackdropOpen(false);
          setMobileDrawerOpen(false);
          setIsEditing((prev) => !prev);
        }}
      />
      {isPosterLayoutOpen || isDownloadOpen ? (
        <Suspense fallback={null}>
          <ExportFab
            isMobile={isMobileViewport}
            showTrigger={isPosterLayoutOpen}
            isOpen={isDownloadOpen}
            onOpen={() => setIsDownloadOpen(true)}
            onClose={() => setIsDownloadOpen(false)}
          />
        </Suspense>
      ) : null}

      <FooterNote />
      <Suspense fallback={null}>
        <AnnouncementModal />
      </Suspense>
      {aboutOpen ? (
        <Suspense fallback={null}>
          <AboutModal
            initialTab={aboutInitialTab}
            onClose={() => setAboutOpen(false)}
            hideCloseButton
          />
        </Suspense>
      ) : null}
      {supportPrompt ? (
        <SupportModal
          posterNumber={supportPrompt.posterNumber}
          onClose={() => setSupportPrompt(null)}
        />
      ) : null}
      {legalDoc ? (
        <Suspense fallback={null}>
          <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
        </Suspense>
      ) : null}
      {backdropOpen ? (
        <BackdropThemeModal
          isOpen={backdropOpen}
          onClose={() => setBackdropOpen(false)}
          onEnterCinema={() => handleToggleCinema(true)}
        />
      ) : null}

      
      {allCitiesOpen ? (
        <CityModalLoader onClose={() => setAllCitiesOpen(false)} />
      ) : null}
    </div>
  );
}


