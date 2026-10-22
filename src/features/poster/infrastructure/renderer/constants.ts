export const OUTPUT_DPI = 500;
// Shared export canvas ceiling keeps raster dimensions consistent across
// desktop, tablet, and phone. WebGL surface limits are handled separately by
// tiled rendering; the final canvas still needs a conservative memory budget.
export const MAX_PIXELS = 48_000_000;
export const MAX_SIDE = 8192;

