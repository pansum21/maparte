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
const assetFilenameFor = (slug) => slug === "al-ahmadi-map-poster" ? "al-ahmadi-city-poster.webp" : `${slug}.webp`;
const safeDecode = (value = "") => {
  try { return decodeURIComponent(String(value)); }
  catch { return String(value).replace(/%([0-9a-f]{2})/gi, " "); }
};
const badPhotoTitle = (value = "") => /(?:montage|collage|flag(?:ge)?|(?:^|[\s_.-])maps?(?:[\s_.-]|$)|shakemap|locator map|location map|location of|map tile|map image|satellite|topographic|globe|chart|\bgraph\b|infographic|graphic|diagram|logo|seal|stamp|mailbox|airport|eclipse|coat[ _-]of[ _-]arms|subway|parade|conference|demonstration|protest|school(?:s|children)?|students?|aircraft|airplane|airline|\bplane\b|airshow|trolleybus|\btrain\b|\bbus\b|\bcar\b|automobile|vehicle|\btruck\b|taxi|vendor|seller|weaver|bird|prinia|wildlife|animal|\bcat\b|\bdog\b|insect|moth|butterfly|fungus|skink|farm|agricultural|terrace|wheat|refugee|relief supplies|soup|restaurant|cafe|coffeehouse|coffee shop|\bshop\b|\bstore\b|plate|dinner|food|carpet|portrait|\bperson\b|\bpeople\b|\bgroup\b|\bboys\b|\bgirls\b|interview|secretary|minister|president|politician|speaker|\bspeech\b|musician|singer|concert|football|soccer|basketball|cricket|\bmatch\b|\bversus\b|\bvs\b|\bteam\b|\bplayer\b|\bclub\b|\bleague\b|\btank\b|soldier|military|army|firing range|looter|damage from|attack on|\bwar\b|construction|workshop|atelier|wikiquote tour|wikiloves earth|schoolroom|classroom|teacher|ferry|highspeed|shipwreck|\bship\b|\bboat\b|railway station|train station|platform|museum interior|\b18\d{2}\b|\b19\d{2}\b|historic photograph|old photograph|webm|video|\.(?:pdf|djvu|svg|webm|mp4|mov|avi|ogv)(?:$|[\s_.-])|heraldry|arting|graffiti|depression|freddy.?lino|changi.?beach|km-grande.?comore-moroni|manas[ _-]raion|^le moule\.png$|^mashhad iran\.jpg$)/i.test(safeDecode(String(value).replace(/_/g, " ")));
const badPhotoSource = (source = "") => badPhotoTitle(source.split("/").pop() || source);
const curatedPhotoFiles = {
  "tuerkmenabat-map-poster": "File:Центр Туркменабада.jpg",
  "srinagar-in-map-poster": "File:Dal lake city.jpg",
  "nay-pyi-taw-mm-map-poster": "File:Pyithu Hluttaw Building Naypyidaw March 2026.jpg",
  "soyapango-map-poster": "File:Soyapango 2012.jpg",
  "santiago-de-los-caballeros-map-poster": "File:SantiagoCitySkyline2.jpg",
  "point-fortin-tt-map-poster": "File:STAPP 116 Point Fortin Salazar Village.jpg",
  "callao-map-poster": "File:Puerto-del-callao.jpg",
  "paramaribo-map-poster": "File:Paramaribo street, Suriname.jpg",
  "portoviejo-map-poster": "File:PortoviejoCathedral.jpg",
  "salvador-map-poster": "File:Skyline of Salvador, Brazil.jpg",
  "pikine-map-poster": "File:Forêt de Pikine.jpg",
  "lome-map-poster": "File:Street scene, Lomé, Togo.JPG",
  "sao-tome-map-poster": "File:Sao Tome City centre.jpg",
  "faaa-map-poster": "File:Marae Taumata1.jpg",
  "goroka-pg-map-poster": "File:Goroka.JPG",
  "jaluit-map-poster": "File:Jaluit Atoll 1978.jpg",
  "lautoka-map-poster": "File:Lautoka Streets 20.jpg",
  "mount-hagen-map-poster": "File:Gardens (6348365309).jpg",
  "szeged-map-poster": "File:University of Szeged - square.JPG",
  "shubra-al-khaymah-map-poster": "File:شارع عبد الرؤوف من شرفة 01.jpg",
  "phuntsholing-map-poster": "File:Phuentsholing street views during LGFC - Bhutan 2019 (34).jpg",
  "tsirang-bt-map-poster": "File:Dzong at Damphu Tsirang Bhutan.jpg",
  "basrah-iq-map-poster": "File:Basra city.jpg",
  "kulob-tj-map-poster": "File:Kulob,ul-Somoni.jpg",
  "al-ahmadi-map-poster": "File:Knpc headoffice kwt.JPG",
  "mueang-nonthaburi-th-map-poster": "File:Nonthaburi1.jpg",
  "les-abymes-map-poster": "File:Mairie des Abymes 3.jpg",
  "providenciales-map-poster": "File:Providenciales Town Centre Mall.jpg",
  "san-miguel-map-poster": "File:Catedral Nuestra Señora de La Paz, Ciudad de San Miguel, El Salvador..JPG",
  "santa-ana-sv-map-poster": "File:Parque Libertad en Santa Ana, El Salvador - 2013.jpg",
  "capesterre-belle-eau-gp-map-poster": "File:Allée Dumanoir, Capesterre-Belle-Eau.JPG",
  "jutiapa-gt-map-poster": "File:Parque y kiosko de Jutiapa.JPG",
  "las-tunas-cu-map-poster": "File:Las Tunas Plaza Martiana CF9A0928.jpg",
  "potosi-bo-map-poster": "File:Panorama de la Ciudad de Potosí Bolivia.jpg",
  "suai-map-poster": "File:New Ave Maria Church Suai.jpg",
  "caguas-pr-map-poster": "File:Carousel and church at main plaza in Caguas, Puerto Rico.jpg",
  "chiclayo-map-poster": "File:Chiclayo, Plaza de Armas.jpg",
  "kandahar-af-map-poster": "File:Street in Kandahar City2.jpg",
  "gaza-map-poster": "File:Gaza City.JPG",
  "thimphu-map-poster": "File:Thimphu main street - Bhutan - panoramio.jpg",
  "baghdad-map-poster": "File:Baghdad Street View.jpg",
  "amman-map-poster": "File:Amman cityscape and skyline from Citadel Hill.jpg",
  "andijon-map-poster": "File:Street in Andijan.jpg",
  "santiago-de-veraguas-pa-map-poster": "File:Iglesia Santiago de Apostol.jpg",
  "leon-map-poster": "File:Street in León, Nicaragua.jpg",
  "holguin-cu-map-poster": "File:Holguín Street.jpg",
  "mar-del-plata-map-poster": "File:MDQ skyline.jpg",
  "andorra-la-vella-map-poster": "File:Andorra la Vella - view.jpg",
  "dumbea-nc-map-poster": "File:Barrage de la dumbea nouvelle Calédonie.jpg",
  "arar-sa-map-poster": "File:20210128 153213Arar Tower.jpg",
  "sumgayit-map-poster": "File:Goyerchin Parki,symbol of Sumgayit an amazing place to walk by and enjoy.jpg",
  "namp-o-kp-map-poster": "File:Nampocity.jpg",
  "isfara-map-poster": "File:Isfara Park.jpg",
  "faisalabad-map-poster": "File:Clock Tower Faisalabad by Usman Nadeem.jpg",
  "tuen-mun-hk-map-poster": "File:Tuen Mun Town Centre.jpg",
  "bulolo-pg-map-poster": "File:(Aerial view of the topography of Papua New Guinea) - DPLA - 3fe0ce3b61f68844e51c98c13175d71f.jpg",
  "kokopo-map-poster": "File:Rabaul - Kokopo (30).jpg",
  "portmore-map-poster": "File:Hellshire-beach.jpg",
  "arawa-map-poster": "File:Bagana.jpg",
  "popondetta-map-poster": "File:Port Moresby-Popondetta 001.jpg",
  "malango-sb-map-poster": "File:Guadalcanal Field.jpg",
  "eloy-alfaro-map-poster": "File:Centro de Durán.jpg",
  "ibague-map-poster": "File:Plaza de Bolivar Ibague.JPG",
  "lambare-map-poster": "File:Plaza Central de Lambaré, Paraguay.jpg",
  "las-piedras-uy-map-poster": "File:LasPiedras central avenue.jpg",
  "piura-map-poster": "File:Piura desde el aire.jpg",
  "ar-rayyan-map-poster": "File:A roundabout in Old Al Rayyan.jpg",
  "pucallpa-pe-map-poster": "File:Pucallpa Plaza San Martín Fountain by Night.jpg",
  "madinah-sa-map-poster": "File:As Suqya, Medina Saudi Arabia - panoramio.jpg",
  "beijing-map-poster": "File:Beijing China Forbidden-City-01.jpg",
  "new-territories-map-poster": "File:Above Tseung Kwan O.jpg",
  "bamako-map-poster": "File:Hilltop view over Bamako.jpg",
  "agana-map-poster": "File:Hagatna from Fort Santa Agueda.JPG",
  "noumea-map-poster": "File:NouméaCentre.jpg",
  "logan-city-map-poster": "File:AKIPS Headquarters Logan City.jpg",
  "tocumen-pa-map-poster": "File:Aeropuerto-Panama-Tocumen.jpg",
  "madang-map-poster": "File:Madang (5501557827).jpg",
  "bekasi-id-map-poster": "File:Bekasi Mall Night.jpg",
  "escuintla-gt-map-poster": "File:Escuintla, Guatemala - panoramio (11).jpg",
  "manas-kg-map-poster": "File:Uprava Chyngyz Aytmatov.jpg",
  "khulna-bd-map-poster": "File:Khulna Skyline.jpg",
  "casablanca-map-poster": "File:Casablanca city.jpg",
  "viana-map-poster": "File:Acail Angola - Viana - panoramio.jpg",
  "dodoma-map-poster": "File:Scene at Nyerere Square, Dodoma City.jpg",
  "port-de-paix-ht-map-poster": "File:Vue de la ville du Port de Paix (Nicolas Ozanne et Nicolas Ponce).jpg",
  "khirdalan-az-map-poster": "File:Xırdalan (2).jpg",
  "ibri-om-map-poster": "File:Roads less travelled at Ibri, Sultanate of Oman.jpg",
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
  "paraiso-cr-map-poster": "File:Ruinas Iglesia Ujarras 02 2022 5362.jpg",
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
  "stuttgart-map-poster": "File:Stuttgart City from TV Tower.JPG",
  "poznan-map-poster": "File:Stare Miasto w Poznaniu.jpg",
  "gdansk-map-poster": "File:View of Gdańsk, towards Old Town.jpg",
  "choibalsan-map-poster": "File:Choibalsan statue and National University of Mongolia.jpg",
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

function licensedPhoto(info, page, { allowAirport = false, allowLocalTransit = false, allowJaluitAerial = false, allowPointFortinAerial = false } = {}) {
  const metadata = info?.extmetadata ?? {};
  const license = cleanText(metadata.LicenseShortName?.value ?? "");
  const licenseUrl = metadata.LicenseUrl?.value ?? "";
  const description = cleanText(metadata.ImageDescription?.value ?? "");
  const localTransit = allowLocalTransit && /Viana.*Transporte.*rodoviario/i.test(page?.title ?? "");
  const titleBlocked = badPhotoTitle(page?.title ?? "") && !(allowAirport && /airport/i.test(page?.title ?? "")) && !localTransit && !(allowJaluitAerial && page?.title === "File:Jaluit Atoll 1978.jpg") && !(allowPointFortinAerial && page?.title === "File:STAPP 116 Point Fortin Salazar Village.jpg");
  const descriptionBlocked = badPhotoTitle(description) && !(allowAirport && /airport/i.test(description)) && !localTransit && !(allowJaluitAerial && /Aerial view of Jaluit Atoll in 1978/i.test(description)) && !(allowPointFortinAerial && /aerial photo project/i.test(description));
  if (!info?.thumburl || !info?.descriptionurl || !license || titleBlocked || descriptionBlocked) return null;
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
    const curated = licensedPhoto(info, page, {
      allowAirport: city.slug === "tocumen-pa-map-poster",
      allowLocalTransit: city.slug === "viana-map-poster",
      allowJaluitAerial: city.slug === "jaluit-map-poster",
      allowPointFortinAerial: city.slug === "point-fortin-tt-map-poster",
    });
    if (!curated || Math.max(info.width, info.height) < 500 || Math.min(info.width, info.height) < 200) {
      throw new Error(`Curated Commons image failed license/relevance checks: ${curatedTitle}`);
    }
    return curated;
  }

  const extraSearch = {
    "basrah-iq-map-poster": ["Basra Iraq city skyline", "Basra Iraq waterfront", "Basra Iraq old town"],
    "beijing-map-poster": ["Beijing city street skyline", "Beijing hutong city view", "Forbidden City Beijing skyline"],
    "mashhad-map-poster": ["Mashhad city skyline Iran", "Mashhad Imam Reza shrine city", "Mashhad downtown Iran"],
    "al-muharraq-map-poster": ["Muharraq Bahrain old town", "Muharraq Bahrain street", "Muharraq Bahrain waterfront"],
    "ar-rayyan-map-poster": ["Al Rayyan Qatar city view", "Al Rayyan Qatar town center", "Al Rayyan skyline Qatar"],
    "bekasi-id-map-poster": ["Bekasi Indonesia city skyline", "Bekasi city center buildings", "Bekasi street view Indonesia"],
    "hyderabad-pk-map-poster": ["Hyderabad Sindh cityscape", "Hyderabad Pakistan old city", "Hyderabad Sindh street"],
    "madinah-sa-map-poster": ["Medina Saudi Arabia skyline", "Madinah city panorama Saudi Arabia", "Medina city center Saudi Arabia"],
    "new-territories-map-poster": ["New Territories Hong Kong town skyline", "Tai Po Hong Kong skyline", "Sha Tin Hong Kong town view"],
    "pucallpa-pe-map-poster": ["Pucallpa Peru city skyline", "Pucallpa town center", "Pucallpa city street Peru"],
    "apopa-sv-map-poster": ["Apopa El Salvador town center", "Apopa city street El Salvador", "Apopa downtown"],
    "escuintla-gt-map-poster": ["Escuintla Guatemala city center", "Escuintla Guatemala street view", "Escuintla city skyline Guatemala"],
    "port-de-paix-ht-map-poster": ["Port de Paix Haiti city waterfront", "Port-de-Paix Haiti town center", "Port de Paix city street"],
    "tocumen-pa-map-poster": ["Tocumen Panama town center", "Tocumen Panama city street", "Tocumen city buildings"],
    "bamako-map-poster": ["Bamako city skyline Mali", "Bamako Niger River bridge skyline", "Bamako downtown buildings"],
    "dodoma-map-poster": ["Dodoma Tanzania city center", "Dodoma city skyline Tanzania", "Dodoma town street"],
    "mombasa-map-poster": ["Mombasa Kenya city skyline", "Mombasa old town Kenya", "Mombasa waterfront buildings"],
    "odesa-map-poster": ["Odesa Ukraine city skyline", "Odesa city center architecture", "Odesa waterfront Ukraine"],
    "faaa-map-poster": ["Faa'a Tahiti town center", "Faaa French Polynesia street", "Faa'a urban view Tahiti"],
    "lae-map-poster": ["Lae Papua New Guinea town center", "Lae city street PNG", "Lae skyline Papua New Guinea"],
    "logan-city-map-poster": ["Logan City Queensland skyline", "Logan Central Australia town center", "Logan City Australia buildings"],
    "maliana-map-poster": ["Maliana Timor-Leste town center", "Maliana Timor Leste street", "Maliana city view Timor-Leste"],
    "noumea-map-poster": ["Noumea city skyline New Caledonia", "Noumea harbour waterfront", "Noumea town center"],
    "mackay-au-map-poster": ["Mackay CBD skyline Queensland", "Mackay city center Australia", "Mackay waterfront city"],
    "madang-map-poster": ["Madang Papua New Guinea town center", "Madang harbour town skyline", "Madang city street PNG"],
    "homyel-map-poster": ["Gomel Belarus city center", "Homyel Belarus city view", "Gomel Belarus street"],
    "faaa-map-poster": ["Faa'a Tahiti town", "Faa'a French Polynesia city", "Faaa Tahiti waterfront"],
    "yaren-district-map-poster": ["Yaren Nauru government buildings", "Yaren Nauru town center", "Nauru parliament Yaren"],
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
    `${city.city} ${city.country} skyline`,
    `${city.city} ${city.country} city panorama`,
    `${city.city} ${city.country} landmark`,
    `${city.city} ${city.country}`,
    ...(extraSearch[city.slug] ?? []),
    ...(city.photoSearchAliases ?? []).map((alias) => `${alias} ${city.country} city`),
  ];
  const candidates = new Map();
  const normalize = (value = "") => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
  const cityName = normalize(city.city);
  const cityAliases = [
    ...(city.slug === "nukualofa-map-poster" ? ["nuku alofa"] : []),
    ...(city.slug === "basrah-iq-map-poster" ? ["basra"] : []),
    ...(city.slug === "odesa-map-poster" ? ["odessa"] : []),
    ...(city.slug === "al-muharraq-map-poster" ? ["muharraq"] : []),
    ...(city.slug === "ar-rayyan-map-poster" ? ["al rayyan", "rayyan"] : []),
    ...(city.slug === "madinah-sa-map-poster" ? ["medina"] : []),
    ...(city.slug === "new-territories-map-poster" ? ["tai po", "sha tin"] : []),
    ...(city.slug === "faaa-map-poster" ? ["faa'a"] : []),
    ...(city.slug === "homyel-map-poster" ? ["gomel"] : []),
    ...(city.slug === "yaren-district-map-poster" ? ["yaren"] : []),
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
      const clearlyUrban = /skyline|cityscape|panorama|aerial|city center|city centre|downtown|harbou?r|waterfront|bay view|old town|historic center|historic centre|architecture|street|city view|city panorama|town|village|market|square|building|urban|\bcbd\b|corniche|riverfront|promenade|boulevard|plaza|fountain|monument|cathedral|mosque|church|temple|landmark|roundabout/.test(`${title} ${description}`);
      if (!cityInTitle && !includesLandmark) continue;
      if (!clearlyUrban && !includesLandmark) continue;
      let score = cityInTitle ? 20 : cityInDescription && clearlyUrban ? 8 : 0;
      if (includesLandmark) score += 24;
      if (title.includes(countryName) || description.includes(countryName)) score += 3;
      if (clearlyUrban) score += 4;
      if (info.width >= info.height) score += 2;
      const current = candidates.get(candidate.sourcePage);
      if (!current || current.score < score) candidates.set(candidate.sourcePage, { ...candidate, score });
    }
    if ([...candidates.values()].some((candidate) => candidate.score >= 24)) break;
  }
  if (!candidates.size && city.lat != null && city.lon != null) {
    const params = new URLSearchParams({
      action: "query", format: "json", origin: "*", generator: "geosearch",
      ggscoord: `${city.lat}|${city.lon}`, ggsradius: "10000", ggslimit: "30", ggsnamespace: "6",
      prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "900",
    });
    const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const page of Object.values(data?.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const candidate = licensedPhoto(info, page);
      if (!candidate || Math.max(info.width, info.height) < 500 || Math.min(info.width, info.height) < 200 || Math.min(info.width, info.height) / Math.max(info.width, info.height) < 0.2) continue;
      const title = normalize(page.title.replace(/^File:/i, ""));
      const description = normalize(cleanText(info.extmetadata?.ImageDescription?.value ?? ""));
      if (!/skyline|cityscape|panorama|aerial|city center|city centre|downtown|harbou?r|waterfront|old town|architecture|street|town|village|market|square|building|urban|corniche|riverfront|promenade|boulevard|plaza|fountain|monument|cathedral|mosque|church|temple|landmark|roundabout/.test(`${title} ${description}`)) continue;
      const score = 16 + (title.includes(cityName) ? 8 : 0) + (description.includes(countryName) ? 3 : 0);
      candidates.set(candidate.sourcePage, { ...candidate, score });
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
  const filename = assetFilenameFor(city.slug);
  const destination = path.join(stagingDir, `${city.slug}.webp`);
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
const manifest = Object.fromEntries(cities.flatMap((city, index) => {
  const result = results[index];
  const photo = result?.error ? existingPhotos[city.slug] : result;
  return photo ? [[city.slug, photo]] : [];
}));
for (const slug of refreshSlugs) {
  try {
    await rename(path.join(stagingDir, `${slug}.webp`), path.join(outputDir, assetFilenameFor(slug)));
    await rm(path.join(stagingDir, `${slug}.json`), { force: true });
  } catch { /* Keep the existing asset when no replacement passed validation. */ }
}
await rm(stagingDir, { recursive: true, force: true });
await writeFile(path.join(root, "src/data/cityPhotos.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(root, "src/data/cityPhotoReviewBlanks.json"), "[]\n");
const usedAssets = new Set(Object.values(manifest).map((photo) => path.basename(photo.src)));
for (const file of await readdir(outputDir)) {
  if (file.endsWith(".webp") && !usedAssets.has(file)) await rm(path.join(outputDir, file));
}
console.log(JSON.stringify({ processed: cities.length, successful: Object.keys(manifest).length, replacements: refreshSlugs.size - failures.length, failures, replacedReviewBlanks: reviewBlanks.length }, null, 2));
