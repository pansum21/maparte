import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  createDefaultPosterState,
  usePosterContext,
} from "@/features/poster/ui/PosterContext";
import { useRecentLocations } from "@/features/location/application/useRecentLocations";
import { openLegalDoc } from "@/features/legal/application/legalDoc";
import { resetBackdropThemeToDefault } from "@/features/theme/application/useBackdropTheme";
import { resetNeatlineSettings } from "@/features/layout/ui/NeatlinePicker";
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
  const { dispatch } = usePosterContext();
  const { clearRecent, recent } = useRecentLocations();
  const [clearedRecent, setClearedRecent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [confirmation, setConfirmation] = useState<"reset" | "clear" | null>(null);
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

  const handleResetDefaults = () => {
    dispatch({ type: "RESET_TO_DEFAULTS", state: createDefaultPosterState() });
    resetNeatlineSettings();
    resetBackdropThemeToDefault();
    window.dispatchEvent(new Event("maparte:reset-wall-photo"));
    setConfirmation(null);
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
    setConfirmation(null);
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
          {/* Export quality and engine information */}
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
                onClick={() => setConfirmation("reset")}
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
                onClick={() => setConfirmation("clear")}
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

          {confirmation ? (
            <div className="settings-confirm-wrap">
              <section
                className="settings-confirm-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="settings-confirm-title"
                aria-describedby="settings-confirm-description"
              >
                <h3 id="settings-confirm-title">
                  {confirmation === "reset" ? "Reset to defaults?" : "Clear search data?"}
                </h3>
                <p id="settings-confirm-description">
                  {confirmation === "reset"
                    ? "This resets your saved poster settings and customizations, including the theme, wall, border, markers and routes. The editor will start again from its default state."
                    : "This removes your saved search history. Your current poster and other settings will stay as they are."}
                </p>
                <div className="settings-confirm-actions">
                  <button
                    type="button"
                    className="settings-action-btn"
                    onClick={() => setConfirmation(null)}
                  >Cancel</button>
                  <button
                    type="button"
                    className="settings-action-btn settings-action-btn--confirm"
                    onClick={confirmation === "reset" ? handleResetDefaults : handleClearHistory}
                  >{confirmation === "reset" ? "Reset everything" : "Clear history"}</button>
                </div>
              </section>
            </div>
          ) : null}

          {/* Legal, consent and project links, grouped with the app settings. */}
          <div className="app-settings-card app-settings-links-card">
            <h3 className="app-settings-card-title">Policies & Site Links</h3>
            <p className="settings-links-description">
              Policies explain privacy, terms and refunds. Cookie settings manage consent choices.
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
