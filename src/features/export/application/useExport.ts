import { useCallback, useMemo } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import {
  SUPPORT_PROMPT_EVENT,
  type SupportPromptVariant,
} from "@/features/export/application/supportPrompt";
import { captureMapAsCanvas } from "@/features/export/infrastructure/mapExporter";
import { createLayeredSvgBlobFromMap } from "@/features/export/infrastructure/layeredSvgExporter";
import JSZip from "jszip";
import { localStorageCache } from "@/core/cache/localStorageCache";
import type { ExportFormat } from "@/features/export/domain/types";
import { createTiffBlob } from "@/features/export/infrastructure/tiffExporter";
import {
  isProUser,
  applyFreeTier,
  FREE_DPI,
  consumeProCredit,
} from "@/features/export/infrastructure/planTier";
import { compositeExport } from "@/features/poster/infrastructure/renderer";
import { resolveCanvasSize } from "@/features/poster/infrastructure/renderer/canvas";
import { readNeatlineSelection, getPosterBorderMetrics } from "@/features/layout/ui/NeatlinePicker";
import { getAllMarkerIcons } from "@/features/markers/infrastructure/iconRegistry";
import { ensureFont } from "@/core/services";
import {
  createPngBlob,
  createJpgBlob,
  createPdfBlobFromCanvas,
  createPosterFilename,
  triggerDownloadBlob,
} from "@/core/services";
import {
  CM_PER_INCH,
  DEFAULT_POSTER_WIDTH_CM,
  DEFAULT_POSTER_HEIGHT_CM,
} from "@/core/config";
import { trackEvent, setUserProperty } from "@/core/services";
import { dispatchTelemetryAlert } from "@/core/telemetry/sentinel";

export { SUPPORT_PROMPT_EVENT } from "@/features/export/application/supportPrompt";
export type {
  SupportPromptState,
  SupportPromptVariant,
} from "@/features/export/application/supportPrompt";

const EXPORT_COUNT_STORAGE_KEY = "maparte.poster.count";

function addPpiToFilename(filename: string, ppi: number): string {
  const extensionIndex = filename.lastIndexOf(".");
  if (extensionIndex < 0) return `${filename}_${ppi}PPI`;
  return `${filename.slice(0, extensionIndex)}_${ppi}PPI${filename.slice(extensionIndex)}`;
}

async function getSelectedNeatlineSvg(): Promise<string | undefined> {
  const preview = document.querySelector<SVGSVGElement>(".preview-neatline");
  if (!preview) return undefined;
  const clone = preview.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBoxParts = (clone.getAttribute("viewBox") || "0 0 1000 1000").split(/\s+/);
  clone.setAttribute("width", viewBoxParts[2]);
  clone.setAttribute("height", viewBoxParts[3]);
  clone.setAttribute("preserveAspectRatio", "none");
  const embeddedAssets = new Map<string, Promise<string>>();
  await Promise.all(Array.from(clone.querySelectorAll("image")).map(async (image) => {
    const href = image.getAttribute("href") || image.getAttribute("xlink:href");
    if (!href) return;
    const absoluteHref = new URL(href, document.baseURI).href;
    try {
      let assetPromise = embeddedAssets.get(absoluteHref);
      if (!assetPromise) {
        assetPromise = (async () => {
          const response = await fetch(absoluteHref);
          if (!response.ok) throw new Error("Border asset unavailable");
          const blob = await response.blob();
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not embed border asset"));
            reader.onerror = () => reject(reader.error || new Error("Could not read border asset"));
            reader.readAsDataURL(blob);
          });
        })();
        embeddedAssets.set(absoluteHref, assetPromise);
      }
      const dataUrl = await assetPromise;
      image.setAttribute("href", dataUrl);
    } catch {
      // Keep same-origin assets visible in the preview/export renderer if
      // offline browser policy prevents embedding them into the SVG file.
      image.setAttribute("href", absoluteHref);
    }
  }));
  clone.removeAttribute("class");
  return new XMLSerializer().serializeToString(clone);
}

// Use a 1-year TTL so the export count persists across sessions.
const EXPORT_COUNT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

// Report time-to-first-export once per session (not per export).
let firstExportTimed = false;

// Timestamp of the last export this session, for measuring the gap between
// exports. Stays null until the first export, so the param is omitted then.
let lastExportAt: number | null = null;

/**
 * Fires the analytics for a successful export: the poster_exported event,
 * the once-per-session time-to-first-export, and the lifetime_export_count
 * user property (the current total, not a per-event log entry).
 */
function reportExportSuccess(
  nextCount: number,
  exportParams: Record<string, string | number | boolean>,
): void {
  trackEvent("poster_exported", exportParams);

  if (!firstExportTimed) {
    firstExportTimed = true;
    trackEvent("time_to_first_export", {
      seconds_to_first_export: Math.round(
        (Date.now() - performance.timeOrigin) / 1000,
      ),
    });
  }

  lastExportAt = Date.now();
  setUserProperty("lifetime_export_count", nextCount);
}

function readPosterExportCount(): number {
  const stored = localStorageCache.read<number>(
    EXPORT_COUNT_STORAGE_KEY,
    EXPORT_COUNT_TTL_MS,
  );
  if (typeof stored === "number" && Number.isFinite(stored) && stored >= 0) {
    return Math.floor(stored);
  }
  return 0;
}

function writePosterExportCount(nextCount: number): void {
  localStorageCache.write(EXPORT_COUNT_STORAGE_KEY, nextCount);
}

/**
 * Provides handlers for exporting the live poster preview as PNG or PDF.
 *
 * Flow:
 * 1. Resize MapLibre container to full export resolution.
 * 2. Wait for tiles at new resolution.
 * 3. Snapshot the WebGL canvas.
 * 4. Composite fades + text onto the snapshot.
 * 5. Download.
 */
export function useExport() {
  const { state, dispatch, effectiveTheme, mapRef } = usePosterContext();
  const { form } = state;
  const hasVisibleMarkers = form.showMarkers && state.markers.length > 0;
  const visibleRoutes = useMemo(
    () =>
      form.showRoutes
        ? state.routes.filter((route) => route.visible)
        : [],
    [form.showRoutes, state.routes],
  );
  const hasVisibleOverlays = hasVisibleMarkers || visibleRoutes.length > 0;

  const registerSuccessfulExport = useCallback((nextCount: number) => {
    writePosterExportCount(nextCount);

    // Prompt cadence: follow on the first download and every 5th after → 1, 6, 11, …
    // Donate lives in the header; ad interstitials are handled by Google's
    // vignette/Offerwall, not a custom modal.
    let variant: SupportPromptVariant | null = null;
    if ((nextCount - 1) % 5 === 0) variant = "follow";

    if (variant) {
      window.dispatchEvent(
        new CustomEvent(SUPPORT_PROMPT_EVENT, {
          detail: { posterNumber: nextCount, variant },
        }),
      );
    }
  }, []);

  const exportPoster = useCallback(
    async (
      format: ExportFormat,
      options?: {
        asPro?: boolean;
        includeCredits?: boolean;
        targetSizeCm?: { widthCm: number; heightCm: number };
        targetDpi?: number;
      },
    ) => {
      const map = mapRef.current;
      if (!map) {
        dispatch({ type: "SET_ERROR", error: "Map is not ready." });
        return;
      }

      dispatch({ type: "SET_EXPORT_STATUS", exporting: true });

      try {
        // Ensure font is loaded before compositing text
        if (form.showPosterText && form.fontFamily.trim()) {
          await ensureFont(form.fontFamily.trim());
        }
        await document.fonts.ready;

        const widthCm =
          options?.targetSizeCm?.widthCm ??
          (Number(form.width) || DEFAULT_POSTER_WIDTH_CM);
        const heightCm =
          options?.targetSizeCm?.heightCm ??
          (Number(form.height) || DEFAULT_POSTER_HEIGHT_CM);
        const isPro =
          options?.asPro !== undefined ? options.asPro : isProUser();
        const targetDpi = options?.targetDpi ?? (isPro ? 500 : FREE_DPI);
        const widthInches = widthCm / CM_PER_INCH;
        const heightInches = heightCm / CM_PER_INCH;
        // Permanent branding & studio signature on ALL downloads:
        const includeCredits = true;

        // Aggregate, non-personal export data. Use only the structured city /
        // country — never raw input (form.location) or coordinates.
        const nextCount = readPosterExportCount() + 1;
        const secondsBetweenExports =
          lastExportAt !== null
            ? Math.round((Date.now() - lastExportAt) / 1000)
            : null;
        const exportParams = {
          format,
          poster_city: form.displayCity.trim() || "unknown",
          poster_country: form.displayCountry.trim() || "unknown",
          theme: form.theme,
          poster_size: `${widthCm}x${heightCm}`,
          font: form.fontFamily.trim() || "default",
          has_markers: hasVisibleMarkers,
          has_routes: visibleRoutes.length > 0,
          export_number: nextCount,
          ...(secondsBetweenExports !== null
            ? { seconds_between_exports: secondsBetweenExports }
            : {}),
        };

        const size = resolveCanvasSize(widthInches, heightInches, targetDpi);
        const neatlineSvg = await getSelectedNeatlineSvg();
        const neatlineSelection = readNeatlineSelection();
        const borderMetrics = getPosterBorderMetrics(
          widthCm,
          heightCm,
          neatlineSelection.mapGapCm,
          neatlineSelection.lineId,
          neatlineSelection.thicknesses,
          neatlineSelection.designScale,
          neatlineSelection.showWhiteMat,
        );
        const showWhiteMat = Boolean(neatlineSelection.showWhiteMat);

        const lat = Number(form.latitude) || 0;
        const lon = Number(form.longitude) || 0;

        if (format === "svg") {
          const svgBlob = await createLayeredSvgBlobFromMap({
            map,
            exportWidth: size.width,
            exportHeight: size.height,
            theme: effectiveTheme,
            center: { lat, lon },
            displayCity: form.displayCity || form.location || "",
            displayCountry: form.displayCountry || "",
            customDate: form.customDate,
            fontFamily: form.fontFamily.trim(),
            fontSize: Number(form.fontSize) || 16,
            showPosterText: form.showPosterText,
            showOverlay: form.showMarkers,
            includeCredits,
            markers: hasVisibleMarkers ? state.markers : [],
            markerIcons: hasVisibleOverlays
              ? getAllMarkerIcons(state.customMarkerIcons, state.markers)
              : [],
            routes: visibleRoutes,
            neatlineSvg,
            showWhiteMat,
            matInsetXRatio: borderMetrics.matInsetXRatio,
            matInsetYRatio: borderMetrics.matInsetYRatio,
            mapInsetXRatio: borderMetrics.mapInsetXRatio,
            mapInsetYRatio: borderMetrics.mapInsetYRatio,
          });
          const svgFilename = createPosterFilename(
            form.displayCity || form.location,
            form.theme,
            "svg",
          );
          await triggerDownloadBlob(svgBlob, svgFilename);
          if (isPro) {
            consumeProCredit();
          }
          reportExportSuccess(nextCount, exportParams);
          registerSuccessfulExport(nextCount);
          dispatch({ type: "SET_EXPORT_STATUS", exporting: false });
          return;
        }

        // 1. Capture map at full export resolution
        const {
          canvas: mapCanvas,
          mapAlreadyInset,
          markerProjection,
          markerScaleX,
          markerScaleY,
          markerSizeScale,
        } = await captureMapAsCanvas(
          map,
          size.width,
          size.height,
          showWhiteMat,
          borderMetrics.mapInsetXRatio,
          borderMetrics.mapInsetYRatio,
        );
        // The WebGL map surface can be smaller than the requested poster on
        // some devices. Export at the actual rendered pixel dimensions instead
        // of interpolating it upward and labeling the result as 500 PPI.
        const density = {
          x: mapCanvas.width / widthInches,
          y: mapCanvas.height / heightInches,
        };
        const effectiveDpi = Math.max(1, Math.floor(Math.min(density.x, density.y)));

        // 2. Composite fades + text
        const { canvas: fullCanvas } = await compositeExport(mapCanvas, {
          mapAlreadyInset,
          theme: effectiveTheme,
          center: { lat, lon },
          widthInches,
          heightInches,
          displayCity: form.displayCity || form.location || "",
          displayCountry: form.displayCountry || "",
          customDate: form.customDate,
          fontFamily: form.fontFamily.trim(),
          fontSize: Number(form.fontSize) || 16,
          showPosterText: form.showPosterText,
          showOverlay: form.showMarkers,
          neatlineSvg,
          includeCredits,
          markers: hasVisibleMarkers ? state.markers : [],
          markerIcons: hasVisibleOverlays
            ? getAllMarkerIcons(state.customMarkerIcons, state.markers)
            : [],
          markerProjection: hasVisibleOverlays ? markerProjection : undefined,
          markerScaleX: hasVisibleOverlays ? markerScaleX : undefined,
          markerScaleY: hasVisibleOverlays ? markerScaleY : undefined,
          markerSizeScale: hasVisibleOverlays ? markerSizeScale : undefined,
          routes: visibleRoutes,
        });

        const canvas = isPro ? fullCanvas : applyFreeTier(fullCanvas);

        // 3. Download
        const filename = createPosterFilename(
          form.displayCity || form.location,
          form.theme,
          format,
        );
        const rasterFilename = addPpiToFilename(filename, effectiveDpi);

        if (format === "tiff") {
          const tiffBlob = await createTiffBlob(canvas, density);
          await triggerDownloadBlob(tiffBlob, rasterFilename.replace(/\.[^.]+$/, ".tif"));
        } else if (format === "zip") {
          const svgBlob = await createLayeredSvgBlobFromMap({
            map,
            exportWidth: size.width,
            exportHeight: size.height,
            theme: effectiveTheme,
            center: { lat, lon },
            displayCity: form.displayCity || form.location || "",
            displayCountry: form.displayCountry || "",
            customDate: form.customDate,
            fontFamily: form.fontFamily.trim(),
            fontSize: Number(form.fontSize) || 16,
            showPosterText: form.showPosterText,
            showOverlay: form.showMarkers,
            includeCredits,
            markers: hasVisibleMarkers ? state.markers : [],
            markerIcons: hasVisibleOverlays
              ? getAllMarkerIcons(state.customMarkerIcons, state.markers)
              : [],
            routes: visibleRoutes,
            neatlineSvg,
          });

          const pngBlob = await createPngBlob(canvas, density);
          const jpgBlob = await createJpgBlob(canvas, 0.95, density);
          const pdfBlob = createPdfBlobFromCanvas(canvas, {
            widthCm,
            heightCm,
          });

          const zip = new JSZip();
          const cleanCity = (form.displayCity || form.location || "City").replace(/[^a-zA-Z0-9_-]/g, "_");
          const cleanTheme = (form.theme || "custom").replace(/[^a-zA-Z0-9_-]/g, "_");
          const baseName = `MapArte_${cleanCity}_${cleanTheme}`;

          zip.file(`${baseName}_Wallpaper_UltraHD_${effectiveDpi}PPI.png`, pngBlob);
          zip.file(`${baseName}_Wallpaper_Compact_${effectiveDpi}PPI.jpg`, jpgBlob);
          zip.file(`${baseName}_Print_${effectiveDpi}PPI.pdf`, pdfBlob);
          zip.file(`${baseName}_Vector.svg`, svgBlob);

          const zipBlob = await zip.generateAsync({ type: "blob" });
          await triggerDownloadBlob(zipBlob, `${baseName}_Master_Bundle.zip`);
        } else if (format === "image_bundle") {
          const pngBlob = await createPngBlob(canvas, density);
          const jpgBlob = await createJpgBlob(canvas, 0.95, density);

          const zip = new JSZip();
          const cleanCity = (form.displayCity || form.location || "City").replace(/[^a-zA-Z0-9_-]/g, "_");
          const cleanTheme = (form.theme || "custom").replace(/[^a-zA-Z0-9_-]/g, "_");
          const baseName = `MapArte_${cleanCity}_${cleanTheme}`;

          zip.file(`${baseName}_Wallpaper_UltraHD_${effectiveDpi}PPI.png`, pngBlob);
          zip.file(`${baseName}_Wallpaper_Compact_${effectiveDpi}PPI.jpg`, jpgBlob);

          const zipBlob = await zip.generateAsync({ type: "blob" });
          await triggerDownloadBlob(zipBlob, `${baseName}_ImageDuo_Pack.zip`);
        } else if (format === "pdf") {
          const pdfBlob = createPdfBlobFromCanvas(canvas, {
            widthCm,
            heightCm,
          });
          await triggerDownloadBlob(
            pdfBlob,
            rasterFilename,
          );
        } else if (format === "jpg") {
          const jpgBlob = await createJpgBlob(canvas, 0.95, density);
          await triggerDownloadBlob(jpgBlob, rasterFilename);
        } else {
          const pngBlob = await createPngBlob(canvas, density);
          await triggerDownloadBlob(pngBlob, rasterFilename);
        }

        if (isPro) {
          consumeProCredit();
        }

        reportExportSuccess(nextCount, exportParams);
        registerSuccessfulExport(nextCount);
        dispatch({ type: "SET_EXPORT_STATUS", exporting: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed.";
        trackEvent("export_failed", { format, reason: message });
        void dispatchTelemetryAlert(
          `Export failed for format "${format}": ${message}`,
          "technical_bug",
          {
            city: form.displayCity || form.location,
            country: form.displayCountry,
            theme: form.theme,
            format,
            coordinates: {
              lat: Number(form.latitude) || 0,
              lon: Number(form.longitude) || 0,
            },
          },
          err instanceof Error ? err.stack : undefined,
        );
        dispatch({ type: "SET_EXPORT_STATUS", exporting: false, error: message });
      }
    },
    [
      mapRef,
      form,
      effectiveTheme,
      dispatch,
      hasVisibleMarkers,
      hasVisibleOverlays,
      visibleRoutes,
      registerSuccessfulExport,
      state.markers,
      state.customMarkerIcons,
    ],
  );

  const handleDownloadPng = useCallback(
    () => exportPoster("png"),
    [exportPoster],
  );

  const handleDownloadPdf = useCallback(
    () => exportPoster("pdf"),
    [exportPoster],
  );

  const handleDownloadSvg = useCallback(
    () => exportPoster("svg"),
    [exportPoster],
  );

  return {
    isExporting: state.isExporting,
    exportPoster,
    handleDownloadPng,
    handleDownloadPdf,
    handleDownloadSvg,
  };
}
