export const OUTPUT_DPI = 500;
// Maximum pixels allowed: 80 Megapixels allows ultra-crisp 500 DPI on standard sizes and 400+ DPI on 50x70cm
export const MAX_PIXELS = 80_000_000;
// Maximum single side: 11000 px allows up to 10500 px without downscaling
export const MAX_SIDE = 11_000;
// Safe mobile limits: 4096 is the hardware WebGL MAX_VIEWPORT_DIMS / MAX_RENDERBUFFER_SIZE limit on mobile GPUs.
// Exceeding 4096 causes mobile browsers (iOS WebKit / Android Mali/Adreno) to clip the WebGL buffer, rendering only the top portion.
export const MOBILE_MAX_PIXELS = 16_000_000;
export const MOBILE_MAX_SIDE = 4096;

