/** Paid export entitlements are unavailable until server-side verification exists. */
export const FREE_DPI = 300;

export type PaidTier = "png" | "jpg" | "duo" | "pdf" | "svg" | "combo";

export function getUnlockedTier(): PaidTier | null { return null; }
export function setUnlockedTier(_tier: PaidTier | null): void {}
export function isTierAuthorized(_tier: PaidTier): boolean { return false; }

/** Watermark look. Change these numbers to taste. */
const WATERMARK_TEXT = "MAPARTE";
const WATERMARK_WIDTH_FRACTION = 0.8; // share of the poster width the word covers
const WATERMARK_OPACITY = 0.22; // 0 = invisible, 1 = solid
const WATERMARK_ANGLE = -Math.PI / 7; // slight diagonal; use 0 for straight

export function isAdminUser(): boolean {
  return false;
}

export function setAdminMode(_enabled: boolean): void {
  try {
    for (const key of ["maparte_admin_mode", "maparte_pro_credits", "maparte_plan", "maparte_unlocked_tier"]) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function getProCredits(): number { return 0; }
export function setProCredits(_count: number): void { setAdminMode(false); }
export function addProCredits(_count: number = 2): number { return 0; }
export function consumeProCredit(): number { return 0; }
export function isProUser(): boolean { return false; }
export function setProUser(_isPro: boolean): void { setAdminMode(false); }
export interface ActivationResult { success: false; isAdmin?: false; }
export function activateProWithKey(_key: string): ActivationResult { return { success: false }; }

export function checkPaymentReturnUrl(): boolean {
  // Remove any legacy browser-only admin or plan flags from previous releases.
  setAdminMode(false);
  try {
    const url = new URL(window.location.href);
    const params = ["admin", "payment", "status", "payment_status", "unlocked", "tier", "metadata_tier", "payment_id", "checkout_id"];
    let changed = false;
    for (const param of params) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    }
    if (changed) window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : "") + url.hash);
  } catch {
    // ignore
  }
  return false;
}

/** One large word made of dots, centred on the poster. */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return;
  const family = "Arial Black, Arial, Helvetica, sans-serif";
  probe.font = `900 200px ${family}`;
  const measured = probe.measureText(WATERMARK_TEXT).width || 1;
  const heightRatio = (0.72 * 200) / measured;

  const cos = Math.cos(WATERMARK_ANGLE);
  const sin = Math.abs(Math.sin(WATERMARK_ANGLE));
  let length =
    (width * WATERMARK_WIDTH_FRACTION) / (cos + heightRatio * sin);
  const tallest = length * sin + length * heightRatio * cos;
  if (tallest > height * 0.85) length *= (height * 0.85) / tallest;

  const fontPx = (200 * length) / measured;
  const pad = 2;
  const maskW = Math.ceil(length) + pad * 2;
  const maskH = Math.ceil(fontPx * 1.1) + pad * 2;

  const mask = document.createElement("canvas");
  mask.width = maskW;
  mask.height = maskH;
  const mctx = mask.getContext("2d");
  if (!mctx) return;
  mctx.font = `900 ${fontPx}px ${family}`;
  mctx.textAlign = "center";
  mctx.textBaseline = "middle";
  mctx.fillStyle = "#000";
  mctx.fillText(WATERMARK_TEXT, maskW / 2, maskH / 2);
  const data = mctx.getImageData(0, 0, maskW, maskH).data;

  const step = Math.max(3, Math.round(fontPx * 0.055));
  const radius = step * 0.3;
  const dots: Array<[number, number]> = [];
  for (let y = step / 2; y < maskH; y += step) {
    for (let x = step / 2; x < maskW; x += step) {
      const alpha = data[(Math.floor(y) * maskW + Math.floor(x)) * 4 + 3];
      if (alpha > 128) dots.push([x, y]);
    }
  }

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(WATERMARK_ANGLE);
  ctx.translate(-maskW / 2, -maskH / 2);

  // Dark halo first, so the dots also show on light posters.
  ctx.fillStyle = `rgba(0, 0, 0, ${WATERMARK_OPACITY * 0.7})`;
  ctx.beginPath();
  const haloR = radius + Math.max(1, radius * 0.25);
  for (const [x, y] of dots) {
    ctx.moveTo(x + haloR, y);
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.fillStyle = `rgba(255, 255, 255, ${WATERMARK_OPACITY})`;
  ctx.beginPath();
  for (const [x, y] of dots) {
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/** Returns the free screen export without a center watermark. */
export function applyFreeTier(source: HTMLCanvasElement): HTMLCanvasElement {
  return source;
}
