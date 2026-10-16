import { useEffect, useState } from "react";
import { DownloadIcon } from "@/shared/ui/Icons";
import DownloadModal from "./DownloadModal";

interface ExportFabProps {
  isMobile: boolean;
}

export default function ExportFab({ isMobile }: ExportFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggerVisible, setIsTriggerVisible] = useState(true);

  useEffect(() => {
    if (!isMobile) return;

    const FOOTER_OVERLAP_THRESHOLD_PX = 140;

    const updateVisibility = () => {
      const doc = document.documentElement;
      const scrolledToBottom =
        window.scrollY + window.innerHeight >=
        doc.scrollHeight - FOOTER_OVERLAP_THRESHOLD_PX;
      setIsTriggerVisible(!scrolledToBottom);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [isMobile]);

  const triggerClass = isMobile
    ? `mobile-export-fab-trigger${isTriggerVisible ? "" : " is-hidden"}`
    : "export-fab-trigger-desktop";

  return (
    <>
      <button
        type="button"
        className={triggerClass}
        aria-label="Export poster"
        title="Export poster"
        onClick={() => setIsOpen(true)}
        tabIndex={isMobile && !isTriggerVisible ? -1 : 0}
        aria-hidden={isMobile && !isTriggerVisible}
      >
        <DownloadIcon />
        {!isMobile && <span>Download</span>}
      </button>

      <DownloadModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
