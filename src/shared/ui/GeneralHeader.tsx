import { useState, useEffect } from "react";
import { InfoIcon } from "@/shared/ui/Icons";
import SocialLinkGroup from "@/shared/ui/SocialLinkGroup";
import { isAdminUser } from "@/features/export/infrastructure/planTier";

interface GeneralHeaderProps {
  onAboutOpen: () => void;
  onAdminOpen?: () => void;
}

export default function GeneralHeader({
  onAboutOpen,
  onAdminOpen,
}: GeneralHeaderProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    setIsAdmin(isAdminUser());
  }, []);

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
        title={isAdmin ? "MAPARTE (Admin Active)" : "MAPARTE"}
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
        {isAdmin && (
          <button
            type="button"
            className="general-header-text-btn general-header-admin-btn"
            onClick={onAdminOpen}
            aria-label="Admin Control"
            title="Admin Control Center"
            style={{
              borderColor: "rgba(223, 186, 115, 0.4)",
              background: "rgba(223, 186, 115, 0.12)",
              color: "#dfba73",
              fontWeight: 700,
            }}
          >
            <span className="general-header-btn-label">👑 Admin</span>
          </button>
        )}
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
