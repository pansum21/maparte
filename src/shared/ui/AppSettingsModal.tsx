import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useRecentLocations } from "@/features/location/application/useRecentLocations";
import { openLegalDoc } from "@/features/legal/application/legalDoc";
import {
  CloseIcon,
  SettingsIcon,
  CheckIcon,
  TrashIcon,
} from "@/shared/ui/Icons";

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentation?: "modal" | "panel";
}

export default function AppSettingsModal({
  isOpen,
  onClose,
  presentation = "modal",
}: AppSettingsModalProps) {
  const { state, dispatch } = usePosterContext();
  const { clearRecent, recent } = useRecentLocations();
  const [clearedRecent, setClearedRecent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [cookieSettingsUnavailable, setCookieSettingsUnavailable] =
    useState(false);

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

  const handleOpenCookieSettings = () => {
    const googlefc = (window as Window & {
      googlefc?: {
        callbackQueue?: Array<{ CONSENT_DATA_READY: () => void }>;
        showRevocationMessage?: () => void;
      };
    }).googlefc;

    if (!googlefc?.callbackQueue) {
      setCookieSettingsUnavailable(true);
      return;
    }

    setCookieSettingsUnavailable(false);
    googlefc.callbackQueue.push({
      CONSENT_DATA_READY: () => googlefc.showRevocationMessage?.(),
    });
  };

  const handleClearHistory = () => {
    clearRecent();
    setClearedRecent(true);
    setTimeout(() => setClearedRecent(false), 2500);
  };

  const settingsView = (
    <div
      className={presentation === "panel" ? "app-settings-side-panel" : "export-modal-backdrop"}
      role={presentation === "panel" ? "region" : "presentation"}
      aria-label={presentation === "panel" ? "App Settings and Tools" : undefined}
      onClick={presentation === "modal" ? onClose : undefined}
    >
      <div
        className={`export-modal app-settings-modal${presentation === "panel" ? " app-settings-modal--panel" : ""}`}
        role="dialog"
        aria-modal={presentation === "modal"}
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
              Customize poster display and export tools.
            </p>
          </div>
        </div>

        <div className="app-settings-content">
          {/* Section 1: Poster Display Options */}
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
                <span className="quality-pill">✨ Ultra-HD Engine</span>
                <span className="quality-pill">📐 Vector SVG Engine</span>
              </div>
              <p className="quality-desc">
                Your posters download with scalable vector clarity or high-density raster calibrated up to 48 Megapixels.
                Printed posters stay razor sharp at any wall size.
              </p>
            </div>
          </div>

          {/* Section 4: Data & Reset */}
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

          {/* Legal, consent and project links, grouped with the app settings. */}
          <div className="app-settings-card app-settings-links-card">
            <h3 className="app-settings-card-title">Policies & Site Links</h3>
            <p className="settings-links-description">
              Policies explain privacy, terms and refunds. Cookie settings manage
              consent choices. Source code opens the project on GitHub.
            </p>
            <div className="settings-actions-grid">
              <button
                type="button"
                className="settings-action-btn"
                onClick={() => openLegalDoc("privacy")}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                className="settings-action-btn"
                onClick={() => openLegalDoc("terms")}
              >
                Terms of Service
              </button>
              <button
                type="button"
                className="settings-action-btn"
                onClick={() => openLegalDoc("refund")}
              >
                Refund Policy
              </button>
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleOpenCookieSettings}
              >
                Manage Cookie Choices
              </button>
              <a
                className="settings-action-btn"
                href="https://github.com/pansum21/maparte"
                target="_blank"
                rel="noreferrer"
              >
                View Source on GitHub
              </a>
            </div>
            {cookieSettingsUnavailable ? (
              <p className="settings-links-note" role="status">
                Cookie controls are not available in this browser session.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return presentation === "panel" ? settingsView : createPortal(settingsView, document.body);
}
