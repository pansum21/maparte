/**
 * Free vs Pro export tier.
 * TEMPORARY: the plan is a flag stored in the browser, for testing only.
 * Replace isProUser() with a real, server-verified check once login and
 * payments exist.
 */
const PLAN_KEY = "maparte_plan";
const CREDITS_KEY = "maparte_pro_credits";
const FULL_DPI = 300;
export const FREE_DPI = 96;

/** Watermark look. Change these numbers to taste. */
const WATERMARK_TEXT = "MAPARTE";
const WATERMARK_WIDTH_FRACTION = 0.8; // share of the poster width the word covers
const WATERMARK_OPACITY = 0.22; // 0 = invisible, 1 = solid
const WATERMARK_ANGLE = -Math.PI / 7; // slight diagonal; use 0 for straight

export function getProCredits(): number {
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
  const current = getProCredits();
  const next = current + count;
  setProCredits(next);
  return next;
}

export function consumeProCredit(): number {
  const current = getProCredits();
  const next = Math.max(0, current - 1);
  setProCredits(next);
  return next;
}

export function isProUser(): boolean {
  return getProCredits() > 0;
}

export function setProUser(isPro: boolean): void {
  if (isPro) {
    if (getProCredits() <= 0) {
      setProCredits(2);
    }
  } else {
    setProCredits(0);
  }
}

export function activateProWithKey(key: string): boolean {
  const normalized = key.trim().toUpperCase();
  if (
    normalized === "MAPARTEPRO" ||
    normalized === "MAPARTE2026" ||
    normalized === "PRO2026" ||
    normalized.startsWith("PRO-")
  ) {
    addProCredits(2);
    return true;
  }
  return false;
}

export function checkPaymentReturnUrl(): boolean {
  try {
    const url = new URL(window.location.href);
    const hasSuccess =
      url.searchParams.get("payment") === "success" ||
      url.searchParams.get("unlocked") === "pro" ||
      url.searchParams.get("status") === "paid";

    if (hasSuccess) {
      addProCredits(2);
      url.searchParams.delete("payment");
      url.searchParams.delete("unlocked");
      url.searchParams.delete("status");
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

/** Shrinks the finished poster and stamps the watermark on it. */
export function applyFreeTier(source: HTMLCanvasElement): HTMLCanvasElement {
  const factor = FREE_DPI / FULL_DPI;
  const width = Math.max(300, Math.round(source.width * factor));
  const height = Math.max(300, Math.round(source.height * factor));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return source;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  drawWatermark(ctx, width, height);
  return out;
}