export const OUTPUT_DPI = 300;
// Maximum pixels allowed: 56 Megapixels comfortably allows 50x70cm at true 300 DPI (48.8 MP)
export const MAX_PIXELS = 56_000_000;
// Maximum single side: 8800 px allows up to 8268 px height of 70cm at 300 DPI without downscaling
export const MAX_SIDE = 8800;
// Safe mobile limits to prevent iOS WebKit / low-spec Android tab memory crash
export const MOBILE_MAX_PIXELS = 24_000_000;
export const MOBILE_MAX_SIDE = 5400;

