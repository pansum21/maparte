export const OUTPUT_DPI = 500;
// Canvas allocation ceilings. GPU render limits can reduce actual output PPI;
// raster metadata is written from the final rendered dimensions.
export const MAX_PIXELS = 80_000_000;
// Desktop maximum canvas edge.
export const MAX_SIDE = 11_000;
// Conservative mobile canvas allocation limits; WebGL may impose a lower edge.
export const MOBILE_MAX_PIXELS = 48_000_000;
export const MOBILE_MAX_SIDE = 8192;

