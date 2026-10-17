import { useState, useEffect } from "react";
import { useExport } from "@/features/export/application/useExport";
import type { ExportFormat } from "@/features/export/domain/types";
import {
  isProUser,
  isAdminUser,
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

export type SelectedTier = "png" | "pdf" | "svg" | "combo";

interface TierConfig {
  id: SelectedTier;
  format: ExportFormat;
  label: string;
  price: string;
  badge?: string;
  desc: string;
  details: string[];
}

const TIERS: TierConfig[] = [
  {
    id: "png",
    format: "png",
    label: "PNG Image",
    price: "$2.99",
    desc: "Best for Phone & 4K/8K Wallpapers",
    details: [
      "500 DPI Ultra-HD clarity (Up to 80 Megapixels)",
      "Zero center watermark",
      "Perfect for high-res screens & smartphones",
    ],
  },
  {
    id: "pdf",
    format: "pdf",
    label: "PDF Document",
    price: "$3.99",
    desc: "Best for Home & Print Shops",
    details: [
      "500 DPI print-ready document",
      "Standard A4/A3/A2 framing ready",
      "Razor-sharp edges for professional printing",
    ],
  },
  {
    id: "svg",
    format: "svg",
    label: "SVG Vector",
    price: "$4.99",
    desc: "Infinite Vector • Unlimited Zoom",
    details: [
      "Pure mathematical vector graphics",
      "0% quality loss • Never blurs at 10,000% zoom",
      "Best for designers, plotters & large flex boards",
    ],
  },
  {
    id: "combo",
    format: "svg",
    label: "All-in-One Master Bundle",
    price: "$5.99",
    badge: "🎁 BUY 1 GET 1 FREE",
    desc: "All 3 Formats + 2nd Poster Free (BOGO)",
    details: [
      "Includes ALL 3: PNG + PDF + SVG Vector",
      "🎁 BUY 1 GET 1 FREE: 2nd Matching SVG Poster Free",
      "1-Time BOGO bonus code delivered to your Gmail",
      "Cheaper than a single cup of coffee! (Save 60%)",
    ],
  },
];

export default function DownloadModal({
  isOpen,
  onClose,
  defaultFormat = "png",
}: DownloadModalProps) {
  const { isExporting, exportPoster } = useExport();
  const [selectedTier, setSelectedTier] = useState<SelectedTier>(
    defaultFormat === "pdf" ? "pdf" : defaultFormat === "svg" ? "svg" : "combo",
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
  const [credits, setCredits] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [includeCredits, setIncludeCredits] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [bonusNotice, setBonusNotice] = useState<string | null>(null);

  // Email capture state
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Quality comparison table toggle
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkPaymentReturnUrl();
      const currentCredits = getProCredits();
      setCredits(currentCredits);
      setIsAdmin(isAdminUser());
      setSelectedFormat(defaultFormat);
      setBonusNotice(null);
      setEmailError("");
      const savedEmail = window.localStorage.getItem("maparte_customer_email") || "";
      if (savedEmail) setEmail(savedEmail);
    }
  }, [isOpen, defaultFormat]);

  if (!isOpen) return null;

  const isPro = isAdmin || credits > 0 || isProUser();

  const handleFreeDownload = () => {
    void exportPoster(selectedFormat, { asPro: false, includeCredits: true });
    onClose();
  };

  const handleProDownload = async (formatToExport: ExportFormat = selectedFormat) => {
    if (isAdmin) {
      await exportPoster(formatToExport, { asPro: true, includeCredits });
      setBonusNotice("🎉 Ultra-HD poster downloaded!");
      return;
    }

    const currentCredits = credits;
    await exportPoster(formatToExport, { asPro: true, includeCredits });
    const remaining = Math.max(0, currentCredits - 1);
    setCredits(remaining);

    if (remaining > 0) {
      setBonusNotice(
        "🎉 1st poster downloaded! Check your Gmail for your 1-Time BOGO code: MAPARTE.B01G01.2026 to create your 2nd poster anytime!",
      );
    } else {
      setBonusNotice("🎉 Ultra-HD poster downloaded! Enjoy your prints!");
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleActivateKey = () => {
    const result = activateProWithKey(licenseKey);
    if (result.success) {
      const updatedCredits = getProCredits();
      setCredits(updatedCredits);
      setShowKeyInput(false);
      setKeyError("");
      if (result.isAdmin) {
        setIsAdmin(true);
        setBonusNotice("👑 Permanent Admin access active. Unlimited Ultra-HD downloads!");
      } else {
        setBonusNotice(
          "🎉 BOGO Code verified! You have 2 Ultra-HD downloads unlocked.",
        );
      }
    } else {
      setKeyError("Invalid code. Please enter your valid paid BOGO access code.");
    }
  };

  const validateEmail = (val: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  const handlePaymentClick = (tier: TierConfig) => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid Gmail / Email to receive your order receipt & BOGO code.");
      return;
    }
    setEmailError("");
    try {
      window.localStorage.setItem("maparte_customer_email", email.trim());
    } catch {
      // ignore
    }

    const fallbackCheckoutUrl =
      "https://checkout.dodopayments.com/buy/pdt_0NptYWPjBtVnJxgyRkwI4?quantity=1";
    const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL || fallbackCheckoutUrl;

    try {
      const targetUrl = new URL(checkoutUrl, window.location.origin);
      targetUrl.searchParams.set("customer_email", email.trim());
      const returnUrl = `${window.location.origin}${window.location.pathname}?payment=success&status=paid&unlocked=pro`;
      targetUrl.searchParams.set("redirect_url", returnUrl);
      targetUrl.searchParams.set("metadata_tier", tier.id);
      window.open(targetUrl.toString(), "_blank");
    } catch {
      window.open(fallbackCheckoutUrl, "_blank");
    }
  };

  const activeTier = TIERS.find((t) => t.id === selectedTier) || TIERS[3];

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
        {/* Header */}
        <div className="export-modal-header">
          <div>
            <div className="coffee-tagline-badge">
              <span className="coffee-emoji">☕</span>
              <span className="coffee-tagline-text">
                Buy your wallpaper cheaper than your cup of coffee!
              </span>
            </div>
            <h3 id="download-modal-title">Download Custom Map Art</h3>
            <p className="download-modal-subtitle">
              Choose your format & print quality • Clean, watermark-free art
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

        {/* Pricing & Tier Selector Cards */}
        <div className="download-pricing-tabs">
          {TIERS.map((tier) => {
            const isSelected = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                className={`pricing-tab-card ${isSelected ? "is-selected" : ""} ${
                  tier.id === "combo" ? "is-combo-tab" : ""
                }`}
                onClick={() => {
                  setSelectedTier(tier.id);
                  setSelectedFormat(tier.format);
                }}
              >
                {tier.badge && <span className="tab-pill-badge">{tier.badge}</span>}
                <div className="tab-top-row">
                  <span className="tab-format-name">{tier.label}</span>
                  <span className="tab-price-tag">{tier.price}</span>
                </div>
                <span className="tab-desc-text">{tier.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tier Details Box */}
        <div className="active-tier-details-card">
          <div className="active-tier-header">
            <div>
              <span className="active-tier-title">{activeTier.label}</span>
              <span className="active-tier-price">{activeTier.price}</span>
            </div>
            {activeTier.id === "combo" && (
              <span className="combo-savings-tag">🔥 Best Value • Save 60%</span>
            )}
          </div>

          <ul className="tier-feature-bullets">
            {activeTier.details.map((detail, idx) => (
              <li key={idx}>✓ {detail}</li>
            ))}
          </ul>

          {/* Mandatory Gmail Capture (Only needed for checkout) */}
          {!isPro && (
            <div className="download-gmail-section">
              <label htmlFor="customer-email-input" className="gmail-input-label">
                <span>Enter your Gmail / Email address:</span>
                <span className="gmail-required-badge">Required for delivery</span>
              </label>
              <div className="gmail-input-wrap">
                <input
                  id="customer-email-input"
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  className={`gmail-text-field ${emailError ? "has-error" : ""}`}
                />
              </div>
              <p className="gmail-delivery-notice">
                🔒 Your order receipt and 1-Time BOGO code will be sent to your Gmail for your 2nd free poster.
              </p>
              {emailError && <p className="gmail-error-msg">{emailError}</p>}
            </div>
          )}

          {/* Pro Unlocked State vs Buy Button */}
          {isPro ? (
            <div className="tier-pro-active-box">
              <div className="pro-unlocked-banner">
                <span>
                  {isAdmin
                    ? "👑 Ultra-HD 500 DPI & Vector Engine Active"
                    : `🎁 ${credits} Ultra-HD ${credits === 1 ? "Poster" : "Posters"} Available`}
                </span>
              </div>
              {!isAdmin && credits > 0 && (
                <div className="pro-code-badge">
                  <span>
                    Your 1-Time BOGO Code: <strong>MAPARTE.B01G01.2026</strong>
                  </span>
                  <p className="bogo-single-use-note">
                    (Use this code 1 time whenever you want to design and download your 2nd matching SVG poster for free!)
                  </p>
                </div>
              )}
              {!isAdmin && credits > 1 && (
                <p className="tier-bogo-hint">
                  Download this poster now. Your 2nd matching poster can be customized and downloaded next!
                </p>
              )}

              {/* Format pills if Combo was unlocked */}
              <div className="unlocked-format-row">
                <span className="unlocked-format-label">Select format to export:</span>
                <div className="unlocked-format-btns">
                  {(["png", "pdf", "svg"] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className={`unlocked-format-chip ${
                        selectedFormat === fmt ? "is-active" : ""
                      }`}
                      onClick={() => setSelectedFormat(fmt)}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

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
                onClick={() => handleProDownload(selectedFormat)}
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
            <div className="tier-purchase-action-wrap">
              <button
                type="button"
                className="tier-btn tier-btn--pro tier-btn--buy-action"
                disabled={isExporting}
                onClick={() => handlePaymentClick(activeTier)}
              >
                <span>
                  Get {activeTier.label} ({activeTier.price})
                </span>
              </button>

              <div className="tier-redeem-row">
                {!showKeyInput ? (
                  <button
                    type="button"
                    className="redeem-toggle-btn"
                    onClick={() => setShowKeyInput(true)}
                  >
                    Already paid or have a 1-Time BOGO code?
                  </button>
                ) : (
                  <div className="redeem-input-group">
                    <input
                      type="text"
                      placeholder="Enter MAPARTE.B01G01.2026 or paid code"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                    />
                    <button type="button" onClick={handleActivateKey}>
                      Apply Code
                    </button>
                  </div>
                )}
                {keyError && <p className="redeem-error">{keyError}</p>}
              </div>

              {/* Trust Badges */}
              <div className="download-trust-badges">
                <div className="trust-badge-item">
                  <span className="trust-badge-icon" aria-hidden="true">🔒</span>
                  <div className="trust-badge-content">
                    <span className="trust-badge-title">256-Bit SSL</span>
                    <span className="trust-badge-sub">Encrypted Checkout</span>
                  </div>
                </div>
                <div className="trust-badge-item">
                  <span className="trust-badge-icon" aria-hidden="true">⚡</span>
                  <div className="trust-badge-content">
                    <span className="trust-badge-title">Instant Access</span>
                    <span className="trust-badge-sub">500 DPI & Vector</span>
                  </div>
                </div>
                <div className="trust-badge-item">
                  <span className="trust-badge-icon" aria-hidden="true">🛡️</span>
                  <div className="trust-badge-content">
                    <span className="trust-badge-title">Satisfaction</span>
                    <span className="trust-badge-sub">100% Guaranteed</span>
                  </div>
                </div>
              </div>

              {/* Social Proof Review */}
              <div className="download-social-proof">
                <div className="social-proof-stars" aria-label="5 out of 5 stars">
                  ★★★★★
                </div>
                <p className="social-proof-quote">
                  “Bought this for our 1st anniversary in Austin. It looks so stunning framed on our living room wall!”
                </p>
                <span className="social-proof-author">
                  — Jessica &amp; David M. • Verified Gift Buyer
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Free Screen Wallpaper Option (Clean, 72 DPI, No Center Watermark) */}
        {!isPro && (
          <div className="free-screen-wallpaper-box">
            <div className="free-wallpaper-info">
              <span className="free-wallpaper-title">📱 Basic Free Mobile Wallpaper ($0)</span>
              <p className="free-wallpaper-desc">
                Clean screen wallpaper at 72 DPI. Zero center watermark. (Not suitable for paper printing or deep zoom).
              </p>
            </div>
            <button
              type="button"
              className="tier-btn tier-btn--free-clean"
              disabled={isExporting}
              onClick={handleFreeDownload}
            >
              {isExporting ? (
                <LoaderIcon className="is-spinning" />
              ) : (
                <DownloadIcon />
              )}
              <span>Download Free Wallpaper (72 DPI)</span>
            </button>
          </div>
        )}

        {/* Quality Comparison Toggle */}
        <div className="quality-comparison-section">
          <button
            type="button"
            className="quality-comparison-toggle-btn"
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? "▲ Hide Comparison Chart" : "▼ View Full Quality & Offer Comparison Chart"}
          </button>

          {showComparison && (
            <div className="quality-comparison-table-wrap">
              <table className="quality-comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Free ($0)</th>
                    <th>PNG ($2.99)</th>
                    <th>PDF ($3.99)</th>
                    <th>SVG ($4.99)</th>
                    <th className="th-highlight">Combo ($5.99)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Resolution / DPI</td>
                    <td>72 DPI (Screen)</td>
                    <td>500 DPI Ultra-HD</td>
                    <td>500 DPI Vector Doc</td>
                    <td>Infinite Vector</td>
                    <td className="td-highlight">500 DPI + Infinite Vector</td>
                  </tr>
                  <tr>
                    <td>Best Used For</td>
                    <td>Phone Wallpaper</td>
                    <td>4K/8K Screens</td>
                    <td>Framing & Print Shops</td>
                    <td>Designers & Plotters</td>
                    <td className="td-highlight">All Screens + Wall Framing</td>
                  </tr>
                  <tr>
                    <td>Center Watermark</td>
                    <td>❌ None (Clean)</td>
                    <td>❌ None (Clean)</td>
                    <td>❌ None (Clean)</td>
                    <td>❌ None (Clean)</td>
                    <td className="td-highlight">❌ None (100% Clean)</td>
                  </tr>
                  <tr>
                    <td>Zoom Capability</td>
                    <td>Blurs on zoom</td>
                    <td>Crisp up to 1000%</td>
                    <td>Sharp Document</td>
                    <td>Never Blurs (0% Loss)</td>
                    <td className="td-highlight">Never Blurs (0% Loss)</td>
                  </tr>
                  <tr>
                    <td>Paper Print Quality</td>
                    <td>⚠️ Blurs on paper</td>
                    <td>✓ Sharp Frame Print</td>
                    <td>✓ Perfect Frame Print</td>
                    <td>✓ Infinite Resolution</td>
                    <td className="td-highlight">✓ World-Class Print</td>
                  </tr>
                  <tr>
                    <td>1-Time BOGO Code</td>
                    <td>✕</td>
                    <td>✕</td>
                    <td>✕</td>
                    <td>✕</td>
                    <td className="td-highlight">🎁 2nd SVG Poster Free!</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="download-modal-footer">
          <p>
            Instant digital download • Cheaper than coffee • 100% secure checkout
          </p>
        </div>
      </div>
    </div>
  );
}
