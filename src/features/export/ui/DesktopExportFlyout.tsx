import { useState } from "react";
import type { ExportFormat } from "@/features/export/domain/types";
import { DownloadIcon } from "@/shared/ui/Icons";
import DownloadModal from "./DownloadModal";

const FLYOUT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "svg", label: "RSVG" },
  { format: "pdf", label: "PDF" },
];

export default function DesktopExportFlyout() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("png");

  const openModal = (format: ExportFormat) => {
    setActiveFormat(format);
    setIsOpen(true);
  };

  return (
    <>
      <div className="desktop-export-fab">
        <div className="desktop-export-flyout">
          {FLYOUT_FORMATS.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              className={`desktop-export-btn desktop-export-btn--${format}`}
              onClick={() => openModal(format)}
            >
              <DownloadIcon className="desktop-export-btn-icon" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="desktop-export-btn desktop-export-btn--primary"
          onClick={() => openModal("png")}
        >
          <DownloadIcon className="desktop-export-btn-icon" />
          <span className="desktop-export-label-default">Download</span>
          <span className="desktop-export-label-hover">PNG</span>
        </button>
      </div>

      <DownloadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultFormat={activeFormat}
      />
    </>
  );
}
