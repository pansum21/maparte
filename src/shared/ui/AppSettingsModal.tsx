import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useRecentLocations } from "@/features/location/application/useRecentLocations";
import { isAdminUser } from "@/features/export/infrastructure/planTier";
import {
  CloseIcon,
  SettingsIcon,
  CheckIcon,
  TrashIcon,
} from "@/shared/ui/Icons";

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminOpen?: () => void;
  onBackdropOpen?: () => void;
}

export default function AppSettingsModal({
  isOpen,
  onClose,
  onAdminOpen,
  onBackdropOpen,
}: AppSettingsModalProps) {
  const { state, dispatch } = usePosterContext();
  const { clearRecent, recent } = useRecentLocations();
  const [clearedRecent, setClearedRecent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (field: "showPosterText" | "showMarkers" | "showRoutes") => {
    dispatch({
      type: "SET_FIELD",
      name: field,
      value: !state.form[field],
    });
  };

  const handleResetDefaults = () => {
    dispatch({ type: "RESET_COLORS" });
    dispatch({ type: "CLEAR_MARKERS" });
    dispatch({ type: "CLEAR_ROUTES" });
    dispatch({
      type: "SET_THEME",
      themeId: "midnight_blue",
    });
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2500);
  };

  const handleClearHistory = () => {
    clearRecent();
    setClearedRecent(true);
    setTimeout(() => setClearedRecent(false), 2500);
  };

  return createPortal(
    <div
      className="export-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="export-modal app-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="App Settings and Preferences"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="export-modal-close"
          onClick={onClose}
          aria-label="Close settings"
        >
          <CloseIcon />
        </button>

        <div className="app-settings-header">
          <div className="app-settings-icon-wrap">
            <SettingsIcon className="app-settings-main-icon" />
          </div>
          <div>
            <h2 className="app-settings-title">App Settings & Tools</h2>
            <p className="app-settings-sub">
              Customize poster display, studio backdrop, and export tools.
            </p>
          </div>
        </div>

        <div className="app-settings-content">
          {/* Section 1: Room Wall Color & Preview */}
          <div className="app-settings-card">
            <h3 className="app-settings-card-title">Room Wall Color Preview</h3>
            <p className="toggle-sub" style={{ marginBottom: "12px" }}>
              Switch the background wall color to preview how your framed poster looks on different room paint colors (Warm White, Nordic Slate, Velvet Noir, or custom wall paint).
            </p>
            <button
              type="button"
              className="settings-action-btn"
              style={{
                background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.3))",
                borderColor: "rgba(56, 189, 248, 0.4)",
                color: "#e0f2fe",
              }}
              onClick={() => {
                onClose();
                onBackdropOpen?.();
              }}
            >
              🏠 Choose Wall Color
            </button>
          </div>

          {/* Section 2: Poster Display Options */}
          <div className="app-settings-card">
            <h3 className="app-settings-card-title">Poster Elements</h3>
            <div className="app-settings-toggles">
              <label className="settings-toggle-row">
                <span className="toggle-label-text">
                  <strong>Poster Text Overlay</strong>
                  <span className="toggle-sub">City & Country typography overlay</span>
                </span>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={state.form.showPosterText}
                  onChange={() => handleToggle("showPosterText")}
                />
              </label>

              <label className="settings-toggle-row">
                <span className="toggle-label-text">
                  <strong>Pins & Markers</strong>
                  <span className="toggle-sub">Show or hide custom location pins</span>
                </span>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={state.form.showMarkers}
                  onChange={() => handleToggle("showMarkers")}
                />
              </label>

              <label className="settings-toggle-row">
                <span className="toggle-label-text">
                  <strong>GPS Routes</strong>
                  <span className="toggle-sub">Show or hide route tracks</span>
                </span>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={state.form.showRoutes}
                  onChange={() => handleToggle("showRoutes")}
                />
              </label>
            </div>
          </div>

          {/* Section 3: Quality & Engine Info */}
          <div className="app-settings-card">
            <h3 className="app-settings-card-title">Export Quality & Engine</h3>
            <div className="settings-quality-info">
              <div className="quality-badge-row">
                <span className="quality-pill">✨ 500 DPI Active</span>
                <span className="quality-pill">📐 Vector SVG Engine</span>
                <span className="quality-pill">🎁 BOGO Free Trial</span>
              </div>
              <p className="quality-desc">
                Your posters download with vector clarity and 500 DPI ultra-high definition.
                Printed posters stay razor sharp at any wall size.
              </p>
            </div>
          </div>

          {/* Section 4: Owner & Admin Access */}
          <div className="app-settings-card">
            <h3 className="app-settings-card-title">Owner & Admin Access</h3>
            <div className="settings-admin-row">
              <p className="admin-status-note">
                Status: <strong>{isAdminUser() ? "👑 Admin Master Access Active" : "Regular User Mode"}</strong>
              </p>
              <button
                type="button"
                className="settings-action-btn settings-admin-btn"
                onClick={() => {
                  onClose();
                  onAdminOpen?.();
                }}
              >
                Open Admin Dashboard
              </button>
            </div>
          </div>

          {/* Section 5: Data & Reset */}
          <div className="app-settings-card">
            <h3 className="app-settings-card-title">Maintenance & Reset</h3>
            <div className="settings-actions-grid">
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleResetDefaults}
              >
                {resetDone ? (
                  <>
                    <CheckIcon className="btn-icon" />
                    <span>Reset Complete!</span>
                  </>
                ) : (
                  <span>Reset Poster to Defaults</span>
                )}
              </button>

              <button
                type="button"
                className="settings-action-btn"
                onClick={handleClearHistory}
                disabled={recent.length === 0}
              >
                {clearedRecent ? (
                  <>
                    <CheckIcon className="btn-icon" />
                    <span>History Cleared!</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="btn-icon" />
                    <span>Clear Search History ({recent.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
