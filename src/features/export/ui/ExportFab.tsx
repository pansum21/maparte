import { useEffect, useState } from "react";
import { DownloadIcon } from "@/shared/ui/Icons";
import DownloadModal from "./DownloadModal";

interface ExportFabProps {
  isMobile: boolean;
  /** Phone-only floating trigger; the desktop Download control lives in the editor's left rail. */
  showTrigger: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export default function ExportFab({ isMobile, showTrigger, isOpen, onOpen, onClose }: ExportFabProps) {
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

  return (
    <>
      {isMobile && showTrigger ? (
        <button
          type="button"
          className={`mobile-export-fab-trigger${isTriggerVisible ? "" : " is-hidden"}`}
          aria-label="Export poster"
          title="Export poster"
          onClick={onOpen}
          tabIndex={isTriggerVisible ? 0 : -1}
          aria-hidden={!isTriggerVisible}
        >
          <DownloadIcon />
        </button>
      ) : null}

      <DownloadModal isOpen={isOpen} onClose={onClose} />
    </>
  );
}
