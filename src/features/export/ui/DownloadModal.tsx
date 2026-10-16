import { useState, useEffect } from "react";
import { useExport } from "@/features/export/application/useExport";
import type { ExportFormat } from "@/features/export/domain/types";
import {
  isProUser,
  getProCredits,
  activateProWithKey,
  checkPaymentReturnUrl,
} from "@/features/export/infrastructure/planTier";
import { CloseIcon, DownloadIcon, LoaderIcon } from "@/shared/ui/Icons";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFormat?: ExportFormat;
}

const FORMAT_OPTIONS: { format: ExportFormat; label: string; desc: string }[] = [
  { format: "pdf", label: "PDF", desc: "Best for home & print shops" },
  { format: "png", label: "PNG", desc: "High-res image for screen/print" },
  { format: "svg", label: "SVG", desc: "Infinite vector for designers" },
];

export default function DownloadModal({
  isOpen,
  onClose,
  defaultFormat = "png",
}: DownloadModalProps) {
  const { isExporting, exportPoster } = useExport();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
  const [credits, setCredits] = useState(0);
  const [includeCredits, setIncludeCredits] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [bonusNotice, setBonusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkPaymentReturnUrl();
      const currentCredits = getProCredits();
      setCredits(currentCredits);
      setSelectedFormat(defaultFormat);
      setBonusNotice(null);
    }
  }, [isOpen, defaultFormat]);

  if (!isOpen) return null;

  const isPro = credits > 0 || isProUser();

  const handleFreeDownload = () => {
    void exportPoster(selectedFormat, { asPro: false, includeCredits: true });
    onClose();
  };

  const handleProDownload = async () => {
    const currentCredits = credits;
    await exportPoster(selectedFormat, { asPro: true, includeCredits });
    const remaining = Math.max(0, currentCredits - 1);
    setCredits(remaining);

    if (remaining > 0) {
      setBonusNotice(
        `🎉 1st poster downloaded! You still have ${remaining} FREE Bonus Ultra-HD download left for your next poster.`,
      );
    } else {
      setBonusNotice("🎉 Ultra-HD poster downloaded successfully!");
      setTimeout(() => {
        onClose();
      }, 1600);
    }
  };

  const handleActivateKey = () => {
    if (activateProWithKey(licenseKey)) {
      const updatedCredits = getProCredits();
      setCredits(updatedCredits);
      setShowKeyInput(false);
      setKeyError("");
    } else {
      setKeyError("Invalid code. Please check and try again.");
    }
  };

  const handlePaymentClick = () => {
    const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL;
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    } else {
      // Demo / fallback prompt for testing Buy 1 Get 1 Free
      const code = prompt(
        "Enter your $4.99 Purchase Code to unlock Buy 1 Get 1 Free (2 Ultra-HD Posters). Test code: MAPARTEPRO",
      );
      if (code && activateProWithKey(code)) {
        setCredits(getProCredits());
        alert("🎉 Buy 1 Get 1 Free Activated! You have 2 Ultra-HD Poster credits.");
      }
    }
  };

  return (
    <div
      className="export-modal-backdrop"
      role="presentation"
      onClick={() => !isExporting && onClose()}
    >
      <div
        className="export-modal download-paywall-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="export-modal-header">
          <div>
            <h3 id="download-modal-title">Download Your Poster</h3>
            <p className="download-modal-subtitle">
              Choose your format & export quality
            </p>
          </div>
          <button
            type="button"
            className="export-modal-close"
            onClick={() => !isExporting && onClose()}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {bonusNotice && (
          <div className="pro-bonus-alert">
            <span>{bonusNotice}</span>
          </div>
        )}

        {/* Format Selector */}
        <div className="download-format-selector">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.format}
              type="button"
              className={`download-format-pill ${
                selectedFormat === opt.format ? "is-active" : ""
              }`}
              onClick={() => setSelectedFormat(opt.format)}
            >
              <span className="format-name">{opt.label}</span>
              <span className="format-desc">{opt.desc}</span>
            </button>
          ))}
        </div>

        {/* Pricing & Quality Cards */}
        <div className="download-tier-grid">
          {/* Free Card */}
          <div className="download-tier-card tier-free">
            <div className="tier-card-header">
              <span className="tier-badge badge-free">Standard</span>
              <h4>Free Download</h4>
              <p className="tier-price">$0</p>
            </div>
            <ul className="tier-feature-list">
              <li>✓ 96 DPI screen quality</li>
              <li>✓ Includes {selectedFormat.toUpperCase()} export</li>
              <li>✓ Perfect for digital wallpapers</li>
              <li>ℹ Includes MAPARTE watermark</li>
            </ul>
            <button
              type="button"
              className="tier-btn tier-btn--free"
              disabled={isExporting}
              onClick={handleFreeDownload}
            >
              {isExporting ? (
                <LoaderIcon className="is-spinning" />
              ) : (
                <DownloadIcon />
              )}
              <span>Download Free ({selectedFormat.toUpperCase()})</span>
            </button>
          </div>

          {/* Pro Card (Buy 1 Get 1 Free) */}
          <div className="download-tier-card tier-pro is-featured">
            <div className="tier-featured-pill">🎁 BUY 1 GET 1 FREE</div>
            <div className="tier-card-header">
              <span className="tier-badge badge-pro">⭐ 300 DPI Duo Pack</span>
              <h4>Ultra-HD Art (2 Maps)</h4>
              <p className="tier-price">
                $4.99 <span className="tier-price-period">for 2 posters ($2.50 ea)</span>
              </p>
            </div>
            <ul className="tier-feature-list">
              <li>✓ <strong>2 Ultra-HD 300 DPI Posters</strong> (BOGO Offer)</li>
              <li>✓ <strong>NO Center Watermark</strong> (100% Clean)</li>
              <li>✓ Best for matching couple & living room frames</li>
              <li>✓ High-res PDF, PNG & Vector SVG</li>
              <li>✓ Use your 2nd bonus poster anytime</li>
            </ul>

            {isPro ? (
              <div className="tier-pro-active-box">
                <div className="pro-unlocked-banner">
                  <span>
                    🎁 {credits} Ultra-HD {credits === 1 ? "Credit" : "Credits"} Available
                  </span>
                </div>
                {credits > 1 ? (
                  <p className="tier-bogo-hint">
                    Download this poster now. Your 2nd bonus poster can be created and downloaded next!
                  </p>
                ) : (
                  <p className="tier-bogo-hint">
                    🎉 This is your 2nd bonus poster download! Enjoy your matching set.
                  </p>
                )}
                <label className="branding-toggle-label">
                  <input
                    type="checkbox"
                    checked={includeCredits}
                    onChange={(e) => setIncludeCredits(e.target.checked)}
                  />
                  <span>Discreet MAPARTE signature at bottom</span>
                </label>
                <button
                  type="button"
                  className="tier-btn tier-btn--pro"
                  disabled={isExporting}
                  onClick={handleProDownload}
                >
                  {isExporting ? (
                    <LoaderIcon className="is-spinning" />
                  ) : (
                    <DownloadIcon />
                  )}
                  <span>
                    Download Ultra-HD ({selectedFormat.toUpperCase()})
                  </span>
                </button>
              </div>
            ) : (
              <div className="tier-pro-purchase-box">
                <button
                  type="button"
                  className="tier-btn tier-btn--pro"
                  disabled={isExporting}
                  onClick={handlePaymentClick}
                >
                  <span>Pay $4.99 & Get 2 Posters</span>
                </button>
                <div className="tier-redeem-row">
                  {!showKeyInput ? (
                    <button
                      type="button"
                      className="redeem-toggle-btn"
                      onClick={() => setShowKeyInput(true)}
                    >
                      Already paid or have a code?
                    </button>
                  ) : (
                    <div className="redeem-input-group">
                      <input
                        type="text"
                        placeholder="Enter code (e.g. MAPARTEPRO)"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                      />
                      <button type="button" onClick={handleActivateKey}>
                        Apply
                      </button>
                    </div>
                  )}
                  {keyError && <p className="redeem-error">{keyError}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="download-modal-footer">
          <p>Instant digital download • Buy 1 Get 1 Free • 100% secure payment</p>
        </div>
      </div>
    </div>
  );
}
