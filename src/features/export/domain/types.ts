export type ExportFormat = "png" | "jpg" | "tiff" | "image_bundle" | "pdf" | "svg" | "zip";

export interface ExportOptions {
  widthCm: number;
  heightCm: number;
}
