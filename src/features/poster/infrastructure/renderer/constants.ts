export const OUTPUT_DPI = 500;
// Maximum pixels allowed: 80 Megapixels allows ultra-crisp 500 DPI on standard sizes and 400+ DPI on 50x70cm
export const MAX_PIXELS = 80_000_000;
// Maximum single side: 11000 px allows up to 10500 px without downscaling
export const MAX_SIDE = 11_000;
// Safe mobile limits to prevent iOS WebKit / low-spec Android tab memory crash
export const MOBILE_MAX_PIXELS = 28_000_000;
export const MOBILE_MAX_SIDE = 5800;

