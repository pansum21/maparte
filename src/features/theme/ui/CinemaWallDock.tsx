import { useState, useEffect, useCallback, useRef } from "react";
import { useBackdropTheme } from "../application/useBackdropTheme";
import { BACKDROP_PRESETS } from "../domain/backdropThemes";

export type FrameStyleOption = "none" | "black" | "oak" | "white" | "gold";

interface CinemaWallDockProps {
  onExit: () => void;
  onOpenWallModal: () => void;
}

export default function CinemaWallDock({
  onExit,
  onOpenWallModal,
}: CinemaWallDockProps) {
  const {
    backdropState,
    activePreset,
    selectNextPreset,
    selectPrevPreset,
    selectPreset,
  } = useBackdropTheme();

  const [frameStyle, setFrameStyle] = useState<FrameStyleOption>(() => {
    if (typeof window === "undefined") return "black";
    try {
      const stored = localStorage.getItem("maparte_frame_style");
      if (stored) return stored as FrameStyleOption;
    } catch {}
    return "black";
  });

  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync native fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Update frame style
  const handleSelectFrame = useCallback((style: FrameStyleOption) => {
    setFrameStyle(style);
    try {
      localStorage.setItem("maparte_frame_style", style);
    } catch {}
    window.dispatchEvent(
      new CustomEvent("maparte:frame:change", { detail: style }),
    );
  }, []);

  // Toggle native monitor fullscreen
  const handleToggleNativeFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else if (document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  // Arrow key navigation between wall colors
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        selectNextPreset();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        selectPrevPreset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectNextPreset, selectPrevPreset]);

  // Inactivity dimmer: Dim the toolbar after 3.5s of no mouse movement so view is 100% clean
  useEffect(() => {
    const resetTimer = () => {
      setIsDimmed(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsDimmed(true);
      }, 3500);
    };

    resetTimer();
    window.addEventListener("mousemove", resetTimer, { passive: true });
    window.addEventListener("touchstart", resetTimer, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, []);

  const isCustom = backdropState.type === "custom";

  // Quick 6 trending showcase walls for 1-click test in dock
  const QUICK_WALLS = [
    { id: "swiss_coffee", name: "Swiss Coffee", hex: "#f1ede2" },
    { id: "alabaster_white", name: "Alabaster", hex: "#edeae0" },
    { id: "evergreen_fog", name: "Evergreen Fog", hex: "#5c675b" },
    { id: "nordic_slate", name: "Nordic Slate", hex: "#1e293b" },
    { id: "sedona_terracotta", name: "Terracotta", hex: "#b85d43" },
    { id: "scandi_oak_slat", name: "Oak Slats", hex: "#b89065" },
    { id: "velvet_noir", name: "Velvet Noir", hex: "#09090b" },
  ];

  return (
    <div
      className={`cinema-overlay-controls${isDimmed ? " is-dimmed" : ""}`}
      role="region"
      aria-label="Fullscreen Wall Preview Controls"
    >
      {/* Top Left: Discreet watermark badge */}
      <div className="cinema-top-left-pill">
        <span className="cinema-brand-dot" />
        <span className="cinema-brand-text">MAPARTE</span>
        <span className="cinema-brand-sep">•</span>
        <span className="cinema-brand-sub">Room Wall Preview</span>
      </div>

      {/* Top Right: Prominent Exit Button with Esc key badge */}
      <button
        type="button"
        className="cinema-top-exit-btn"
        onClick={onExit}
        title="Exit Fullscreen Wall View (Esc)"
        aria-label="Exit Fullscreen Wall View"
      >
        <span className="cinema-exit-icon" aria-hidden="true">✕</span>
        <span className="cinema-exit-text">Exit Fullscreen</span>
        <kbd className="cinema-esc-kbd">ESC</kbd>
      </button>

      {/* Bottom Center: Glassmorphic Cinema Floating Dock */}
      <aside className="cinema-bottom-dock">
        {/* Wall Selector Group */}
        <div className="cinema-dock-section cinema-wall-group">
          <button
            type="button"
            className="cinema-dock-btn cinema-dock-arrow"
            onClick={selectPrevPreset}
            title="Previous Wall Color (Left Arrow ‹)"
            aria-label="Previous Wall Color"
          >
            ❮
          </button>

          <button
            type="button"
            className="cinema-active-wall-btn"
            onClick={onOpenWallModal}
            title="Click to browse all 64 wall colors & custom paint mixer"
          >
            <span
              className="cinema-wall-swatch-dot"
              style={{
                background: isCustom
                  ? `linear-gradient(${backdropState.custom.angle}deg, ${backdropState.custom.color1}, ${backdropState.custom.color2})`
                  : activePreset.previewGradient,
              }}
            />
            <span className="cinema-wall-name">
              {isCustom ? "Custom Paint" : activePreset.name}
            </span>
            <span className="cinema-wall-dropdown-icon">▾</span>
          </button>

          <button
            type="button"
            className="cinema-dock-btn cinema-dock-arrow"
            onClick={selectNextPreset}
            title="Next Wall Color (Right Arrow ›)"
            aria-label="Next Wall Color"
          >
            ❯
          </button>
        </div>

        {/* Quick Showcase Wall Chips (Hidden on small screens) */}
        <div className="cinema-dock-section cinema-quick-walls">
          {QUICK_WALLS.map((item) => {
            const isSelected =
              !isCustom && backdropState.presetId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`cinema-quick-wall-chip${isSelected ? " is-selected" : ""}`}
                onClick={() => selectPreset(item.id)}
                title={item.name}
              >
                <span
                  className="quick-wall-dot"
                  style={{ background: item.hex }}
                />
                <span className="quick-wall-label">{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* All 64 Colors Studio button */}
        <div className="cinema-dock-section">
          <button
            type="button"
            className="cinema-dock-btn cinema-palette-btn"
            onClick={onOpenWallModal}
            title="Open 64 Interior Wall Colors & Custom Mixer"
          >
            <span aria-hidden="true">🏠</span>
            <span className="cinema-dock-label">64 Walls</span>
          </button>
        </div>

        <span className="cinema-dock-divider" aria-hidden="true" />

        {/* Frame Selection Group */}
        <div className="cinema-dock-section cinema-frame-group" role="radiogroup" aria-label="Select frame molding">
          <span className="cinema-group-label">Frame:</span>
          <button
            type="button"
            className={`cinema-frame-btn${frameStyle === "none" ? " is-selected" : ""}`}
            onClick={() => handleSelectFrame("none")}
            title="No Frame (Canvas only)"
          >
            None
          </button>
          <button
            type="button"
            className={`cinema-frame-btn${frameStyle === "black" ? " is-selected" : ""}`}
            onClick={() => handleSelectFrame("black")}
            title="Matte Black Wood Gallery Frame"
          >
            <span className="cinema-frame-dot dot-black" />
            Black
          </button>
          <button
            type="button"
            className={`cinema-frame-btn${frameStyle === "oak" ? " is-selected" : ""}`}
            onClick={() => handleSelectFrame("oak")}
            title="Scandinavian Natural Oak Frame"
          >
            <span className="cinema-frame-dot dot-oak" />
            Oak
          </button>
          <button
            type="button"
            className={`cinema-frame-btn${frameStyle === "white" ? " is-selected" : ""}`}
            onClick={() => handleSelectFrame("white")}
            title="Modern Architectural White Frame"
          >
            <span className="cinema-frame-dot dot-white" />
            White
          </button>
          <button
            type="button"
            className={`cinema-frame-btn${frameStyle === "gold" ? " is-selected" : ""}`}
            onClick={() => handleSelectFrame("gold")}
            title="Antique Brass Gold Metallic Frame"
          >
            <span className="cinema-frame-dot dot-gold" />
            Gold
          </button>
        </div>

        <span className="cinema-dock-divider" aria-hidden="true" />

        {/* Native Monitor Fullscreen Toggle & Exit */}
        <div className="cinema-dock-section cinema-actions-group">
          <button
            type="button"
            className="cinema-dock-btn cinema-native-fs-btn"
            onClick={handleToggleNativeFullscreen}
            title={
              isNativeFullscreen
                ? "Exit Monitor Fullscreen"
                : "Full Screen on Monitor"
            }
            aria-label="Toggle Monitor Fullscreen"
          >
            <span aria-hidden="true">{isNativeFullscreen ? "⊡" : "⛶"}</span>
          </button>

          <button
            type="button"
            className="cinema-dock-btn cinema-exit-dock-btn"
            onClick={onExit}
            title="Exit Fullscreen Preview (Esc)"
          >
            <span>Exit</span>
            <kbd className="cinema-esc-kbd">Esc</kbd>
          </button>
        </div>
      </aside>
    </div>
  );
}
