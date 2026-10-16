import { useState } from "react";
import { InfoIcon, SunIcon, MoonIcon } from "@/shared/ui/Icons";
import SocialLinkGroup from "@/shared/ui/SocialLinkGroup";
import { useUiTheme } from "@/shared/hooks/useUiTheme";

interface GeneralHeaderProps {
  onAboutOpen: () => void;
  onAdminOpen?: () => void;
}

export default function GeneralHeader({
  onAboutOpen,
  onAdminOpen,
}: GeneralHeaderProps) {
  const { uiTheme, toggleUiTheme } = useUiTheme();
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

      <div className="general-header-actions">
        {/* Light / Dark Mode Switcher */}
        <button
          type="button"
          className="general-header-text-btn general-header-theme-toggle-btn"
          onClick={toggleUiTheme}
          aria-label={`Switch to ${uiTheme === "dark" ? "Light" : "Dark"} Mode`}
          title={`Switch to ${uiTheme === "dark" ? "Light" : "Dark"} Mode`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span style={{ display: "inline-flex", fontSize: "0.95rem" }} aria-hidden="true">
            {uiTheme === "dark" ? <SunIcon /> : <MoonIcon />}
          </span>
          <span className="general-header-btn-label">
            {uiTheme === "dark" ? "Light" : "Dark"}
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
