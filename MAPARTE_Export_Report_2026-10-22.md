# MapArte Export Resolution Report

**Date:** 22 October 2026  
**Scope:** Raster export density, PDF page density, export dimensions, and resolution claims.

**Verification update:** 23 October 2026. The original measurements below remain the results for the files supplied on 22 October. Current-code checks and corrected frame-test expectations are recorded at the end.

## Result

The uploaded PDF named `Print_500DPI.pdf` did not contain 500 PPI at its declared print size. Its measured effective density was about **347 PPI**. The export pipeline has been changed so the raster file dimensions follow the actual WebGL render surface, and PNG/JPG metadata and filenames use the resulting density instead of always claiming 500.

## Measurements from the supplied files

| Supplied file | Actual pixels / vector contents | Density finding |
| --- | --- | --- |
| `dehradun_midnight_blue_20261021_170132.png` | 1448 × 2048 px, 2.97 MP, RGBA | No PNG `pHYs` DPI chunk. If printed at A4 size, approximately 175 PPI. The decorative frame is part of the raster image. |
| `dehradun_carrara_20261020_143123.png` | 944 × 2048 px, 1.93 MP, RGBA | No PNG `pHYs` DPI chunk. At the matching 13.84 × 30 cm proportion, approximately 173 PPI. |
| `MapArte_Dehradun_neon_Print_500DPI.pdf` | Embedded image 1889 × 4096 px; page 13.84 × 30 cm | Approximately 346.68 × 346.79 PPI. The filename's 500 DPI claim was incorrect for this file. A true 500 PPI raster at that size needs approximately 2724 × 5906 px. |
| `MapArte_Dehradun_neon_Vector_Infinite.svg` | 1889 × 4096 viewBox; 15 paths, 5 text elements, no embedded `<image>` | Vector paths/text scale without raster pixelation. Map detail remains limited by the source map features. SVG does not have a fixed DPI. |
| Standalone JPG | Not included in the supplied files | The PDF contains a JPEG-encoded image, but that is not a separate JPG export and cannot verify its own metadata. |

The PNG print PPI estimates above are conditional on the stated physical print sizes; PNGs without a physical-size metadata chunk do not declare an intrinsic print size.

## Changes made

- Raster export now avoids enlarging a smaller WebGL render surface to a larger requested canvas. The saved pixel dimensions reflect the rendered map dimensions available on that device.
- PNG density metadata now records separate X/Y values calculated from the final pixel dimensions and selected physical size. Existing `pHYs` chunks are replaced rather than duplicated.
- JPG exports now record actual X/Y density in the JFIF header; a header is added if the image encoder omitted one.
- PDF keeps the selected physical page size. Its effective PPI is determined by the actual embedded image pixels divided by that page size; exported filenames now include the measured conservative PPI.
- PNG/JPG files and ZIP contents also include the actual PPI in their filenames.
- Download copy no longer claims 500 DPI for every size, 300 DPI for a screen wallpaper, pure/infinite vector detail, or guaranteed razor-sharp physical printing. It distinguishes scalable paths from finite map-source detail.
- Corrected the SVG export's neatline option binding so the TypeScript source no longer references an undefined `options` variable there.

## Automated verification

| Check | Result |
| --- | --- |
| Export size cases | **100 passed** across portrait/landscape ratios, 300/500 PPI targets, and desktop/mobile pixel caps. Aspect ratio, pixel ceilings, and reported density were checked. |
| Raster file-writer cases | **300 passed**: 100 PNG, 100 JPG, and 100 PDF writer outputs with pixel dimensions and density metadata/page dimensions checked. |
| PDF regression calculation | Passed: a 1889 × 4096 image on a 13.84 × 30 cm page calculates to approximately 346.68 × 346.79 PPI. |
| Production Vite build | Passed (`npx vite build`). It logged existing non-blocking notices about the missing `VITE_GA_MEASUREMENT_ID` and a font module imported both statically and dynamically. |
| Diff whitespace check | Passed (`git diff --check`). |
| TypeScript check (22 Oct run) | Failed on three `src/shared/ui/AppShell.tsx` type errors. This was an earlier checkout result and is superseded by the 23 Oct verification update below. |

## Verification limits

The 100-case run tests the size calculations and all three raster file writers using deterministic canvas fixtures. It does not simulate 100 physical printers or independently judge printed sharpness. The Vite production bundle builds, but an updated live-browser download and a physical print have not yet been independently inspected in this report. Actual print appearance also depends on map-data detail, printer, paper, and viewing distance.

## Current-code verification update — 23 October 2026

The selected-frame catalogue now intentionally contains two user-selected SVG frames. The frame-matrix script previously still required exactly 20 frames, so it returned a failing exit code even when all rendered combinations had zero geometry failures. Its count check now accepts any non-empty set of unique configured frames.

| Check | Current result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | Passed |
| Vite production build | Passed; the build logged a missing optional `VITE_GA_MEASUREMENT_ID`, a font stylesheet imported both statically and dynamically, and a large MapLibre chunk (about 1.05 MB raw / 285 KB gzip). These are warnings, not build failures. |
| Export calculations and PNG/JPG/PDF writers | 400 cases passed (100 size cases + 300 writer cases) |
| Line-border matrix | 468 cases passed across 26 layouts |
| Selected-frame layout matrix | 52 combinations passed (2 selected frames × 26 layouts); zero overlap/gap-geometry failures. Gaps remain even on all four sides per layout, with measured size varying from 0.14 cm to 0.45 cm across aspect ratios. |
| Vercel | GitHub reports a Vercel-related success status for the feature-branch commit, but its check is “Vercel Preview Comments” and says there are no unresolved comments. It does not prove that a production deployment or full browser flow passed. The preview is protected from this session, so live UI/export verification remains outstanding. |

The matrix scripts test rendered markup and geometry, not every browser/device combination. No physical print test was performed. The previous 22 October supplied-file measurements are not new downloads from the current deployment.
