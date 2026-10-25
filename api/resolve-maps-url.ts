export default async function handler(req: any, res: any) {
  const urlParam = req.query?.url || req.body?.url;
  if (!urlParam || typeof urlParam !== "string") {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const parsed = new URL(urlParam);
    const allowedHosts = [
      "maps.app.goo.gl",
      "goo.gl",
      "google.com",
      "www.google.com",
      "maps.google.com",
    ];
    if (!allowedHosts.some((h) => parsed.hostname.endsWith(h))) {
      return res.status(400).json({ error: "Invalid URL domain" });
    }

    // Follow redirect to obtain destination URL
    const response = await fetch(urlParam, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    return res.status(200).json({
      expandedUrl: response.url,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to resolve URL",
      message: err?.message,
    });
  }
}
