import { useState } from "react";
import { DownloadIcon } from "@/shared/ui/Icons";
import DownloadModal from "./DownloadModal";

interface ExportFabProps {
  isMobile: boolean;
}

export default function ExportFab({ isMobile }: ExportFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerClass = isMobile
    ? "mobile-export-fab-trigger"
    : "export-fab-trigger-desktop";

  return (
    <>
      <button
        type="button"
        className={triggerClass}
        aria-label="Export poster"
        title="Export poster"
        onClick={() => setIsOpen(true)}
      >
        <DownloadIcon />
        <span>Download</span>
      </button>

      <DownloadModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
