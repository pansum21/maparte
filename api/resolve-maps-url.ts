type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
};

const REDIRECT_LIMIT = 5;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const CACHE_TTL_MS = 5 * 60_000;
const MAX_URL_LENGTH = 2_048;
const GOOGLE_MAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "google.com",
  "www.google.com",
  "maps.google.co.in",
  "www.google.co.in",
]);

const rateBuckets = new Map<string, { startedAt: number; count: number }>();
const resolvedUrlCache = new Map<string, { url: string; createdAt: number }>();

function isAllowedGoogleHost(hostname: string): boolean {
  return GOOGLE_MAPS_HOSTS.has(hostname.toLowerCase());
}

function isGoogleMapsShareUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "maps.app.goo.gl" ||
        (url.hostname === "goo.gl" && url.pathname.startsWith("/maps")))
    );
  } catch {
    return false;
  }
}

function getRequestIp(req: ApiRequest): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return typeof value === "string" ? value.split(",")[0].trim() : "unknown";
}

function takeRateLimit(ip: string, now: number): boolean {
  if (rateBuckets.size > 10_000) {
    for (const [key, bucket] of rateBuckets) {
      if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
    }
    while (rateBuckets.size > 10_000) {
      const oldest = rateBuckets.keys().next().value;
      if (oldest === undefined) break;
      rateBuckets.delete(oldest);
    }
  }

  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

async function expandGoogleMapsUrl(input: string): Promise<string | null> {
  let current = new URL(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);

  try {
    for (let hop = 0; hop <= REDIRECT_LIMIT; hop += 1) {
      if (current.protocol !== "https:" || !isAllowedGoogleHost(current.hostname)) {
        return null;
      }

      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "MapArte link resolver/1.0 (https://www.maparte.com)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        if (!location || hop === REDIRECT_LIMIT) return null;
        current = new URL(location, current);
        continue;
      }

      if (!response.ok || !current.pathname.includes("/maps")) return null;
      return current.toString();
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=300");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = req.query?.url;
  const input = typeof query === "string" ? query : "";
  if (!input || input.length > MAX_URL_LENGTH || !isGoogleMapsShareUrl(input)) {
    return res.status(400).json({ error: "Only HTTPS Google Maps share links are supported" });
  }

  const now = Date.now();
  const cached = resolvedUrlCache.get(input);
  if (cached && now - cached.createdAt < CACHE_TTL_MS) {
    return res.status(200).json({ expandedUrl: cached.url });
  }
  if (resolvedUrlCache.size > 1_000) {
    for (const [key, entry] of resolvedUrlCache) {
      if (now - entry.createdAt >= CACHE_TTL_MS) resolvedUrlCache.delete(key);
    }
    while (resolvedUrlCache.size > 1_000) {
      const oldest = resolvedUrlCache.keys().next().value;
      if (oldest === undefined) break;
      resolvedUrlCache.delete(oldest);
    }
  }

  if (!takeRateLimit(getRequestIp(req), now)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many link lookups. Try again shortly." });
  }

  try {
    const expandedUrl = await expandGoogleMapsUrl(input);
    if (!expandedUrl) {
      return res.status(400).json({ error: "The link did not resolve to Google Maps" });
    }
    resolvedUrlCache.set(input, { url: expandedUrl, createdAt: now });
    return res.status(200).json({ expandedUrl });
  } catch {
    return res.status(400).json({ error: "Unable to resolve Google Maps link" });
  }
}
