import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
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
} from "@/features/export/application/useExport";
import { useSessionAnalytics } from "@/features/export/application/useSessionAnalytics";
import {
  LEGAL_DOC_EVENT,
  type LegalDocDetail,
  type LegalDocType,
} from "@/features/legal/application/legalDoc";
import { initBackdropThemeFromStorage } from "@/features/theme/application/useBackdropTheme";
import CinemaWallDock from "@/features/theme/ui/CinemaWallDock";

const AboutModal = lazy(() => import("@/shared/ui/AboutModal"));
const LegalModal = lazy(() => import("@/features/legal/ui/LegalModal"));
const SettingsPanel = lazy(() => import("@/features/poster/ui/SettingsPanel"));
const AnnouncementModal = lazy(
  () => import("@/features/updates/ui/AnnouncementModal"),
);
const ExportFab = lazy(() => import("@/features/export/ui/ExportFab"));
const AllCitiesModal = lazy(() => import("@/features/location/ui/AllCitiesModal"));
const AdminControlModal = lazy(
  () => import("@/features/admin/ui/AdminControlModal"),
);
const AppSettingsModal = lazy(() => import("@/shared/ui/AppSettingsModal"));
const BackdropThemeModal = lazy(
  () => import("@/features/theme/ui/BackdropThemeModal"),
);

function SettingsDrawer({
  mobileTab,
  onClose,
  isEditing,
  onToggleEditing,
  onAdminOpen,
}: {
  mobileTab: MobileTab;
  onClose: () => void;
  isEditing: boolean;
  onToggleEditing: () => void;
  onAdminOpen: () => void;
}) {
  // Settings sections (especially Layout) contain long tool lists; open the
  // sheet expanded so phone users can reach the same controls without guessing
  // that the handle must be swiped first.
  const [isExpanded, setIsExpanded] = useState(true);
  const { sheetRef, handleRef, handleProps } = useSwipeDown(onClose, 80, {
    onExpand: () => setIsExpanded(true),
  });

  return (
    <div
      className={`mobile-drawer${mobileTab === "edit-map" ? " mobile-drawer--edit-map" : ""}`}
      role="dialog"
      aria-label="Settings"
    >
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
            <AppSettingsModal
              isOpen
              presentation="panel"
              onClose={onClose}
              onAdminOpen={onAdminOpen}
            />
          ) : (
            <SettingsPanel
              mobileTab={mobileTab}
              isEditing={isEditing}
              onToggleEditing={onToggleEditing}
            />
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [deviceView, setDeviceView] = useState<"phone" | "tablet" | "desktop">(
    "desktop",
  );

  // Desktop state
  const [desktopTab, setDesktopTab] = useState<MobileTab>("theme");
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutInitialTab, setAboutInitialTab] = useState<"about" | "guide">("about");
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [cinemaWallPhoto, setCinemaWallPhoto] = useState<string | null>(null);
  const [cinemaPosterPlacement, setCinemaPosterPlacement] = useState({ x: 0, y: 0, scale: 1 });
  const [allCitiesOpen, setAllCitiesOpen] = useState(false);

  const handleToggleCinema = useCallback((forceState?: boolean) => {
    setIsCinemaMode((prev) => {
      const next = typeof forceState === "boolean" ? forceState : !prev;
      if (next) {
        if (
          typeof document !== "undefined" &&
          document.documentElement.requestFullscreen &&
          !document.fullscreenElement
        ) {
          void document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
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
        if (backdropOpen || aboutOpen || adminOpen || (desktopPanelOpen && desktopTab === "settings") || (mobileDrawerOpen && mobileTab === "settings")) return;
        handleToggleCinema(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCinemaMode,
    backdropOpen,
    aboutOpen,
    adminOpen,
    desktopPanelOpen,
    desktopTab,
    mobileDrawerOpen,
    mobileTab,
    handleToggleCinema,
  ]);

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
    if (tab === "location") {
      setBackdropOpen(false);
      setAllCitiesOpen((open) => !open);
      setMobileDrawerOpen(false);
      return;
    }
    setAllCitiesOpen(false);
    if (tab === "wall") {
      setMobileDrawerOpen(false);
      setMobileTab(tab);
      setBackdropOpen((open) => !open);
      return;
    }

    setBackdropOpen(false);
    if (tab === mobileTab && mobileDrawerOpen) {
      setMobileDrawerOpen(false);
    } else {
      setMobileTab(tab);
      setMobileDrawerOpen(true);
    }
  };

  const handleDesktopTabChange = (tab: MobileTab) => {
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
    setBackdropOpen(false);
    setDesktopTab("location");
    setDesktopPanelOpen(false);
    setAllCitiesOpen((open) => !open);
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
          onToggleCinema={() => handleToggleCinema(false)}
          wallPhoto={cinemaWallPhoto}
          cinemaPosterPlacement={cinemaPosterPlacement}
          onCinemaPosterPlacementChange={setCinemaPosterPlacement}
        />

        <CinemaWallDock
          onExit={() => handleToggleCinema(false)}
          onWallPhotoChange={setCinemaWallPhoto}
          hasWallPhoto={Boolean(cinemaWallPhoto)}
          placement={cinemaPosterPlacement}
          onPlacementChange={setCinemaPosterPlacement}
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
        onGuideOpen={() => {
          setAboutInitialTab("guide");
          setAboutOpen(true);
        }}
        onAdminOpen={() => setAdminOpen(true)}
        onCinemaToggle={() => handleToggleCinema(true)}
      />
      <InstallPrompt />
      <StartupLocationModal />

      <DesktopNavBar
        activeTab={desktopTab}
        panelOpen={desktopPanelOpen}
        isLocationVisible={allCitiesOpen}
        onLocationToggle={handleDesktopLocationToggle}
        onTabChange={handleDesktopTabChange}
        onSettingsClick={() => handleDesktopTabChange("settings")}
        onToggleCinema={() => handleToggleCinema(true)}
        wallOpen={backdropOpen}
        onOpenWall={() => {
          setAllCitiesOpen(false);
          setDesktopPanelOpen(false);
          setBackdropOpen((open) => !open);
        }}
        isEditing={isEditing}
        onEditMapToggle={() => {
          setAllCitiesOpen(false);
          setDesktopTab("edit-map");
          setDesktopPanelOpen(true);
          setIsEditing((prev) => !prev);
        }}
      />

      <Suspense fallback={null}>
        <AllCitiesModal
          isOpen={allCitiesOpen}
          onClose={() => setAllCitiesOpen(false)}
        />
      </Suspense>

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
        <div
          className={`desktop-settings-slide${desktopPanelOpen ? " is-open" : ""}`}
        >
          <Suspense fallback={null}>
            {desktopTab === "settings" ? (
              <AppSettingsModal
                isOpen={desktopPanelOpen}
                presentation="panel"
                onClose={() => setDesktopPanelOpen(false)}
                onAdminOpen={() => setAdminOpen(true)}
              />
            ) : (
              <SettingsPanel
                mobileTab={desktopTab}
                isEditing={isEditing}
                onToggleEditing={() => setIsEditing((prev) => !prev)}
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
      />

      {mobileDrawerOpen ? (
        <SettingsDrawer
          mobileTab={mobileTab}
          onClose={() => setMobileDrawerOpen(false)}
          isEditing={isEditing}
          onToggleEditing={() => setIsEditing((prev) => !prev)}
          onAdminOpen={() => setAdminOpen(true)}
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
        isLocationVisible={allCitiesOpen}
        onTabChange={handleMobileTabChange}
        onOpenFullScreen={() => {
          setAllCitiesOpen(false);
          setMobileDrawerOpen(false);
          handleToggleCinema(true);
        }}
        onSettingsClick={() => {
          setBackdropOpen(false);
          setAllCitiesOpen(false);
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
          setAllCitiesOpen(false);
          setBackdropOpen(false);
          setMobileTab("edit-map");
          setMobileDrawerOpen(true);
          setIsEditing((prev) => !prev);
        }}
      />
      <Suspense fallback={null}>
        <ExportFab isMobile={isMobileViewport} />
      </Suspense>

      <FooterNote />
      <Suspense fallback={null}>
        <AnnouncementModal />
      </Suspense>
      {aboutOpen ? (
        <Suspense fallback={null}>
          <AboutModal
            initialTab={aboutInitialTab}
            onClose={() => setAboutOpen(false)}
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
      {adminOpen ? (
        <Suspense fallback={null}>
          <AdminControlModal
            isOpen={adminOpen}
            onClose={() => setAdminOpen(false)}
          />
        </Suspense>
      ) : null}
      {backdropOpen ? (
        <Suspense fallback={null}>
          <BackdropThemeModal
            isOpen={backdropOpen}
            onClose={() => setBackdropOpen(false)}
            onEnterCinema={() => handleToggleCinema(true)}
          />
        </Suspense>
      ) : null}

    </div>
  );
}
