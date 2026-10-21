import { useState, useCallback } from "react";
import { useBackdropTheme } from "../application/useBackdropTheme";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
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
  const { backdropState, activePreset } = useBackdropTheme();
  const { state } = usePosterContext();
  const { form } = state;

  const cityName = form.displayCity || form.location || "Custom City";

  const [frameStyle, setFrameStyle] = useState<FrameStyleOption>(() => {
    if (typeof window === "undefined") return "black";
    try {
      const stored = localStorage.getItem("maparte_frame_style");
      if (stored) return stored as FrameStyleOption;
    } catch {}
    return "black";
  });

  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [showOrderNotice, setShowOrderNotice] = useState(false);

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

  const isCustom = backdropState.type === "custom";

  return (
    <div
      className="cinema-overlay-controls"
      role="region"
      aria-label="Fullscreen Wall Preview Controls"
    >
      {/* ── Top Left Column: Heading -> Change Wall Color -> Frames ── */}
      <div className="cinema-top-bar-left">
        {/* 1. Prominent Heading */}
        <div className="cinema-heading-block">
          <div className="cinema-brand-title">
            <span className="cinema-brand-dot" />
            <span className="cinema-brand-name">MAPARTE</span>
          </div>
          <span className="cinema-heading-sub">Cinema Room View</span>
        </div>

        {/* 2. Just below: Change Wall Color Button */}
        <button
          type="button"
          className="cinema-top-wall-btn"
          onClick={onOpenWallModal}
          title="Open Wall Color Studio (64 Authentic Interior Walls & Custom Colors)"
        >
          <span
            className="cinema-wall-btn-swatch"
            style={{
              background: isCustom
                ? `linear-gradient(${backdropState.custom.angle}deg, ${backdropState.custom.color1}, ${backdropState.custom.color2})`
                : activePreset.previewGradient,
            }}
          />
          <span className="cinema-wall-btn-icon" aria-hidden="true">🎨</span>
          <span className="cinema-wall-btn-title">Change Wall Color</span>
          <span className="cinema-wall-btn-tag">64 Walls</span>
        </button>

        {/* 3. Just below: Frames Bar */}
        <div className="cinema-frames-bar" role="radiogroup" aria-label="Select frame molding">
          <span className="cinema-frames-label">Frames:</span>
          <div className="cinema-frames-list">
            <button
              type="button"
              className={`cinema-frame-chip${frameStyle === "none" ? " is-selected" : ""}`}
              onClick={() => handleSelectFrame("none")}
              title="Frameless Canvas"
            >
              None
            </button>
            <button
              type="button"
              className={`cinema-frame-chip${frameStyle === "black" ? " is-selected" : ""}`}
              onClick={() => handleSelectFrame("black")}
              title="Matte Black Wood Frame"
            >
              <span className="frame-chip-color chip-black" />
              Black
            </button>
            <button
              type="button"
              className={`cinema-frame-chip${frameStyle === "oak" ? " is-selected" : ""}`}
              onClick={() => handleSelectFrame("oak")}
              title="Scandinavian Natural Oak Frame"
            >
              <span className="frame-chip-color chip-oak" />
              Oak
            </button>
            <button
              type="button"
              className={`cinema-frame-chip${frameStyle === "white" ? " is-selected" : ""}`}
              onClick={() => handleSelectFrame("white")}
              title="Modern White Wood Frame"
            >
              <span className="frame-chip-color chip-white" />
              White
            </button>
            <button
              type="button"
              className={`cinema-frame-chip${frameStyle === "gold" ? " is-selected" : ""}`}
              onClick={() => handleSelectFrame("gold")}
              title="Antique Brass Gold Frame"
            >
              <span className="frame-chip-color chip-gold" />
              Gold
            </button>
          </div>
        </div>
      </div>

      {/* ── Top Center: Live Poster View Badge with City ── */}
      <div className="cinema-top-bar-center">
        <div className="cinema-center-view-badge">
          <span className="cinema-center-icon">🖼️</span>
          <span className="cinema-center-title">Poster View</span>
          <span className="cinema-center-sep">•</span>
          <span className="cinema-center-city">{cityName}</span>
        </div>
      </div>

      {/* ── Top Right: Order Print CTA, Download & Prominent Back / Exit Button ── */}
      <div className="cinema-top-bar-right">
        <button
          type="button"
          className="cinema-top-order-btn"
          onClick={() => setShowOrderNotice(true)}
          title="Order this artwork printed & framed delivered to your door"
        >
          <span aria-hidden="true">🛍️</span>
          <span>Order Framed Print (₹1,499)</span>
        </button>

        <button
          type="button"
          className="cinema-top-download-btn"
          onClick={() => setIsDownloadOpen(true)}
          title="Download High-Resolution Image"
        >
          <span aria-hidden="true">⬇</span>
          <span>Download</span>
        </button>

        <button
          type="button"
          className="cinema-top-exit-btn"
          onClick={onExit}
          title="Exit Fullscreen Wall View & Back to Editor (Esc)"
          aria-label="Back to Editor"
        >
          <span className="cinema-exit-icon" aria-hidden="true">←</span>
          <span className="cinema-exit-text">Back to Editor</span>
          <kbd className="cinema-esc-kbd">ESC</kbd>
        </button>
      </div>

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
