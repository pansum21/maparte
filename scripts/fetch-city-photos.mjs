import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputDir = path.join(root, "public/assets/city-photos");
const stagingDir = path.join(root, ".city-photo-staging");
const cities = JSON.parse(await readFile(path.join(root, "src/data/cityDirectory.json"), "utf8"));
const existingPhotos = JSON.parse(await readFile(path.join(root, "src/data/cityPhotos.json"), "utf8"));
const reviewBlanks = JSON.parse(await readFile(path.join(root, "src/data/cityPhotoReviewBlanks.json"), "utf8"));
const userAgent = "MapArteCityPhotoBuilder/1.0 (https://maparte.vercel.app/)";
let nextCommonsRequestAt = 0;
const cleanText = (value = "") => String(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
const safeDecode = (value = "") => {
  try { return decodeURIComponent(String(value)); }
  catch { return String(value).replace(/%([0-9a-f]{2})/gi, " "); }
};
const badPhotoTitle = (value = "") => /(?:montage|collage|flag(?:ge)?|(?:^|[\s_.-])maps?(?:[\s_.-]|$)|location map|globe|chart|graph|infographic|graphic|diagram|logo|seal|stamp|mailbox|airport|eclipse|coat[ _-]of[ _-]arms|subway|parade|conference|school(?:s|children)?|students?|aircraft|airplane|airline|\bplane\b|trolleybus|\btrain\b|\bcar\b|automobile|vehicle|\btruck\b|taxi|vendor|weaver|bird|prinia|wildlife|refugee|soup|restaurant|\bshop\b|\bstore\b|portrait|\bperson\b|\bpeople\b|\bgroup\b|interview|secretary|minister|president|politician|speaker|\bspeech\b|musician|singer|concert|football|soccer|basketball|cricket|soldier|military|army|firing range|looter|construction|workshop|atelier|wikiquote tour|wikiloves earth|schoolroom|classroom|teacher|ferry|highspeed|shipwreck|\bship\b|\bboat\b|webm|video|\.(?:pdf|djvu|svg|webm|mp4|mov|avi|ogv)(?:$|[\s_.-])|heraldry|arting|graffiti|depression|freddy.?lino|changi.?beach|km-grande.?comore-moroni)/i.test(safeDecode(String(value).replace(/_/g, " ")));
const badPhotoSource = (source = "") => badPhotoTitle(source.split("/").pop() || source);
const curatedPhotoFiles = {
  "khirdalan-az-map-poster": "File:Xırdalan (2).jpg",
  "ibri-om-map-poster": "File:Roads less travelled at Ibri, Sultanate of Oman.jpg",
  "nay-pyi-taw-mm-map-poster": "File:NPDAerial22.jpg",
  "liberia-cr-map-poster": "File:Liberia City - Cathedral.JPG",
  "orange-walk-bz-map-poster": "File:Main square, Orange Walk Town, Belize.JPG",
  "puerto-plata-do-map-poster": "File:Puerto Plata Town Dominican Republic.jpg",
  "san-cristobal-do-map-poster": "File:San Cristobal Dominican Republic.jpg",
  "daru-pg-map-poster": "File:Daru Waterfront (10691180695).jpg",
  "ebaye-mh-map-poster": "File:Ebeye Island.jpg",
  "maitland-au-map-poster": "File:Maitland Town Hall.jpg",
  "madaba-jo-map-poster": "File:Overhead view of Madaba city.jpg",
  "wonsan-kp-map-poster": "File:Wonsan, North Korea.jpg",
  "nizwa-om-map-poster": "File:Downtown Nizwa.jpg",
  "salalah-om-map-poster": "File:As Sultan Qaboos Street, Salalah - panoramio.jpg",
  "rabaul-pg-map-poster": "File:Rabaul from Vulcanology Observatory.jpg",
  "dasoguz-tm-map-poster": "File:Dashoguz (1) (46100624911).jpg",
  "barinas-ve-map-poster": "File:Barinas, Venezuela.JPG",
  "machala-ec-map-poster": "File:Aerial image of Machala, Ecuador.jpg",
  "holguin-cu-map-poster": "File:Holguín-1.jpg",
  "paraiso-cr-map-poster": "File:Ruinas Iglesia Ujarras 02 2022 5362.jpg",
  "point-fortin-tt-map-poster": "File:TnT Point Fortin Market 1.jpg",
  "san-pedro-bz-map-poster": "File:San Pedro, Ambergris Caye, Belize - Main Street.JPG",
  "siguatepeque-hn-map-poster": "File:Siguatepeque01.JPG",
  "tunapuna-tt-map-poster": "File:TnT Tunapuna Eastern Main Road.jpg",
  "wewak-pg-map-poster": "File:Wewak.png",
  "codrington-ag-map-poster": "File:Codrington 15, Barbuda.jpg",
  "moundou-td-map-poster": "File:La ville de Moundou.jpg",
  "neiafu-to-map-poster": "File:Neiafu Vava'u.jpg",
  "darhan-mn-map-poster": "File:Darkhan.jpg",
  "puerto-montt-cl-map-poster": "File:Chile - Puerto Montt - Panorama.jpg",
  "santo-domingo-oeste-do-map-poster": "File:Elevado de Manoguayabo Autopista Duarte.jpg",
  "lelydorp-sr-map-poster": "File:Lelydorp, Suriname 2004.jpg",
  "arraijan-pa-map-poster": "File:Arraijan, Panama - panoramio.jpg",
  "la-chorrera-pa-map-poster": "File:La Chorrera, Panama.jpg",
  "santorini-map-poster": "File:Panoramic view of Oia, Santorini island (Thira), Greece.jpg",
  "baghdad-map-poster": "File:160731-D-PB383-021 Tigris River flows through Baghdad, July 2016.JPG",
  "goa-map-poster": "File:Basilica of Bom Jesus, Old Goa, India.JPG",
  "yamoussoukro-map-poster": "File:Basilique notre Dame de la Paix de Yamoussoukro 21.jpg",
  "djibouti-map-poster": "File:An aerial view of Djibouti City.jpg",
  "mbuji-mayi-map-poster": "File:Mbuji-Mayi.jpg",
  "kakamega-map-poster": "File:KakamegaForest.jpg",
  "fes-map-poster": "File:Panoramic view of the Medina of Fes.jpg",
  "camayenne-map-poster": "File:Hotel Camayenne Conakry.jpg",
  "ankara-map-poster": "File:Ankara Skyline.jpg",
  "douglas-map-poster": "File:Douglas Promenade.jpg",
  "bangui-map-poster": "File:Bangui City Centre.jpg",
  "addis-ababa-map-poster": "File:Addis Ababa skyline.jpg",
  "bouake-map-poster": "File:La tour des télécoms de Bouaké.jpg",
  "niamey-map-poster": "File:Niamey from the sky.jpg",
};

async function fetchJson(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const now = Date.now();
    const wait = Math.max(0, nextCommonsRequestAt - now);
    nextCommonsRequestAt = Math.max(now, nextCommonsRequestAt) + 350;
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" }, signal: AbortSignal.timeout(25_000) });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) throw new Error(`Wikimedia API HTTP ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
  }
  throw new Error("Wikimedia API retries exhausted");
}

async function fetchImageBytes(url) {
  const parsed = new URL(url);
  if (!/^(upload|thumb)\.wikimedia\.org$/.test(parsed.hostname)) throw new Error(`Unexpected image host: ${parsed.hostname}`);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "image/*" }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) throw new Error(`Image HTTP ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 2_000 || bytes.length > 12_000_000) throw new Error(`Unexpected source image size: ${bytes.length}`);
    return bytes;
  }
  throw new Error("Image retries exhausted");
}

function licensedPhoto(info, page) {
  const metadata = info?.extmetadata ?? {};
  const license = cleanText(metadata.LicenseShortName?.value ?? "");
  const licenseUrl = metadata.LicenseUrl?.value ?? "";
  const description = cleanText(metadata.ImageDescription?.value ?? "");
  if (!info?.thumburl || !info?.descriptionurl || !license || badPhotoTitle(page?.title ?? "") || badPhotoTitle(description)) return null;
  if (!/CC0|CC BY|Public domain|PD-|CC BY-SA/i.test(license)) return null;
  return {
    url: info.thumburl,
    sourcePage: info.descriptionurl,
    author: cleanText(metadata.Artist?.value || metadata.Credit?.value || "Wikimedia contributor"),
    license,
    licenseUrl,
    sourceTitle: page.title,
  };
}

async function findCommonsPhoto(city) {
  const curatedTitle = curatedPhotoFiles[city.slug];
  if (curatedTitle) {
    const params = new URLSearchParams({
      action: "query", format: "json", titles: curatedTitle,
      prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "900",
    });
    const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    const page = Object.values(data?.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    const curated = licensedPhoto(info, page);
    if (!curated || Math.max(info.width, info.height) < 500 || Math.min(info.width, info.height) < 200) {
      throw new Error(`Curated Commons image failed license/relevance checks: ${curatedTitle}`);
    }
    return curated;
  }

  const extraSearch = {
    "montevideo-map-poster": ["Palacio Salvo", "Montevideo Rambla"],
    "phoenix-map-poster": ["Phoenix Arizona downtown skyline", "Camelback Mountain Phoenix"],
    "sheffield-map-poster": ["Sheffield city centre skyline", "Sheffield Town Hall"],
    "canberra-map-poster": ["Lake Burley Griffin Canberra", "Parliament House Canberra"],
    "nukualofa-map-poster": ["Nuku'alofa waterfront Tonga", "Nuku'alofa Royal Palace"],
    "kinshasa-map-poster": ["Kinshasa skyline Congo River", "Kinshasa Boulevard du 30 Juin"],
    "addis-ababa-map-poster": ["Addis Ababa skyline Ethiopia", "Addis Ababa Meskel Square"],
    "mbuji-mayi-map-poster": ["Mbuji-Mayi city centre", "Mbuji-Mayi downtown Congo"],
    "bamako-map-poster": ["Bamako skyline Niger River bridge", "Bamako city panorama Mali"],
    "kakamega-map-poster": ["Kakamega town Kenya streets", "Kakamega town centre buildings"],
    "douglas-map-poster": ["Douglas Bay Isle of Man", "Douglas Promenade Isle of Man", "Douglas Isle of Man harbour", "Douglas Head Isle of Man"],
    "santorini-map-poster": ["Oia village Santorini Greece caldera", "Fira town Santorini Greece view"],
    "baghdad-map-poster": ["Baghdad skyline Iraq Tigris", "Baghdad city panorama Iraq"],
    "goa-map-poster": ["Panaji Goa waterfront India", "Old Goa Basilica of Bom Jesus India"],
    "yamoussoukro-map-poster": ["Basilica Our Lady of Peace Yamoussoukro", "Yamoussoukro city skyline"],
    "djibouti-map-poster": ["Djibouti city modern skyline", "Djibouti city waterfront buildings"],
    "mbuji-mayi-map-poster": ["Mbuji-Mayi downtown city Congo", "Mbuji-Mayi street buildings"],
    "kakamega-map-poster": ["Kakamega town centre Kenya buildings", "Kakamega town street Kenya"],
    "fes-map-poster": ["Fes Medina Morocco city", "Fes Morocco Bab Bou Jeloud"],
    "camayenne-map-poster": ["Camayenne Conakry Guinea city view", "Conakry Camayenne waterfront Guinea"],
  };
  const terms = [
    `"${city.city}" ${city.country} skyline`,
    `"${city.city}" ${city.country} city panorama`,
    `"${city.city}" ${city.country} landmark`,
    `"${city.city}" ${city.country}`,
    ...(extraSearch[city.slug] ?? []),
    ...(city.photoSearchAliases ?? []).map((alias) => `"${alias}" ${city.country} city`),
  ];
  const candidates = new Map();
  const normalize = (value = "") => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
  const cityName = normalize(city.city);
  const cityAliases = [
    ...(city.slug === "nukualofa-map-poster" ? ["nuku alofa"] : []),
    ...(city.photoSearchAliases ?? []),
  ];
  const countryName = normalize(city.country);
  const landmarkNames = [...(city.landmarks ?? []), ...(extraSearch[city.slug] ?? [])].map(normalize).filter((name) => name.length >= 4);
  for (const term of terms) {
    const params = new URLSearchParams({
      action: "query", format: "json", origin: "*", generator: "search", gsrnamespace: "6",
      gsrsearch: term, gsrlimit: "30", prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "900",
    });
    const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    const pages = Object.values(data?.query?.pages ?? {});
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      const candidate = licensedPhoto(info, page);
      if (!candidate || Math.max(info.width, info.height) < 500 || Math.min(info.width, info.height) < 200 || Math.min(info.width, info.height) / Math.max(info.width, info.height) < 0.2) continue;
      const title = normalize(page.title.replace(/^File:/i, ""));
      const description = normalize(cleanText(info.extmetadata?.ImageDescription?.value ?? ""));
      const cityInTitle = title.includes(cityName) || cityAliases.some((alias) => title.includes(normalize(alias)));
      const cityInDescription = description.includes(cityName);
      const includesLandmark = landmarkNames.some((name) => title.includes(name));
      const clearlyUrban = /skyline|cityscape|panorama|aerial|city center|city centre|downtown|harbou?r|waterfront|bay view|old town|historic center|historic centre|architecture|street scene|city view|city panorama/.test(`${title} ${description}`);
      if (!cityInTitle && !includesLandmark) continue;
      let score = cityInTitle ? 20 : cityInDescription && clearlyUrban ? 8 : 0;
      if (includesLandmark) score += 24;
      if (title.includes(countryName) || description.includes(countryName)) score += 3;
      if (clearlyUrban) score += 4;
      if (info.width >= info.height) score += 2;
      const current = candidates.get(candidate.sourcePage);
      if (!current || current.score < score) candidates.set(candidate.sourcePage, { ...candidate, score });
    }
  }
  const best = [...candidates.values()].sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= 10) return best;
  throw new Error("No relevant, freely licensed city photograph found; refusing unrelated image");
}

async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = await task(items[index]); }
      catch (error) { results[index] = { error: error instanceof Error ? error.message : String(error) }; }
    }
  }));
  return results;
}

if (process.env.FETCH_CITY_PHOTOS !== "1") {
  console.log("City photo refresh skipped; set FETCH_CITY_PHOTOS=1 to build the city photo set.");
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });
const forcedRefresh = new Set([...reviewBlanks, ...(process.env.EXTRA_REFRESH_SLUGS ?? "").split(",").map((slug) => slug.trim()).filter(Boolean)]);
const missingCities = cities.filter((city) => !existingPhotos[city.slug] || badPhotoSource(existingPhotos[city.slug]?.sourcePage) || forcedRefresh.has(city.slug));
const refreshSlugs = new Set(missingCities.map((city) => city.slug));
console.log(`Refreshing ${missingCities.length} city photos selected by title and visual QA.`);
await mkdir(stagingDir, { recursive: true });
const results = await mapLimit(cities, 3, async (city) => {
  const current = existingPhotos[city.slug];
  if (current && !refreshSlugs.has(city.slug)) return current;
  const filename = `${city.slug}.webp`;
  const destination = path.join(stagingDir, filename);
  const sidecar = path.join(stagingDir, `${city.slug}.json`);
  try {
    const stagedMeta = JSON.parse(await readFile(sidecar, "utf8"));
    const stagedImage = await readFile(destination);
    const stagedInfo = await sharp(stagedImage).metadata();
    if (stagedMeta.slug === city.slug && stagedMeta.sourcePage && stagedMeta.license && stagedInfo.format === "webp" && stagedInfo.width >= 300 && stagedInfo.height >= 180 && stagedImage.length <= 350_000) return stagedMeta;
  } catch { /* Rebuild missing or invalid checkpoints below. */ }
  await rm(sidecar, { force: true });
  await rm(destination, { force: true });
  const existingPath = current?.src?.startsWith("/assets/city-photos/") ? path.join(root, "public", current.src.slice(1)) : "";
  let sourcePhoto = null;
  let sourceBytes = null;

  if (existingPath && current.sourcePage && current.license && !badPhotoSource(current.sourcePage) && !forcedRefresh.has(city.slug)) {
    try {
      sourceBytes = await readFile(existingPath);
      await sharp(sourceBytes).metadata();
      sourcePhoto = current;
    } catch { sourceBytes = null; }
  }
  if (!sourceBytes) {
    sourcePhoto = await findCommonsPhoto(city);
    sourceBytes = await fetchImageBytes(sourcePhoto.url);
  }

  const converted = await sharp(sourceBytes, { failOn: "error" })
    .rotate()
    .resize({ width: 900, height: 650, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 79, effort: 4, smartSubsample: true })
    .toBuffer();
  const meta = await sharp(converted).metadata();
  if (!meta.width || !meta.height || meta.width < 300 || meta.height < 180) throw new Error(`Photo dimensions too small: ${meta.width}×${meta.height}`);
  if (converted.length > 350_000) throw new Error(`Optimized photo too large: ${converted.length} bytes`);
  await writeFile(destination, converted);

  const result = {
    slug: city.slug,
    city: city.city,
    country: city.country,
    src: `/assets/city-photos/${filename}`,
    sourcePage: sourcePhoto.sourcePage,
    author: sourcePhoto.author || "Wikimedia contributor",
    license: sourcePhoto.license,
    licenseUrl: sourcePhoto.licenseUrl || "",
  };
  await writeFile(sidecar, `${JSON.stringify(result)}\n`);
  return result;
});

const failures = results.map((result, index) => result?.error ? `${cities[index].city}, ${cities[index].country}: ${result.error}` : null).filter(Boolean);
if (failures.length) {
  console.error(JSON.stringify({ processed: cities.length, successful: results.filter((result) => result && !result.error).length, failures, checkpointFiles: (await readdir(stagingDir)).filter((file) => file.endsWith(".json")).length }, null, 2));
  process.exitCode = 1;
} else {
const manifest = Object.fromEntries(results.filter((result) => result && !result.error).map((result) => [result.slug, result]));
for (const slug of refreshSlugs) await rename(path.join(stagingDir, `${slug}.webp`), path.join(outputDir, `${slug}.webp`));
await rm(stagingDir, { recursive: true, force: true });
await writeFile(path.join(root, "src/data/cityPhotos.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(root, "src/data/cityPhotoReviewBlanks.json"), "[]\n");
const usedAssets = new Set(Object.values(manifest).map((photo) => path.basename(photo.src)));
for (const file of await readdir(outputDir)) {
  if (file.endsWith(".webp") && !usedAssets.has(file)) await rm(path.join(outputDir, file));
}
console.log(JSON.stringify({ processed: cities.length, successful: Object.keys(manifest).length, failures: [], replacedReviewBlanks: reviewBlanks.length }, null, 2));
}
