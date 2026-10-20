import { useState } from "react";
import { InfoIcon } from "@/shared/ui/Icons";
import SocialLinkGroup from "@/shared/ui/SocialLinkGroup";

interface GeneralHeaderProps {
  onAboutOpen: () => void;
  onAdminOpen?: () => void;
  onBackdropOpen?: () => void;
}

export default function GeneralHeader({
  onAboutOpen,
  onAdminOpen,
  onBackdropOpen,
}: GeneralHeaderProps) {
  const [tapCount, setTapCount] = useState(0);

  const handleLogoClick = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        onAdminOpen?.();
        return 0;
      }
      return next;
    });
  };

  return (
    <header className="general-header">
      <div
        className="desktop-brand"
        onClick={handleLogoClick}
        title="MAPARTE"
        style={{ cursor: "pointer" }}
      >
        <img
          className="desktop-brand-logo brand-logo"
          src="/assets/logo.svg"
          alt="MAPARTE logo"
        />
        <div className="desktop-brand-copy brand-copy">
          <h1 className="desktop-brand-title">MAPARTE</h1>
          <p className="desktop-brand-kicker app-kicker">
            Free Map Poster & Wallpaper Creator
          </p>
        </div>
      </div>

      <div className="header-steps-guide" role="note" aria-label="Quick 3-step guide">
        <span className="step-item"><span className="step-num">1</span> Pick City</span>
        <span className="step-arrow" aria-hidden="true">➔</span>
        <span className="step-item"><span className="step-num">2</span> Style Poster</span>
        <span className="step-arrow" aria-hidden="true">➔</span>
        <span className="step-item"><span className="step-num">3</span> Download Ultra-HD</span>
      </div>

      <div className="general-header-actions">
        <button
          type="button"
          className="general-header-text-btn general-header-backdrop-text-btn"
          onClick={onBackdropOpen}
          aria-label="Room Wall Color & Preview"
          title="Choose Wall Color & Room Preview"
        >
          <span className="general-header-btn-label">Wall Color</span>
          <span className="general-header-btn-icon" aria-hidden="true" style={{ fontSize: "0.85rem" }}>
            🏠
          </span>
        </button>

        <SocialLinkGroup variant="header" />

        <button
          type="button"
          className="general-header-text-btn general-header-about-text-btn"
          onClick={onAboutOpen}
          aria-label="About"
          title="About"
        >
          <span className="general-header-btn-label">About</span>
          <span className="general-header-btn-icon" aria-hidden="true">
            <InfoIcon />
          </span>
        </button>
      </div>
    </header>
  );
}
