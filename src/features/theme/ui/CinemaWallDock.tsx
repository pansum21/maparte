import { useState } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import DownloadModal from "@/features/export/ui/DownloadModal";


interface CinemaWallDockProps {
  onExit: () => void;
}

export default function CinemaWallDock({ onExit }: CinemaWallDockProps) {
  const { state } = usePosterContext();
  const { form } = state;

  const cityName = form.displayCity || form.location || "Custom City";

  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  return (
    <div
      className="cinema-overlay-controls"
      role="region"
      aria-label="Fullscreen Wall Preview Controls"
    >
      {/* ── Top Left: Cinema heading ── */}
      <div className="cinema-top-bar-left">
        {/* 1. Prominent Heading */}
        <div className="cinema-heading-block">
          <div className="cinema-brand-title">
            <span className="cinema-brand-dot" />
            <span className="cinema-brand-name">MAPARTE</span>
          </div>
          <span className="cinema-heading-sub">Cinema Room View</span>
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

    </div>
  );
}
