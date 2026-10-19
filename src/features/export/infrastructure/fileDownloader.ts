import type { IFileDownloader } from "../domain/ports";

const webFileDownloader: IFileDownloader = {
  async downloadBlob(blob: Blob, filename: string): Promise<void> {
    const isMobileDevice =
      typeof navigator !== "undefined" &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (typeof window !== "undefined" && "Capacitor" in window));

    if (isMobileDevice && typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([blob], filename, {
          type: blob.type || "application/octet-stream",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: `MapArte Export: ${filename}`,
          });
          return;
        }
      } catch (shareErr) {
        if ((shareErr as Error)?.name === "AbortError") {
          return;
        }
        console.warn("Mobile share fallback to direct download anchor:", shareErr);
      }
    }

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // On mobile browsers (Android Chrome, iOS Safari), the download manager reads the blob asynchronously.
    // Revoking the object URL immediately severs the stream mid-flight, causing truncated/half downloads.
    setTimeout(() => {
      link.remove();
    }, 1500);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  },
};

let _downloader: IFileDownloader = webFileDownloader;

export function setFileDownloader(downloader: IFileDownloader): void {
  _downloader = downloader;
}

export function getFileDownloader(): IFileDownloader {
  return _downloader;
}

export function triggerDownloadBlob(
  blob: Blob,
  filename: string,
): Promise<void> {
  return _downloader.downloadBlob(blob, filename);
}
