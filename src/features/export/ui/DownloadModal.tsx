import { useState, useEffect } from "react";
import { useExport } from "@/features/export/application/useExport";
import type { ExportFormat } from "@/features/export/domain/types";
import { checkPaymentReturnUrl } from "@/features/export/infrastructure/planTier";
import { CloseIcon, DownloadIcon, LoaderIcon } from "@/shared/ui/Icons";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { resolveCanvasSize } from "@/features/poster/infrastructure/renderer/canvas";
import { getLayoutOption } from "@/features/layout/infrastructure/layoutRepository";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFormat?: ExportFormat;
}

export type SelectedTier = "png" | "jpg" | "duo" | "pdf" | "svg" | "combo";

interface TierConfig {
  id: SelectedTier;
  format: ExportFormat;
  label: string;
  price: string;
  badge?: string;
  desc: string;
  included: string[];
  notIncluded: string[];
}

const TIERS: TierConfig[] = [
  {
    id: "png",
    format: "png",
    label: "PNG Image",
    price: "Unavailable",
    desc: "Best for Phone & 4K/8K Wallpapers",
    included: [
      "Up to 500 PPI at supported print sizes; exact file resolution depends on size and device",
      "Lossless pixel-perfect lines & crisp street fonts",
      "PNG pixel dimensions are sized for the selected print format",
      "Permanent MapArte studio signature branding",
    ],
    notIncluded: [
      "No JPG file included",
      "No PDF print file for commercial print shops",
      "No raw mathematical SVG vector source code",
    ],
  },
  {
    id: "jpg",
    format: "jpg",
    label: "JPG Image",
    price: "Unavailable",
    desc: "Compact & Light for Social Sharing",
    included: [
      "Up to 500 PPI at supported print sizes; actual density is embedded in the JPG",
      "Easy to share on WhatsApp, Instagram & digital frames",
      "Compatible with legacy photo printing labs",
      "Permanent MapArte studio signature branding",
    ],
    notIncluded: [
      "No lossless PNG file included",
      "No PDF print file for commercial print shops",
      "No raw mathematical SVG vector source code",
    ],
  },
  {
    id: "duo",
    format: "image_bundle",
    label: "PNG + JPG Duo Pack",
    price: "Unavailable",
    badge: "TWO FORMATS",
    desc: "Both Image Formats (PNG + JPG) in 1 Pack",
    included: [
      "PNG + JPG exports with actual pixel-density metadata for the selected print size",
      "Use the lossless PNG for editing and JPG for smaller sharing files",
      "Two image formats in one package",
      "Permanent MapArte studio signature branding",
    ],
    notIncluded: [
      "No PDF print file for commercial print shops",
      "No raw mathematical SVG vector source code",
    ],
  },
  {
    id: "pdf",
    format: "pdf",
    label: "PDF Document",
    price: "Unavailable",
    desc: "Best for Home & Print Shops",
    included: [
      "Print-sized PDF; effective PPI follows the embedded image pixels and selected size",
      "Standard A4/A3/A2 framing ready with razor-sharp typography",
      "Ideal for local printers (FedEx, Staples, Printo) & fine art paper",
      "Permanent MapArte studio signature branding",
    ],
    notIncluded: [
      "No raw SVG vector geometry for CAD/plotters",
    ],
  },
  {
    id: "svg",
    format: "svg",
    label: "SVG Vector",
    price: "Unavailable",
    desc: "Scalable Vector SVG",
    included: [
      "Vector map paths and typography scale without raster pixelation",
      "Map detail depends on the underlying map data and rendered features",
      "Layered paths for Adobe Illustrator, CAD, CNC & laser cutters",
      "Permanent MapArte studio signature branding",
    ],
    notIncluded: [
      "Single format purchase (no pre-compiled PDF/PNG included)",
    ],
  },
  {
    id: "combo",
    format: "zip",
    label: "All-in-One Master Bundle",
    price: "Unavailable",
    desc: "All Formats (PNG+JPG+PDF+SVG)",
    included: [
      "PNG/JPG with actual density metadata, print-sized PDF and vector SVG in one ZIP",
      "Combined file formats in one ZIP",
      "Permanent MapArte studio signature branding",
    ],
    notIncluded: [],
  },
];

export default function DownloadModal({
  isOpen,
  onClose,
  defaultFormat = "png",
}: DownloadModalProps) {
  const { isExporting, exportPoster } = useExport();
  const { state } = usePosterContext();
  const { form } = state;
  const widthCm = Number(form.width) || 21;
  const heightCm = Number(form.height) || 29.7;
  const widthInches = widthCm / 2.54;
  const heightInches = heightCm / 2.54;
  const canvasSize = resolveCanvasSize(widthInches, heightInches, 500);
  const megapixels = ((canvasSize.width * canvasSize.height) / 1e6).toFixed(1);
  const layoutOption = getLayoutOption(form.layout);
  const layoutName = layoutOption ? layoutOption.name : `${widthCm} × ${heightCm} cm`;
  const resolveInitialTier = (fmt: ExportFormat): SelectedTier => {
    if (fmt === "jpg") return "jpg";
    if (fmt === "image_bundle") return "duo";
    if (fmt === "pdf") return "pdf";
    if (fmt === "svg") return "svg";
    if (fmt === "zip") return "combo";
    return "png";
  };

  const resolveInitialFormat = (fmt: ExportFormat): ExportFormat => {
    if (fmt === "jpg") return "jpg";
    if (fmt === "image_bundle") return "image_bundle";
    if (fmt === "pdf") return "pdf";
    if (fmt === "svg") return "svg";
    if (fmt === "zip") return "zip";
    return "png";
  };

  const [selectedTier, setSelectedTier] = useState<SelectedTier>(
    resolveInitialTier(defaultFormat),
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    resolveInitialFormat(defaultFormat),
  );
  // Quality comparison table toggle

  useEffect(() => {
    if (isOpen) {
      checkPaymentReturnUrl();
      setSelectedTier(resolveInitialTier(defaultFormat));
      setSelectedFormat(resolveInitialFormat(defaultFormat));    }
  }, [isOpen, defaultFormat]);

  if (!isOpen) return null;

  const handleFreeDownload = () => {
    void exportPoster("png", {
      asPro: false,
      includeCredits: true,
      targetSizeCm: { widthCm: 14.4, heightCm: 31.2 },
      targetDpi: 192,
    });
    onClose();
  };

  const handleTierSelect = (tier: TierConfig) => {
    setSelectedTier(tier.id);
    setSelectedFormat(tier.format);
  };

  const handleFormatSelect = (fmt: ExportFormat) => {
    setSelectedFormat(fmt);
    setSelectedTier(resolveInitialTier(fmt));
  };

  const activeTier = TIERS.find((t) => t.id === selectedTier) || TIERS[0];

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
                Free phone wallpaper available
              </span>
            </div>
            <h3 id="download-modal-title">Download Custom Map Art</h3>
            <p className="download-modal-subtitle">
              Select a format to preview its details. Paid file downloads are temporarily unavailable.
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

        {/* Explore First Banner */}
        <div className="explore-first-banner" role="status">
          <span className="explore-first-icon" aria-hidden="true">🎨</span>
          <div className="explore-first-content">
            <strong>Before you download, explore the editor:</strong> Try another theme, layout, border, or map detail while everything is still editable. Find the version you love first, then save it.
          </div>
        </div>

        {/* Live File Specifications for Currently Selected Poster */}
        <div className="selected-spec-box" role="region" aria-label="Exact File Specifications">
          <div className="selected-spec-header">
            <span className="spec-badge">📍 Exact File Specifications</span>
            <span className="spec-layout-tag">{layoutName}</span>
          </div>
          <div className="selected-spec-grid">
            <div className="spec-item">
              <span className="spec-label">Print Size</span>
              <strong className="spec-value">{widthCm} × {heightCm} cm ({widthInches.toFixed(1)}" × {heightInches.toFixed(1)}")</strong>
            </div>
            <div className="spec-item">
              <span className="spec-label">Pixel Dimensions</span>
              <strong className="spec-value">{canvasSize.width} × {canvasSize.height} px ({megapixels} MP)</strong>
            </div>
            <div className="spec-item">
              <span className="spec-label">Effective Density</span>
              <strong className="spec-value">{canvasSize.effectiveDpi} PPI</strong>
            </div>
            <div className="spec-item">
              <span className="spec-label">Print Quality Standard</span>
              <strong className="spec-value">
                {canvasSize.effectiveDpi >= 300
                  ? "✓ Exceeds 300 DPI Lab Standard"
                  : "✓ Optimized for Large Wall Viewing"}
              </strong>
            </div>
          </div>
          <div className="spec-disclaimer">
            <span>🛡️ <strong>100% Calibrated Reality:</strong> File downloads contain these exact rendered pixel dimensions and embedded physical density metadata (PNG pHYs / JPG JFIF / PDF MediaBox). Scalable vector SVG contains mathematical paths.</span>
          </div>
        </div>

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
                onClick={() => handleTierSelect(tier)}
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
              <span className="combo-savings-tag">Paid downloads temporarily unavailable</span>
            )}
          </div>

          <div className="tier-breakdown-box">
            <div className="tier-breakdown-col tier-breakdown-col--included">
              <span className="tier-breakdown-heading">✓ Included:</span>
              <ul className="tier-feature-bullets">
                {activeTier.included.map((item, idx) => (
                  <li key={idx} className="feature-item--included">
                    <span className="bullet-check">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {activeTier.notIncluded.length > 0 && (
              <div className="tier-breakdown-col tier-breakdown-col--excluded">
                <span className="tier-breakdown-heading">✕ Not Included:</span>
                <ul className="tier-feature-bullets">
                  {activeTier.notIncluded.map((item, idx) => (
                    <li key={idx} className="feature-item--excluded">
                      <span className="bullet-cross">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Format selection chips (100% two-way synchronized with top cards) */}
          <div className="unlocked-format-row">
            <span className="unlocked-format-label">Select format:</span>
            <div className="unlocked-format-btns">
              <button
                type="button"
                className={`unlocked-format-chip ${
                  selectedFormat === "png" ? "is-active" : ""
                }`}
                onClick={() => handleFormatSelect("png")}
                title="High-resolution PNG image"
              >
                PNG
              </button>
              <button
                type="button"
                className={`unlocked-format-chip ${
                  selectedFormat === "jpg" ? "is-active" : ""
                }`}
                onClick={() => handleFormatSelect("jpg")}
                title="High-resolution compact JPG image"
              >
                JPG
              </button>
              <button
                type="button"
                className={`unlocked-format-chip combo-zip-chip ${
                  selectedTier === "duo" || selectedFormat === "image_bundle"
                    ? "is-active"
                    : ""
                }`}
                onClick={() => handleFormatSelect("image_bundle")}
                title="Both PNG + JPG in 1 ZIP"
              >
                📦 DUO (.ZIP)
              </button>
              <button
                type="button"
                className={`unlocked-format-chip ${
                  selectedFormat === "pdf" ? "is-active" : ""
                }`}
                onClick={() => handleFormatSelect("pdf")}
                title="Print-sized PDF document"
              >
                PDF
              </button>
              <button
                type="button"
                className={`unlocked-format-chip ${
                  selectedFormat === "svg" ? "is-active" : ""
                }`}
                onClick={() => handleFormatSelect("svg")}
                title="Scalable Vector Graphics SVG"
              >
                SVG
              </button>
              <button
                type="button"
                className={`unlocked-format-chip combo-zip-chip ${
                  selectedTier === "combo" || selectedFormat === "zip"
                    ? "is-active"
                    : ""
                }`}
                onClick={() => handleFormatSelect("zip")}
                title="All 4 Formats in 1 Master Bundle ZIP"
              >
                📦 ALL 4 IN 1 (.ZIP)
              </button>
            </div>
          </div>

          <div className="tier-purchase-action-wrap" role="status">
            <p className="tier-upgrade-notice">
              Paid downloads and checkout are temporarily unavailable. You can still download the free phone wallpaper below.
            </p>
          </div>
        </div>

        {/* Free screen wallpaper option */}
        {/* Free screen wallpaper option */}
        <div className="free-screen-wallpaper-box">
            <div className="free-wallpaper-info">
              <span className="free-wallpaper-title">📱 Free Phone Wallpaper ($0)</span>
              <p className="free-wallpaper-desc">
                A free phone-sized PNG for your lock or home screen. Explore the editor first to try themes, layouts, borders, and map details before downloading.
              </p>
              <p className="free-wallpaper-desc free-wallpaper-desc--excluded">
                Phone wallpaper quality is optimized for screens and is not a print-resolution file.
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
              <span>Download Free Wallpaper (PNG)</span>
            </button>
        </div>

        <div className="download-modal-footer">
          <p>
            Paid downloads and checkout are currently unavailable.
          </p>
        </div>
      </div>
    </div>
  );
}
