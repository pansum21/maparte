import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const directory = JSON.parse(await readFile(path.join(root, "src/data/cityDirectory.json"), "utf8"));
const photos = JSON.parse(await readFile(path.join(root, "src/data/cityPhotos.json"), "utf8"));
const regionFor = (continent) => continent === "Europe" ? "Europe" : continent === "Africa" ? "Africa" : ["Asia", "Middle East", "Oceania"].includes(continent) ? "Asia" : "Americas";
const errors = [];
const checks = [];
const disallowedImageTitle = /(?:montage|flag(?:ge)?|(?:^|[\s_.-])maps?(?:[\s_.-]|$)|location map|globe|airport|eclipse|coat[ _-]of[ _-]arms|logo|seal|subway|parade|conference|school(?:s|children)?|students?|aircraft|airplane|airline|\bplane\b|trolleybus|\btrain\b|\bcar\b|automobile|vehicle|\btruck\b|food|breakfast|lunch|restaurant|\bshop\b|\bstore\b|portrait|\bperson\b|\bpeople\b|\bgroup\b|interview|secretary|minister|president|politician|speaker|\bspeech\b|musician|singer|concert|football|soccer|basketball|cricket|\.svg|heraldry|arting|graffiti|depression|freddy.?lino|changi.?beach|km-grande.?comore-moroni)/i;
const counts = Object.fromEntries(["Americas", "Europe", "Asia", "Africa"].map((region) => [region, { cities: 0, capitals: 0, photos: 0 }]));

if (directory.length !== 400) errors.push(`Expected 400 city entries; found ${directory.length}`);
if (new Set(directory.map((item) => item.slug)).size !== directory.length) errors.push("City slugs must be unique");
if (new Set(directory.map((item) => `${item.countryCode}:${item.city.toLowerCase()}`)).size !== directory.length) errors.push("City-country entries must be unique");

for (const item of directory) {
  const region = regionFor(item.continent);
  counts[region].cities += 1;
  counts[region].capitals += Number(item.isCapital);
  if (!item.city || !item.country || !item.countryCode) errors.push(`Missing city/country identity: ${item.slug}`);
  if (!Number.isFinite(item.lat) || item.lat < -90 || item.lat > 90 || !Number.isFinite(item.lon) || item.lon < -180 || item.lon > 180) errors.push(`Invalid coordinates: ${item.slug}`);
  const photo = photos[item.slug];
  if (!photo || photo.src !== `/assets/city-photos/${item.slug}.webp`) {
    errors.push(`Missing local photo metadata: ${item.slug}`);
    continue;
  }
  if (!photo.sourcePage || !photo.author || !photo.license) errors.push(`Missing photo attribution/license: ${item.slug}`);
  const sourceTitle = decodeURIComponent((photo.sourcePage ?? "").split("/").pop() ?? "").replace(/^File:/, "").replace(/_/g, " ");
  if (disallowedImageTitle.test(sourceTitle)) errors.push(`Image source title looks like a flag/map/logo/event instead of a city photo: ${item.slug}`);
  try {
    const file = path.join(root, "public", photo.src.slice(1));
    const [metadata, fileStat] = await Promise.all([sharp(file).metadata(), stat(file)]);
    if (metadata.format !== "webp" || metadata.width < 300 || metadata.height < 180) errors.push(`Invalid image decode/dimensions: ${item.slug}`);
    if (fileStat.size > 350_000) errors.push(`Photo exceeds 350 KB: ${item.slug}`);
    counts[region].photos += 1;
  } catch (error) {
    errors.push(`Unreadable photo ${item.slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const [region, count] of Object.entries(counts)) {
  if (count.cities !== 100) errors.push(`${region}: expected 100 cities; found ${count.cities}`);
  if (count.photos !== 100) errors.push(`${region}: expected 100 valid photos; found ${count.photos}`);
  if (count.capitals === 0) errors.push(`${region}: no country capitals marked`);
}

for (const region of Object.keys(counts)) {
  const entries = directory.filter((item) => regionFor(item.continent) === region);
  const firstNonCapital = entries.findIndex((item) => !item.isCapital);
  if (firstNonCapital < 0 || entries.slice(firstNonCapital).some((item) => item.isCapital)) errors.push(`${region}: all capitals must precede other cities`);
}
const duplicatePhotoSources = Object.entries(photos).reduce((seen, [slug, photo]) => {
  if (!photo.sourcePage) return seen;
  const slugs = seen.get(photo.sourcePage) ?? [];
  slugs.push(slug);
  seen.set(photo.sourcePage, slugs);
  return seen;
}, new Map());
for (const [sourcePage, slugs] of duplicatePhotoSources) if (slugs.length > 1) errors.push(`Repeated photo source reused by ${slugs.join(", ")}: ${sourcePage}`);

const distRoot = path.join(root, "dist");
let distPhotoCount = 0;
for (const photo of Object.values(photos)) {
  try {
    const distFile = path.join(distRoot, "public", photo.src.slice(1));
    await stat(distFile);
    distPhotoCount += 1;
  } catch {
    // Vite copies public/ directly into dist/; allow either path layout for preview adapters.
    try { await stat(path.join(distRoot, photo.src.slice(1))); distPhotoCount += 1; } catch { /* reported below */ }
  }
}
if (distPhotoCount !== 400) errors.push(`Production build must contain all 400 city photos; found ${distPhotoCount}`);

const appShell = await readFile(path.join(root, "src/shared/ui/AppShell.tsx"), "utf8");
const modalSource = await readFile(path.join(root, "src/features/location/ui/AllCitiesModal.tsx"), "utf8");
const sharedPanelFlow = appShell.includes("const AllCitiesModal = lazy(loadAllCitiesModal)") && appShell.includes("requestIdleCallback") && (appShell.match(/<AllCitiesModal\s/g) ?? []).length === 1 && modalSource.includes('role="dialog"') && modalSource.includes('event.key === "Escape"') && modalSource.includes('loading={priority ? "eager" : "lazy"}');
if (!sharedPanelFlow) errors.push("Location picker shared desktop/mobile, prefetch, close, or lazy-photo wiring check failed");

const reviewBlanks = JSON.parse(await readFile(path.join(root, "src/data/cityPhotoReviewBlanks.json"), "utf8"));
for (const slug of reviewBlanks) {
  if (!photos[slug]) errors.push(`Unresolved review photo is not a city record: ${slug}`);
}
if (reviewBlanks.length !== 0) errors.push(`${reviewBlanks.length} city photos still need replacement`);

checks.push("400 total city records");
checks.push("Exactly 100 records in each region");
checks.push("Capitals marked and ordered before other cities");
checks.push("Unique city slugs and country-city identities");
checks.push("Latitude and longitude bounds");
checks.push("400 decoded WebP assets within size limit");
checks.push("Image source, author, and license attribution present");
checks.push("No reused or disallowed flag/map/event photo sources");
checks.push("All 400 images copied into production build output");
checks.push("Shared picker prefetch, keyboard close, and lazy image behavior");
checks.push("No city photo tiles left blank for review");

if (errors.length) {
  console.error(JSON.stringify({ ok: false, checksDefined: checks.length, errors: errors.slice(0, 80), totalErrors: errors.length, counts, distPhotoCount }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, checksPassed: checks.length, checks, counts, total: directory.length, capitalCount: directory.filter((item) => item.isCapital).length, distPhotoCount }, null, 2));
}
