import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const directory = JSON.parse(await readFile(path.join(root, "src/data/cityDirectory.json"), "utf8"));
const photos = JSON.parse(await readFile(path.join(root, "src/data/cityPhotos.json"), "utf8"));
const CONTINENTS = ["Asia", "Africa", "Europe", "Oceania", "Antarctica", "North America", "South America"];
const continentFor = (value) => {
  if (["North America", "Central America", "Caribbean"].includes(value)) return "North America";
  if (value === "Middle East") return "Asia";
  return value;
};
const errors = [];
const checks = [];
const counts = Object.fromEntries(CONTINENTS.map((name) => [name, { cities: 0, photos: 0 }]));
const disallowedImageTitle = /(?:montage|flag(?:ge)?|(?:^|[\s_.-])maps?(?:[\s_.-]|$)|location map|globe|airport|eclipse|coat[ _-]of[ _-]arms|logo|seal|subway|parade|conference|school(?:s|children)?|students?|aircraft|airplane|airline|\bplane\b|trolleybus|\btrain\b|\bcar\b|automobile|vehicle|\btruck\b|food|breakfast|lunch|restaurant|\bshop\b|\bstore\b|portrait|\bperson\b|\bpeople\b|\bgroup\b|interview|secretary|minister|president|politician|speaker|\bspeech\b|musician|singer|concert|football|soccer|basketball|cricket|\.svg|heraldry|arting|graffiti|depression|freddy.?lino|changi.?beach|km-grande.?comore-moroni)/i;

if (directory.length !== 700) errors.push(`Expected 700 city entries; found ${directory.length}`);
if (Object.keys(photos).length !== 700) errors.push(`Expected 700 photo metadata records; found ${Object.keys(photos).length}`);
if (new Set(directory.map((item) => item.slug)).size !== directory.length) errors.push("City slugs must be unique");
if (new Set(directory.map((item) => `${item.countryCode}:${item.city.toLowerCase()}`)).size !== directory.length) errors.push("City-country entries must be unique");

const photoSources = new Map();
for (const item of directory) {
  const continent = continentFor(item.continent);
  if (!counts[continent]) {
    errors.push(`Unknown continent or region: ${item.continent} (${item.slug})`);
    continue;
  }
  counts[continent].cities += 1;
  if (!item.city || !item.country || !item.countryCode) errors.push(`Missing city/country identity: ${item.slug}`);
  if (!Number.isFinite(item.lat) || item.lat < -90 || item.lat > 90 || !Number.isFinite(item.lon) || item.lon < -180 || item.lon > 180) errors.push(`Invalid coordinates: ${item.slug}`);
  const photo = photos[item.slug];
  if (!photo || photo.src !== `/assets/city-photos/${item.slug}.webp`) {
    errors.push(`Missing local photo metadata: ${item.slug}`);
    continue;
  }
  if (!photo.sourcePage || !photo.author || !photo.license) errors.push(`Missing photo attribution/license: ${item.slug}`);
  const sourceTitle = decodeURIComponent((photo.sourcePage ?? "").split("/").pop() ?? "").replace(/^File:/, "").replace(/_/g, " ");
  if (disallowedImageTitle.test(sourceTitle)) errors.push(`Image source title looks unsuitable for a city photo: ${item.slug}`);
  const sameSource = photoSources.get(photo.sourcePage) ?? [];
  sameSource.push(item.slug);
  photoSources.set(photo.sourcePage, sameSource);
  try {
    const file = path.join(root, "public", photo.src.slice(1));
    const [metadata, fileStat] = await Promise.all([sharp(file).metadata(), stat(file)]);
    if (metadata.format !== "webp" || metadata.width < 300 || metadata.height < 180) errors.push(`Invalid image decode/dimensions: ${item.slug}`);
    if (fileStat.size > 350_000) errors.push(`Photo exceeds 350 KB: ${item.slug}`);
    counts[continent].photos += 1;
  } catch (error) {
    errors.push(`Unreadable photo ${item.slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const [continent, count] of Object.entries(counts)) {
  if (count.cities !== count.photos) errors.push(`${continent}: ${count.cities} city records but ${count.photos} valid photos`);
}
for (const [sourcePage, slugs] of photoSources) if (slugs.length > 1) errors.push(`Repeated photo source reused by ${slugs.join(", ")}: ${sourcePage}`);

let distPhotoCount = 0;
for (const photo of Object.values(photos)) {
  try {
    await stat(path.join(root, "dist", photo.src.slice(1)));
    distPhotoCount += 1;
  } catch {
    // Build output check is performed after `vite build`.
  }
}
if (distPhotoCount !== 700) errors.push(`Production build must contain all 700 city photos; found ${distPhotoCount}`);

const appShell = await readFile(path.join(root, "src/shared/ui/AppShell.tsx"), "utf8");
const modalSource = await readFile(path.join(root, "src/features/location/ui/AllCitiesModal.tsx"), "utf8");
const sharedPanelFlow = appShell.includes("const AllCitiesModal = lazy(loadAllCitiesModal)") && appShell.includes("requestIdleCallback") && (appShell.match(/<AllCitiesModal\s/g) ?? []).length === 1 && modalSource.includes('role="dialog"') && modalSource.includes('event.key === "Escape"') && modalSource.includes('loading={priority ? "eager" : "lazy"}');
if (!sharedPanelFlow) errors.push("Location picker shared desktop/mobile, prefetch, close, or lazy image wiring check failed");
const continentMatch = modalSource.match(/const CONTINENTS = \[([\s\S]*?)\] as const/);
const actualContinents = [...(continentMatch?.[1].matchAll(/"([^"]+)"/g) ?? [])].map((match) => match[1]);
if (JSON.stringify(actualContinents) !== JSON.stringify(CONTINENTS)) errors.push("Continent tabs do not match the requested seven-continent order");
if (!modalSource.includes("cityCollator.compare(first.city, second.city)")) errors.push("Curated city results are not sorted alphabetically");
const styleSource = await readFile(path.join(root, "src/styles/desktop.css"), "utf8");
if (!styleSource.includes(".all-cities-continent-pill:nth-child(n + 6)")) errors.push("Long North/South America tab labels lack compact sizing");

const reviewBlanks = JSON.parse(await readFile(path.join(root, "src/data/cityPhotoReviewBlanks.json"), "utf8"));
for (const slug of reviewBlanks) if (!photos[slug]) errors.push(`Unresolved review photo is not a city record: ${slug}`);
if (reviewBlanks.length !== 0) errors.push(`${reviewBlanks.length} city photos still need replacement`);

checks.push("700 city records and 700 photo metadata records");
checks.push("Seven continent tabs in the requested order");
checks.push("Alphabetical city result sorting");
checks.push("Unique city slugs and city-country identities");
checks.push("Latitude and longitude bounds");
checks.push("700 decoded WebP assets within size limit");
checks.push("Photo source, author, license, and no reused source");
checks.push("All images copied into production build output");
checks.push("Shared desktop/mobile picker, prefetch, and close behavior wiring");
checks.push("Compact sizing for the two long continent labels");
checks.push("No city photo tiles left blank for review");

if (errors.length) {
  console.error(JSON.stringify({ ok: false, checksDefined: checks.length, errors: errors.slice(0, 80), totalErrors: errors.length, counts, distPhotoCount }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, checksPassed: checks.length, checks, counts, total: directory.length, distPhotoCount }, null, 2));
}
