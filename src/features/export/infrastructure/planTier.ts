/**
 * Free vs Pro export tier.
 * TEMPORARY: the plan is a flag stored in the browser, for testing only.
 * Replace isProUser() with a real, server-verified check once login and
 * payments exist.
 */
const PLAN_KEY = "maparte_plan";
const CREDITS_KEY = "maparte_pro_credits";
const ADMIN_MODE_KEY = "maparte_admin_mode";
const UNLOCKED_TIER_KEY = "maparte_unlocked_tier";
export const FREE_DPI = 300;

export type PaidTier = "png" | "jpg" | "duo" | "pdf" | "svg" | "combo";

export function getUnlockedTier(): PaidTier | null {
  if (isAdminUser()) {
    return "combo";
  }
  try {
    const raw = window.localStorage.getItem(UNLOCKED_TIER_KEY);
    if (raw && ["png", "jpg", "duo", "pdf", "svg", "combo"].includes(raw)) {
      return raw as PaidTier;
    }
    // If pro user with active credits, default to combo
    if (getProCredits() > 0) {
      return "combo";
    }
    return null;
  } catch {
    return null;
  }
}

export function setUnlockedTier(tier: PaidTier | null): void {
  try {
    if (tier) {
      window.localStorage.setItem(UNLOCKED_TIER_KEY, tier);
    } else {
      window.localStorage.removeItem(UNLOCKED_TIER_KEY);
    }
  } catch {
    // ignore
  }
}

export function isTierAuthorized(tier: PaidTier): boolean {
  if (isAdminUser()) return true;
  if (getProCredits() <= 0) return false;
  const unlocked = getUnlockedTier();
  if (!unlocked) return false;
  if (unlocked === "combo") return true;
  if (unlocked === "duo") return tier === "duo" || tier === "png" || tier === "jpg";
  return unlocked === tier;
}

export const BOGO_PRO_CODE = "MAPARTE.B01G01.2026";
export const LEGACY_BOGO_CODE = "maparte.bogo.in@bogo";
export const MASTER_ADMIN_KEY = "admin@maparte.boss";

/** Watermark look. Change these numbers to taste. */
const WATERMARK_TEXT = "MAPARTE";
const WATERMARK_WIDTH_FRACTION = 0.8; // share of the poster width the word covers
const WATERMARK_OPACITY = 0.22; // 0 = invisible, 1 = solid
const WATERMARK_ANGLE = -Math.PI / 7; // slight diagonal; use 0 for straight

export function isAdminUser(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAdminMode(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(ADMIN_MODE_KEY, "true");
      window.localStorage.setItem(CREDITS_KEY, "999999");
      window.localStorage.setItem(PLAN_KEY, "pro");
      window.localStorage.setItem(UNLOCKED_TIER_KEY, "combo");
    } else {
      window.localStorage.removeItem(ADMIN_MODE_KEY);
      window.localStorage.removeItem(CREDITS_KEY);
      window.localStorage.removeItem(PLAN_KEY);
      window.localStorage.removeItem(UNLOCKED_TIER_KEY);
    }
  } catch {
    // ignore
  }
}

export function getProCredits(): number {
  if (isAdminUser()) {
    return 999999;
  }
  try {
    const raw = window.localStorage.getItem(CREDITS_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
    // If legacy pro plan was set without explicit credits, grant default 2 BOGO credits
    if (window.localStorage.getItem(PLAN_KEY) === "pro") {
      return 2;
    }
    return 0;
  } catch {
    return 0;
  }
}

export function setProCredits(count: number): void {
  try {
    const safeCount = Math.max(0, Math.floor(count));
    window.localStorage.setItem(CREDITS_KEY, safeCount.toString());
    if (safeCount > 0) {
      window.localStorage.setItem(PLAN_KEY, "pro");
    } else {
      window.localStorage.removeItem(PLAN_KEY);
    }
  } catch {
    // ignore
  }
}

export function addProCredits(count: number = 2): number {
  if (isAdminUser()) {
    return 999999;
  }
  const current = getProCredits();
  const next = current + count;
  setProCredits(next);
  return next;
}

export function consumeProCredit(): number {
  if (isAdminUser()) {
    return 999999;
  }
  const current = getProCredits();
  const next = Math.max(0, current - 1);
  setProCredits(next);
  return next;
}

export function isProUser(): boolean {
  return isAdminUser() || getProCredits() > 0;
}

export function setProUser(isPro: boolean): void {
  if (isPro) {
    if (getProCredits() <= 0) {
      setProCredits(2);
      setUnlockedTier("combo");
    }
  } else {
    setProCredits(0);
    setAdminMode(false);
    setUnlockedTier(null);
  }
}

export interface ActivationResult {
  success: boolean;
  isAdmin?: boolean;
}

export function activateProWithKey(key: string): ActivationResult {
  const normalized = key.trim().toLowerCase();
  if (
    normalized === MASTER_ADMIN_KEY.toLowerCase() ||
    normalized === "maparte.admin@boss" ||
    normalized === "admin@boss" ||
    normalized === "maparteboss"
  ) {
    setAdminMode(true);
    setUnlockedTier("combo");
    return { success: true, isAdmin: true };
  }
  if (
    normalized === BOGO_PRO_CODE.toLowerCase() ||
    normalized === LEGACY_BOGO_CODE.toLowerCase() ||
    normalized === "maparte.b01g01.2026"
  ) {
    addProCredits(2);
    setUnlockedTier("combo");
    return { success: true, isAdmin: false };
  }
  return { success: false };
}

export function checkPaymentReturnUrl(): boolean {
  try {
    const url = new URL(window.location.href);
    const adminParam = url.searchParams.get("admin");
    if (adminParam === "boss" || adminParam === "true" || adminParam === "maparte") {
      setAdminMode(true);
      setUnlockedTier("combo");
      url.searchParams.delete("admin");
      const cleanPath =
        url.pathname + (url.search ? url.search : "") + (url.hash ? url.hash : "");
      window.history.replaceState({}, document.title, cleanPath);
      return true;
    }

    const paymentParam = url.searchParams.get("payment");
    const statusParam = url.searchParams.get("status") || url.searchParams.get("payment_status");
    const unlockedParam = url.searchParams.get("unlocked");
    const hasDodoPayment = url.searchParams.has("payment_id") || url.searchParams.has("checkout_id");

    const hasSuccess =
      paymentParam === "success" ||
      unlockedParam === "pro" ||
      statusParam === "paid" ||
      statusParam === "succeeded" ||
      statusParam === "success" ||
      hasDodoPayment;

    if (hasSuccess) {
      addProCredits(2);
      const tierParam = url.searchParams.get("tier") || url.searchParams.get("metadata_tier");
      if (tierParam && ["png", "jpg", "duo", "pdf", "svg", "combo"].includes(tierParam)) {
        setUnlockedTier(tierParam as PaidTier);
      } else {
        setUnlockedTier("combo");
      }
      url.searchParams.delete("tier");
      url.searchParams.delete("metadata_tier");
      url.searchParams.delete("payment");
      url.searchParams.delete("unlocked");
      url.searchParams.delete("status");
      url.searchParams.delete("payment_status");
      url.searchParams.delete("payment_id");
      url.searchParams.delete("checkout_id");
      const cleanPath =
        url.pathname + (url.search ? url.search : "") + (url.hash ? url.hash : "");
      window.history.replaceState({}, document.title, cleanPath);
      return true;
    }
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
