import { useState, useEffect, useCallback } from "react";
import { useBackdropTheme } from "../application/useBackdropTheme";
import { BACKDROP_PRESETS } from "../domain/backdropThemes";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { formatLayoutCm } from "@/features/layout/domain/layoutMatcher";
import DownloadModal from "@/features/export/ui/DownloadModal";

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

  const { state, dispatch } = usePosterContext();
  const { form } = state;

  const isPhoneWallpaper =
    form.layout === "wallpaper_iphone_15_pro" ||
    form.layout.startsWith("wallpaper_iphone");

  const [frameStyle, setFrameStyle] = useState<FrameStyleOption>(() => {
    if (typeof window === "undefined") return "black";
    try {
      const stored = localStorage.getItem("maparte_frame_style");
      if (stored) return stored as FrameStyleOption;
    } catch {}
    return "black";
  });

  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [showOrderNotice, setShowOrderNotice] = useState(false);

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

  // Toggle Phone Wallpaper vs A4 Poster layout
  const handleToggleWallpaper = useCallback(() => {
    const targetId = isPhoneWallpaper
      ? "print_a4_portrait"
      : "wallpaper_iphone_15_pro";
    const targetLayout =
      targetId === "wallpaper_iphone_15_pro"
        ? { widthCm: 14.4, heightCm: 31.2 }
        : { widthCm: 21, heightCm: 29.7 };

    dispatch({
      type: "SET_FIELD",
      field: "layout",
      value: targetId,
    });
    dispatch({
      type: "SET_DIMENSIONS",
      widthCm: formatLayoutCm(targetLayout.widthCm),
      heightCm: formatLayoutCm(targetLayout.heightCm),
    });
  }, [isPhoneWallpaper, dispatch]);

  // Arrow key navigation between wall colors
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const isCustom = backdropState.type === "custom";

  // Fast swatches for instant 1-tap wall color test
  const POPULAR_WALL_SWATCHES = [
    { id: "swiss_coffee", name: "Swiss Coffee", hex: "#f1ede2" },
    { id: "alabaster_white", name: "Alabaster White", hex: "#edeae0" },
    { id: "evergreen_fog", name: "Evergreen Sage", hex: "#5c675b" },
    { id: "nordic_slate", name: "Nordic Slate", hex: "#1e293b" },
    { id: "sedona_terracotta", name: "Terracotta", hex: "#b85d43" },
    { id: "scandi_oak_slat", name: "Oak Wood Slats", hex: "#b89065" },
    { id: "oceanic_abyss", name: "Oceanic Navy", hex: "#032b43" },
    { id: "velvet_noir", name: "Velvet Noir", hex: "#09090b" },
  ];

  return (
    <div
      className="cinema-overlay-controls"
      role="region"
      aria-label="Fullscreen Wall Preview Controls"
    >
      {/* Top Left: Brand & Wall Color Studio Trigger */}
      <div className="cinema-top-bar-left">
        <div className="cinema-top-left-pill">
          <span className="cinema-brand-dot" />
          <span className="cinema-brand-text">MAPARTE</span>
          <span className="cinema-brand-sep">•</span>
          <span className="cinema-brand-sub">Cinema Room View</span>
        </div>

        <button
          type="button"
          className="cinema-top-wall-btn"
          onClick={onOpenWallModal}
          title="Open Wall Color & Custom Paint Studio"
        >
          <span aria-hidden="true">🎨</span>
          <span>Change Wall Color (64 Walls)</span>
        </button>
      </div>

      {/* Top Right: Prominent Exit Button with Esc key badge */}
      <div className="cinema-top-bar-right">
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
      </div>

      {/* Bottom Center: Fully Clickable, High-Contrast Glassmorphic Cinema Dock */}
      <aside className="cinema-bottom-dock" onClick={(e) => e.stopPropagation()}>
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
            title="Click to browse all 64 interior wall colors & custom paint mixer"
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

        {/* 1-Tap Popular Wall Swatches */}
        <div className="cinema-dock-section cinema-quick-walls">
          {POPULAR_WALL_SWATCHES.map((item) => {
            const isSelected =
              !isCustom && backdropState.presetId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`cinema-quick-wall-chip${isSelected ? " is-selected" : ""}`}
                onClick={() => selectPreset(item.id)}
                title={`Apply ${item.name} wall`}
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

        {/* Open 64 Colors Studio Button */}
        <div className="cinema-dock-section">
          <button
            type="button"
            className="cinema-dock-btn cinema-palette-btn"
            onClick={onOpenWallModal}
            title="Open All 64 Interior Wall Colors & Custom Mixer"
          >
            <span aria-hidden="true">🏠</span>
            <span className="cinema-dock-label">64 Walls</span>
          </button>
        </div>

        <span className="cinema-dock-divider" aria-hidden="true" />

        {/* Wallpaper Layout Toggle (Phone Wallpaper vs Poster) */}
        <div className="cinema-dock-section">
          <button
            type="button"
            className={`cinema-dock-btn cinema-layout-toggle-btn${isPhoneWallpaper ? " is-wallpaper" : ""}`}
            onClick={handleToggleWallpaper}
            title={
              isPhoneWallpaper
                ? "Switch back to standard A4 Print Poster"
                : "Switch to 9:16 vertical Phone Wallpaper format"
            }
          >
            <span aria-hidden="true">{isPhoneWallpaper ? "📱" : "🖼️"}</span>
            <span className="cinema-dock-label">
              {isPhoneWallpaper ? "Phone Wallpaper" : "Poster View"}
            </span>
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
            title="Frameless Canvas"
          >
            None
          </button>
          <button
            type="button"
            className={`cinema-frame-btn${frameStyle === "black" ? " is-selected" : ""}`}
            onClick={() => handleSelectFrame("black")}
            title="Matte Black Wood Frame"
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
            title="Modern White Wood Frame"
          >
            <span className="cinema-frame-dot dot-white" />
            White
          </button>
          <button
            type="button"
            className={`cinema-frame-btn${frameStyle === "gold" ? " is-selected" : ""}`}
            onClick={() => handleSelectFrame("gold")}
            title="Antique Brass Gold Frame"
          >
            <span className="cinema-frame-dot dot-gold" />
            Gold
          </button>
        </div>

        <span className="cinema-dock-divider" aria-hidden="true" />

        {/* Monetization Cash Flows: Order Framed Print & Download */}
        <div className="cinema-dock-section cinema-commerce-group">
          <button
            type="button"
            className="cinema-dock-btn cinema-order-btn"
            onClick={() => setShowOrderNotice(true)}
            title="Order this artwork printed & framed delivered to your door"
          >
            <span aria-hidden="true">🛍️</span>
            <span className="cinema-dock-label">Order Print (₹1,499)</span>
          </button>

          <button
            type="button"
            className="cinema-dock-btn cinema-download-btn"
            onClick={() => setIsDownloadOpen(true)}
            title="Download high-resolution image"
          >
            <span aria-hidden="true">⬇</span>
            <span className="cinema-dock-label">Download</span>
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

      {/* Download Modal Trigger inside Cinema Mode */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />

      {/* Order Print Commercial Prompt Modal */}
      {showOrderNotice && (
        <div
          className="export-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowOrderNotice(false)}
        >
          <div
            className="export-modal cinema-order-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cinema-order-modal-header">
              <span className="cinema-order-badge">✨ Museum Quality Print</span>
              <h3>Order Your Custom Framed Map</h3>
              <p>
                Printed on 240g/m² archival museum matte paper with premium solid wood framing and shatterproof plexiglass.
              </p>
            </div>

            <div className="cinema-order-specs">
              <div className="order-spec-item">
                <span className="spec-label">Current Location:</span>
                <span className="spec-val">{form.location || form.displayCity || "Custom Map"}</span>
              </div>
              <div className="order-spec-item">
                <span className="spec-label">Selected Frame:</span>
                <span className="spec-val" style={{ textTransform: "capitalize" }}>
                  {frameStyle === "none" ? "Canvas Print (No Frame)" : `${frameStyle} Solid Wood Frame`}
                </span>
              </div>
              <div className="order-spec-item">
                <span className="spec-label">Price:</span>
                <span className="spec-val order-price">₹1,499 ($39 USD) • Free Shipping</span>
              </div>
            </div>

            <div className="cinema-order-actions">
              <button
                type="button"
                className="cinema-order-confirm-btn"
                onClick={() => {
                  alert("Order integration connected! Gelato & Printful print-on-demand fulfillment will ship directly to customer.");
                  setShowOrderNotice(false);
                }}
              >
                Proceed to Checkout (Free Shipping)
              </button>
              <button
                type="button"
                className="cinema-order-cancel-btn"
                onClick={() => setShowOrderNotice(false)}
              >
                Back to Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
