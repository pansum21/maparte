interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(value: unknown): void;
}

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.google.co.in",
  "www.google.co.in",
]);

function parseBody(body: unknown): { url?: string } {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as { url?: string };
    } catch {
      return {};
    }
  }
  return body && typeof body === "object" ? body as { url?: string } : {};
}

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST to resolve a Google Maps link." });
  }

  const input = parseBody(req.body).url?.trim() ?? "";
  if (!input || input.length > 4096 || !isAllowedUrl(input)) {
    return res.status(400).json({ error: "Paste a valid Google Maps link." });
  }

  try {
    let currentUrl = input;
    for (let hop = 0; hop < 6; hop += 1) {
      if (!isAllowedUrl(currentUrl)) {
        return res.status(400).json({ error: "The link redirected outside Google Maps." });
      }

      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "MapArte location-link resolver" },
        signal: AbortSignal.timeout(8000),
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) break;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (response.ok) {
        return res.status(200).json({ finalUrl: currentUrl });
      }
      break;
    }

    return res.status(422).json({ error: "Google Maps did not return a usable location link." });
  } catch {
    return res.status(502).json({ error: "Could not resolve the Google Maps short link. Try pasting it again." });
  }
}
