import { InfoIcon } from "@/shared/ui/Icons";
import SocialLinkGroup from "@/shared/ui/SocialLinkGroup";

interface GeneralHeaderProps {
  onAboutOpen: () => void;
  onGuideOpen?: () => void;
  onCinemaToggle?: () => void;
}

export default function GeneralHeader({
  onAboutOpen,
  onGuideOpen,
  onCinemaToggle,
}: GeneralHeaderProps) {
  return (
    <header className="general-header">
      <div
        className="desktop-brand"
        title="MAPARTE"
      >
        <img
          className="desktop-brand-logo brand-logo"
          src="/assets/logo.svg"
          alt="MAPARTE logo"
        />
        <div className="desktop-brand-copy brand-copy">
          <h1 className="desktop-brand-title">MAPARTE</h1>
          <p className="desktop-brand-kicker app-kicker">
            Mapping your visuals
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
        <SocialLinkGroup variant="header" />

        <button
          type="button"
          className="general-header-text-btn general-header-guide-text-btn"
          onClick={onGuideOpen}
          aria-label="Guide & How to Use"
          title="Guide & How to Use"
        >
          <span className="general-header-btn-label">📖 Guide</span>
          <span className="general-header-btn-icon" aria-hidden="true">
            <span style={{ fontSize: "14px", lineHeight: 1 }}>📖</span>
          </span>
        </button>

        <button
          type="button"
          className="general-header-text-btn general-header-about-text-btn"
          onClick={onAboutOpen}
          aria-label="About Maparte"
          title="About Maparte"
        >
          <span className="general-header-btn-label">ℹ️ About</span>
          <span className="general-header-btn-icon" aria-hidden="true">
            <span style={{ fontSize: "14px", lineHeight: 1 }}>ℹ️</span>
          </span>
        </button>
      </div>
    </header>
  );
}
