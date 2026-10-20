import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, CheckIcon } from "@/shared/ui/Icons";
import {
  BACKDROP_PRESETS,
  type CustomGradientConfig,
} from "../domain/backdropThemes";
import { useBackdropTheme } from "../application/useBackdropTheme";

interface BackdropThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BackdropThemeModal({
  isOpen,
  onClose,
}: BackdropThemeModalProps) {
  const {
    backdropState,
    presets,
    selectPreset,
    updateCustomGradient,
    resetToDefault,
  } = useBackdropTheme();

  const [activeTab, setActiveTab] = useState<"presets" | "custom">(
    backdropState.type === "custom" ? "custom" : "presets",
  );

  const [customDraft, setCustomDraft] = useState<CustomGradientConfig>(
    backdropState.custom,
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setCustomDraft(backdropState.custom);
  }, [backdropState.custom]);

  if (!isOpen) return null;

  const handleApplyCustom = () => {
    updateCustomGradient(customDraft);
  };

  const isCustomActive = backdropState.type === "custom";

  return createPortal(
    <div
      className="export-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="export-modal backdrop-theme-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Room Wall Color & Preview Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="export-modal-close"
          onClick={onClose}
          aria-label="Close wall color settings"
        >
          <CloseIcon />
        </button>

        <div className="backdrop-modal-header">
          <div className="backdrop-modal-badge">
            <span>🏠 Room Wall Color &amp; Preview</span>
          </div>
          <h2 className="backdrop-modal-title">Room Wall Color Preview</h2>
          <p className="backdrop-modal-sub">
            Preview your framed map poster against realistic wall paint colors. See how your artwork will look hanging on your living room, bedroom, or office wall before downloading.
          </p>
        </div>

        {/* Tab switch */}
        <div className="backdrop-tabs-row">
          <button
            type="button"
            className={`backdrop-tab-btn ${activeTab === "presets" ? "is-active" : ""}`}
            onClick={() => setActiveTab("presets")}
          >
            Curated Wall Colors (10)
          </button>
          <button
            type="button"
            className={`backdrop-tab-btn ${activeTab === "custom" ? "is-active" : ""}`}
            onClick={() => setActiveTab("custom")}
          >
            Custom Wall Paint Mixer
          </button>
        </div>

        {activeTab === "presets" ? (
          <div className="backdrop-presets-grid">
            {presets.map((preset) => {
              const isSelected =
                !isCustomActive && backdropState.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`backdrop-preset-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => selectPreset(preset.id)}
                >
                  <div
                    className="backdrop-swatch"
                    style={{ background: preset.previewGradient }}
                  >
                    {isSelected && (
                      <span className="backdrop-selected-pill">
                        <CheckIcon /> Active
                      </span>
                    )}
                  </div>
                  <div className="backdrop-card-info">
                    <div className="backdrop-card-title-row">
                      <span className="backdrop-preset-name">{preset.name}</span>
                      <span className={`backdrop-mode-badge mode--${preset.mode}`}>
                        {preset.mode === "light" ? "Light" : "Dark"}
                      </span>
                    </div>
                    <span className="backdrop-preset-desc">
                      {preset.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="backdrop-custom-mixer">
            <div className="mixer-preview-box">
              <span className="mixer-preview-label">Live Backdrop Preview</span>
              <div
                className="mixer-preview-swatch"
                style={{
                  background: `linear-gradient(${customDraft.angle}deg, ${customDraft.color1} 0%, ${customDraft.color2} 100%)`,
                }}
              />
            </div>

            <div className="mixer-controls-grid">
              <div className="mixer-control-group">
                <label className="mixer-label">Gradient Color 1</label>
                <div className="mixer-color-input-wrap">
                  <input
                    type="color"
                    className="mixer-color-picker"
                    value={customDraft.color1}
                    onChange={(e) =>
                      setCustomDraft((prev) => ({ ...prev, color1: e.target.value }))
                    }
                  />
                  <input
                    type="text"
                    className="mixer-hex-input"
                    value={customDraft.color1}
                    onChange={(e) =>
                      setCustomDraft((prev) => ({ ...prev, color1: e.target.value }))
                    }
                    placeholder="#1e293b"
                  />
                </div>
              </div>

              <div className="mixer-control-group">
                <label className="mixer-label">Gradient Color 2</label>
                <div className="mixer-color-input-wrap">
                  <input
                    type="color"
                    className="mixer-color-picker"
                    value={customDraft.color2}
                    onChange={(e) =>
                      setCustomDraft((prev) => ({ ...prev, color2: e.target.value }))
                    }
                  />
                  <input
                    type="text"
                    className="mixer-hex-input"
                    value={customDraft.color2}
                    onChange={(e) =>
                      setCustomDraft((prev) => ({ ...prev, color2: e.target.value }))
                    }
                    placeholder="#0f172a"
                  />
                </div>
              </div>

              <div className="mixer-control-group mixer-angle-group">
                <div className="mixer-angle-header">
                  <label className="mixer-label">Gradient Angle</label>
                  <span className="mixer-angle-val">{customDraft.angle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  className="mixer-range-slider"
                  value={customDraft.angle}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      angle: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="mixer-actions-row">
              <button
                type="button"
                className="mixer-apply-btn"
                onClick={handleApplyCustom}
              >
                Apply Custom Wall Color
              </button>
            </div>
          </div>
        )}

        <div className="backdrop-modal-footer">
          <button
            type="button"
            className="backdrop-reset-btn"
            onClick={resetToDefault}
          >
            Reset to Default Wall Color
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
