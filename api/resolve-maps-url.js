const REDIRECT_LIMIT = 5;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_URL_LENGTH = 2_048;

const rateBuckets = new Map();
const resolvedUrlCache = new Map();

function isAllowedGoogleHost(hostname) {
  return new Set([
    "maps.app.goo.gl",
    "goo.gl",
    "maps.google.com",
    "google.com",
    "www.google.com",
    "maps.google.co.in",
    "www.google.co.in",
  ]).has(hostname.toLowerCase());
}

function isGoogleMapsUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ((url.hostname === "maps.app.goo.gl") ||
        (url.hostname === "goo.gl" && url.pathname.startsWith("/maps")))
    );
  } catch {
    return false;
  }
}

function requestIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return typeof value === "string" ? value.split(",")[0].trim() : "unknown";
}

function takeRateLimit(ip, now) {
  if (rateBuckets.size > 10_000) {
    for (const [key, bucket] of rateBuckets) {
      if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
    }
    while (rateBuckets.size > 10_000) {
      rateBuckets.delete(rateBuckets.keys().next().value);
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

async function expandGoogleMapsUrl(input, fetchImpl) {
  let current = new URL(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);

  try {
    for (let hop = 0; hop <= REDIRECT_LIMIT; hop += 1) {
      if (!isAllowedGoogleHost(current.hostname)) return null;

      const response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "MapArte link resolver/1.0 (https://www.maparte.com)" },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || hop === REDIRECT_LIMIT) return null;
        current = new URL(location, current);
        continue;
      }

      if (!response.ok || !isAllowedGoogleHost(current.hostname) || !current.pathname.includes("/maps")) {
        return null;
      }
      return current.toString();
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveMapsUrl(req, res, fetchImpl = fetch, now = Date.now) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=300");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = typeof req.query?.url === "string" ? req.query.url : "";
  if (!input || input.length > MAX_URL_LENGTH || !isGoogleMapsUrl(input)) {
    return res.status(400).json({ error: "Only HTTPS Google Maps share links are supported" });
  }

  const cached = resolvedUrlCache.get(input);
  if (cached && now() - cached.createdAt < 5 * 60_000) {
    return res.status(200).json({ expandedUrl: cached.url });
  }
  if (resolvedUrlCache.size > 1_000) {
    for (const [key, entry] of resolvedUrlCache) {
      if (now() - entry.createdAt >= 5 * 60_000) resolvedUrlCache.delete(key);
    }
    while (resolvedUrlCache.size > 1_000) {
      resolvedUrlCache.delete(resolvedUrlCache.keys().next().value);
    }
  }

  if (!takeRateLimit(requestIp(req), now())) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Too many link lookups. Try again shortly." });
  }

  try {
    const expandedUrl = await expandGoogleMapsUrl(input, fetchImpl);
    if (!expandedUrl) {
      return res.status(400).json({ error: "The link did not resolve to Google Maps" });
    }
    resolvedUrlCache.set(input, { url: expandedUrl, createdAt: now() });
    return res.status(200).json({ expandedUrl });
  } catch {
    return res.status(400).json({ error: "Unable to resolve Google Maps link" });
  }
}

export default function handler(req, res) {
  return resolveMapsUrl(req, res);
}
