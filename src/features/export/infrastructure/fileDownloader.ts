import type { IFileDownloader } from "../domain/ports";

const webFileDownloader: IFileDownloader = {
  async downloadBlob(blob: Blob, filename: string): Promise<void> {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
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
