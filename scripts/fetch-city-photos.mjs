import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "public/assets/city-photos");
const manifestPath = path.join(outputDir, "manifest.json");
const cities = JSON.parse(
  await readFile(path.join(root, "src/data/seoCities.json"), "utf8"),
);
const userAgent = "MapArteCityPhotoBuilder/1.0 (https://maparte.vercel.app/)";

const cleanText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value = "") =>
  String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Wikimedia API HTTP ${response.status}`);
  return response.json();
}

async function fetchImageBytes(url) {
  const parsed = new URL(url);
  if (!/^(upload|thumb)\.wikimedia\.org$/.test(parsed.hostname)) {
    throw new Error(`Unexpected Wikimedia image host: ${parsed.hostname}`);
  }
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "image/*" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
  const type = response.headers.get("content-type")?.split(";")[0] ?? "";
  const extension =
    type === "image/jpeg" ? "jpg" :
    type === "image/png" ? "png" :
    type === "image/webp" ? "webp" :
    type === "image/avif" ? "avif" : null;
  if (!extension) throw new Error(`Unsupported image type: ${type}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 2_000 || bytes.length > 5_000_000) {
    throw new Error(`Unexpected image size: ${bytes.length}`);
  }
  return { bytes, extension };
}

async function queryCityPage(city) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    redirects: "1",
    prop: "pageimages|pageprops",
    piprop: "thumbnail|name",
    pithumbsize: "720",
    titles: city.city,
  });
  const data = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing || page.pageprops?.disambiguation) return null;
  if (!page.thumbnail?.source || !page.pageimage) return null;
  return {
    city,
    title: page.title,
    fileTitle: `File:${page.pageimage}`,
    pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
  };
}

async function queryCommonsFile(fileTitle) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    redirects: "1",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "720",
    titles: fileTitle,
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) return null;
  const metadata = info.extmetadata ?? {};
  return {
    src: info.thumburl ?? info.url,
    sourcePage: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title ?? fileTitle)}`,
    author: cleanText(metadata.Artist?.value || metadata.Credit?.value || "Wikimedia contributor"),
    license: cleanText(metadata.LicenseShortName?.value || "See source page"),
    licenseUrl: metadata.LicenseUrl?.value ?? "",
  };
}

async function queryCommonsFallback(city) {
  const landmark = city.landmarks?.[0] ?? "city skyline";
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${city.city} ${city.country} ${landmark}`,
    gsrlimit: "1",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "720",
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) return null;
  const metadata = info.extmetadata ?? {};
  return {
    src: info.thumburl ?? info.url,
    sourcePage: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title ?? "")}`,
    author: cleanText(metadata.Artist?.value || metadata.Credit?.value || "Wikimedia contributor"),
    license: cleanText(metadata.LicenseShortName?.value || "See source page"),
    licenseUrl: metadata.LicenseUrl?.value ?? "",
  };
}

async function mapLimit(items, limit, task) {
  const output = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        output[index] = await task(items[index], index);
      } catch (error) {
        output[index] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
  });
  await Promise.all(workers);
  return output;
}

if (process.env.FETCH_CITY_PHOTOS !== "1") {
  console.log("City photo refresh skipped; static city assets are preserved.");
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });

const pageResults = await mapLimit(cities, 8, async (city) => queryCityPage(city));
const pageBySlug = new Map();
for (let index = 0; index < cities.length; index += 1) {
  const result = pageResults[index];
  if (result && !result.error) pageBySlug.set(cities[index].slug, result);
}

const commonsFiles = await mapLimit([...pageBySlug.values()], 8, async (page) => ({
  ...page,
  image: await queryCommonsFile(page.fileTitle),
}));
const photoBySlug = new Map();
for (const result of commonsFiles) {
  if (result?.image) photoBySlug.set(result.city.slug, { ...result.city, ...result.image });
}

const missing = cities.filter((city) => !photoBySlug.has(city.slug));
const fallbacks = await mapLimit(missing, 6, async (city) => ({
  city,
  image: await queryCommonsFallback(city),
}));
for (const result of fallbacks) {
  if (result?.image) photoBySlug.set(result.city.slug, { ...result.city, ...result.image });
}

const photos = [...photoBySlug.values()];
const downloaded = await mapLimit(photos, 6, async (photo) => {
  const { bytes, extension } = await fetchImageBytes(photo.src);
  const filename = `${photo.slug}.${extension}`;
  await writeFile(path.join(outputDir, filename), bytes);
  return {
    slug: photo.slug,
    city: photo.city,
    src: `/assets/city-photos/${filename}`,
    sourcePage: photo.sourcePage,
    author: photo.author,
    license: photo.license,
    licenseUrl: photo.licenseUrl,
    originalSource: photo.src,
  };
});

const manifest = Object.fromEntries(
  downloaded
    .filter((entry) => entry && !entry.error && entry.slug && entry.src)
    .map((entry) => [entry.slug, entry]),
);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Downloaded ${Object.keys(manifest).length}/${cities.length} city photos to public/assets/city-photos.`);
if (Object.keys(manifest).length < cities.length) {
  console.warn(`Missing photos: ${cities.filter((city) => !manifest[city.slug]).map((city) => city.city).join(", ")}`);
}
