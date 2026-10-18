/**
 * MapArte Autonomous Sentinel & Telemetry Bridge
 * 
 * Intercepts technical runtime bugs, collects customer feedback,
 * categorizes them, enforces strict guardrails on pricing decisions,
 * and notifies the project owner directly via Telegram.
 */

export type FeedbackCategory =
  | "technical_bug"
  | "pricing_feedback"
  | "feature_request"
  | "general_feedback";

export interface TelemetryContext {
  city?: string;
  country?: string;
  theme?: string;
  format?: string;
  zoom?: number;
  coordinates?: { lat: number; lon: number };
  device?: string;
  screen?: string;
}

export interface TelemetryPayload {
  category: FeedbackCategory;
  message: string;
  stackTrace?: string;
  context?: TelemetryContext;
  timestamp: string;
  autoFixAllowed: boolean;
}

const PRICING_KEYWORDS = [
  "price",
  "pricing",
  "cost",
  "costly",
  "expensive",
  "cheap",
  "rate",
  "rates",
  "rupee",
  "rupees",
  "dollar",
  "dollars",
  "usd",
  "inr",
  "payment",
  "pay",
  "discount",
  "bogo",
  "offer",
  "free",
  "महंगा",
  "सस्ता",
  "रेट",
  "पैसे",
  "रुपये",
];

const BUG_KEYWORDS = [
  "bug",
  "error",
  "crash",
  "broken",
  "blur",
  "blurry",
  "fail",
  "failed",
  "stuck",
  "black screen",
  "blank",
  "cut off",
  "distorted",
  "overlap",
  "glitch",
  "freeze",
  "hanging",
  "undefined",
  "null",
];

export function classifyFeedback(text: string): {
  category: FeedbackCategory;
  autoFixAllowed: boolean;
} {
  const normalized = text.toLowerCase();

  // STRICT RULE: If pricing is mentioned, AUTO-FIX IS FORBIDDEN.
  // Pricing decisions require explicit owner approval.
  const hasPricingKeyword = PRICING_KEYWORDS.some((kw) =>
    normalized.includes(kw),
  );
  if (hasPricingKeyword) {
    return {
      category: "pricing_feedback",
      autoFixAllowed: false,
    };
  }

  const hasBugKeyword = BUG_KEYWORDS.some((kw) => normalized.includes(kw));
  if (hasBugKeyword) {
    return {
      category: "technical_bug",
      autoFixAllowed: true,
    };
  }

  return {
    category: "general_feedback",
    autoFixAllowed: false,
  };
}

function getDeviceInfo(): { device: string; screen: string } {
  if (typeof window === "undefined") {
    return { device: "server", screen: "unknown" };
  }
  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
  const platform = navigator.userAgent.includes("iPhone")
    ? "iPhone"
    : navigator.userAgent.includes("Android")
      ? "Android"
      : navigator.userAgent.includes("Mac")
        ? "Mac"
        : navigator.userAgent.includes("Windows")
          ? "Windows PC"
          : "Mobile/Tablet";

  return {
    device: `${platform} (${isMobile ? "Mobile" : "Desktop"})`,
    screen: `${window.innerWidth}x${window.innerHeight} (dpr: ${window.devicePixelRatio || 1})`,
  };
}

const TELEGRAM_STORAGE_BACKLOG_KEY = "maparte_telemetry_backlog";

export async function dispatchTelemetryAlert(
  message: string,
  categoryOverride?: FeedbackCategory,
  extraContext?: Partial<TelemetryContext>,
  stackTrace?: string,
): Promise<TelemetryPayload> {
  const { category, autoFixAllowed } = categoryOverride
    ? { category: categoryOverride, autoFixAllowed: categoryOverride === "technical_bug" }
    : classifyFeedback(message);

  const device = getDeviceInfo();
  const payload: TelemetryPayload = {
    category,
    message,
    stackTrace,
    context: {
      device: device.device,
      screen: device.screen,
      ...extraContext,
    },
    timestamp: new Date().toISOString(),
    autoFixAllowed,
  };

  // 1. Store in local backlog for diagnostic access
  try {
    const stored = window.localStorage.getItem(TELEGRAM_STORAGE_BACKLOG_KEY);
    const list: TelemetryPayload[] = stored ? JSON.parse(stored) : [];
    list.unshift(payload);
    window.localStorage.setItem(
      TELEGRAM_STORAGE_BACKLOG_KEY,
      JSON.stringify(list.slice(0, 30)),
    );
  } catch {
    // ignore
  }

  // 2. Dispatch to Telegram Bot (if token is provided in env)
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    const categoryTag =
      category === "technical_bug"
        ? "🚨 [TECHNICAL CODING BUG]"
        : category === "pricing_feedback"
          ? "💰 [PRICING FEEDBACK - OWNER REVIEW REQUIRED]"
          : "💡 [CUSTOMER FEEDBACK]";

    const autoFixNotice = autoFixAllowed
      ? "🤖 Action: Technical bug categorized for AI patch & deployment."
      : "🔒 Action: Strictly locked. Pricing decisions require Supriya's manual approval.";

    const text = `
${categoryTag}
━━━━━━━━━━━━━━━━━━
📍 Location: ${payload.context?.city || "N/A"}, ${payload.context?.country || "N/A"}
🎨 Theme: ${payload.context?.theme || "N/A"}
📱 Device: ${payload.context?.device || "N/A"}
🖥️ Screen: ${payload.context?.screen || "N/A"}

💬 User Note:
"${payload.message}"

${payload.stackTrace ? `⚠️ Stack:\n${payload.stackTrace.slice(0, 300)}` : ""}

${autoFixNotice}
⏰ ${new Date().toLocaleTimeString()}
`.trim();

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });
    } catch {
      // ignore network errors
    }
  }

  return payload;
}

let errorListenerInitialized = false;

export function initGlobalErrorSentinel(): void {
  if (typeof window === "undefined" || errorListenerInitialized) return;
  errorListenerInitialized = true;

  let lastErrorTime = 0;

  window.addEventListener("error", (event) => {
    const now = Date.now();
    if (now - lastErrorTime < 5000) return; // Throttle to avoid flooding
    lastErrorTime = now;

    const errMsg = event.message || "Unknown runtime script error";
    // Ignore harmless 3rd party extension script errors
    if (errMsg.includes("ResizeObserver") || errMsg.includes("Script error")) {
      return;
    }

    void dispatchTelemetryAlert(
      `Unhandled Window Error: ${errMsg}`,
      "technical_bug",
      undefined,
      event.error?.stack || `${event.filename}:${event.lineno}`,
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const now = Date.now();
    if (now - lastErrorTime < 5000) return;
    lastErrorTime = now;

    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || "");
    if (reason.includes("aborted") || reason.includes("AbortError")) return;

    void dispatchTelemetryAlert(
      `Unhandled Promise Rejection: ${reason}`,
      "technical_bug",
      undefined,
      event.reason instanceof Error ? event.reason.stack : undefined,
    );
  });
}
