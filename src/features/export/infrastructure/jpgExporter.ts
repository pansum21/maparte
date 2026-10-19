/**
 * Exports an HTMLCanvasElement as a high-quality JPEG Blob.
 */
export async function createJpgBlob(
  canvas: HTMLCanvasElement,
  quality: number = 0.95,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create JPG blob from canvas."));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}
