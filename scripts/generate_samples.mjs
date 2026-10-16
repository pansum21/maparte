import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/supri/.gemini/antigravity/brain/19982f29-f192-4491-bd83-e895589765cd';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function createMapSvg({ isFree }) {
  const width = 800;
  const height = 1100;
  const cx = width / 2;
  const cy = 460;
  const mapR = 340;

  // Generate stylized decorative road grid inside a circle
  let roadPaths = '';
  // Concentric rings
  for (let r = 40; r <= mapR; r += 45) {
    roadPaths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e0be84" stroke-width="${r % 90 === 0 ? '2.5' : '1.2'}" stroke-opacity="${r % 90 === 0 ? '0.6' : '0.35'}"/>`;
  }
  // Radial spoke avenues
  for (let angle = 0; angle < 360; angle += 18) {
    const rad = (angle * Math.PI) / 180;
    const x2 = cx + Math.cos(rad) * mapR;
    const y2 = cy + Math.sin(rad) * mapR;
    roadPaths += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#e0be84" stroke-width="${angle % 36 === 0 ? '2' : '1'}" stroke-opacity="${angle % 36 === 0 ? '0.55' : '0.3'}"/>`;
  }
  // Grid road patterns
  for (let i = -6; i <= 6; i++) {
    const offset = i * 45;
    roadPaths += `<line x1="${cx - mapR}" y1="${cy + offset}" x2="${cx + mapR}" y2="${cy + offset}" stroke="#d6c29b" stroke-width="1.2" stroke-opacity="0.25"/>`;
    roadPaths += `<line x1="${cx + offset}" y1="${cy - mapR}" x2="${cx + offset}" y2="${cy + mapR}" stroke="#d6c29b" stroke-width="1.2" stroke-opacity="0.25"/>`;
  }
  // Organic meandering river
  roadPaths += `
    <path d="M ${cx - 280} ${cy - 200} Q ${cx - 100} ${cy - 50} ${cx} ${cy + 40} T ${cx + 260} ${cy + 220}" 
          fill="none" stroke="#68a9ce" stroke-width="6" stroke-linecap="round" stroke-opacity="0.8"/>
    <path d="M ${cx - 180} ${cy + 250} Q ${cx - 50} ${cy + 100} ${cx} ${cy + 40}" 
          fill="none" stroke="#68a9ce" stroke-width="3" stroke-linecap="round" stroke-opacity="0.6"/>
  `;

  // Center Marker Pin
  const pin = `
    <circle cx="${cx}" cy="${cy}" r="7" fill="#f05454" />
    <circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="#f05454" stroke-width="2" stroke-opacity="0.6" />
  `;

  // Watermark section (only on Free)
  let watermark = '';
  if (isFree) {
    watermark = `
      <g transform="translate(${cx}, ${cy}) rotate(-26)">
        <!-- Dotted pattern background for watermark -->
        <text x="0" y="0" text-anchor="middle" dominant-baseline="central" 
              font-family="'Arial Black', Impact, sans-serif" font-size="125" font-weight="900" 
              fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,4" opacity="0.45">
          MAPARTE
        </text>
        <text x="0" y="0" text-anchor="middle" dominant-baseline="central" 
              font-family="'Arial Black', Impact, sans-serif" font-size="125" font-weight="900" 
              fill="#ffffff" opacity="0.20">
          MAPARTE
        </text>
        <text x="0" y="65" text-anchor="middle" dominant-baseline="central" 
              font-family="'Space Grotesk', system-ui, sans-serif" font-size="20" font-weight="700" 
              letter-spacing="6" fill="#f5c270" opacity="0.75">
          SAMPLE • FREE DOWNLOAD
        </text>
      </g>
    `;
  }

  // Quality Tag Badge (top corner)
  const qualityBadge = isFree
    ? `
      <rect x="35" y="35" width="230" height="38" rx="8" fill="#d9534f" fill-opacity="0.85"/>
      <text x="150" y="59" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" letter-spacing="1">
        FREE TIER • 96 DPI
      </text>
    `
    : `
      <rect x="35" y="35" width="270" height="38" rx="8" fill="#2e7d32" fill-opacity="0.85"/>
      <text x="170" y="59" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" letter-spacing="1">
        ⭐ PRO ULTRA-HD • 300 DPI
      </text>
    `;

  // Bottom Branding & Footer Credits
  const bottomBranding = isFree
    ? `
      <!-- Prominent free branding -->
      <g transform="translate(60, 1045)">
        <circle cx="10" cy="-6" r="6" fill="#e0be84" opacity="0.9"/>
        <text x="24" y="-2" font-family="'Space Grotesk', system-ui, sans-serif" font-size="14" font-weight="700" fill="#e0be84" letter-spacing="1.5">
          MAPARTE • maparte.app
        </text>
        <text x="24" y="16" font-family="monospace" font-size="10" fill="#a0b5c4" opacity="0.7">
          Free digital download version
        </text>
      </g>
      <text x="740" y="1055" text-anchor="end" font-family="monospace" font-size="11" fill="#a0b5c4" opacity="0.7">
        © OpenStreetMap contributors
      </text>
    `
    : `
      <!-- Elegant optional pro signature -->
      <text x="60" y="1055" font-family="'Space Grotesk', system-ui, sans-serif" font-size="12" fill="#e0be84" opacity="0.65" letter-spacing="2">
        MAPARTE PREMIUM
      </text>
      <text x="740" y="1055" text-anchor="end" font-family="monospace" font-size="11" fill="#a0b5c4" opacity="0.55">
        © OpenStreetMap contributors
      </text>
    `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <!-- Dark aesthetic poster gradient -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0b1723"/>
          <stop offset="100%" stop-color="#050b11"/>
        </linearGradient>

        <clipPath id="circleMapClip">
          <circle cx="${cx}" cy="${cy}" r="${mapR}"/>
        </clipPath>
        
        <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.55"/>
        </filter>
      </defs>

      <!-- Poster Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
      <rect x="25" y="25" width="${width - 50}" height="${height - 50}" fill="none" stroke="#253a4c" stroke-width="1.5"/>

      <!-- Map Circle Frame with Shadow -->
      <g filter="url(#mapShadow)">
        <circle cx="${cx}" cy="${cy}" r="${mapR + 6}" fill="none" stroke="#e0be84" stroke-width="2.5" opacity="0.9"/>
        <circle cx="${cx}" cy="${cy}" r="${mapR}" fill="#0d1f30"/>
        
        <!-- Clipped Road & Water Network -->
        <g clip-path="url(#circleMapClip)">
          ${roadPaths}
          ${pin}
          ${watermark}
        </g>
      </g>

      <!-- Typography Header / City Info -->
      <g transform="translate(${cx}, 880)">
        <text text-anchor="middle" y="0" font-family="'Space Grotesk', 'Montserrat', sans-serif" font-size="52" font-weight="800" fill="#f5f7fa" letter-spacing="12">
          DEHRADUN
        </text>
        <line x1="-120" y1="24" x2="120" y2="24" stroke="#e0be84" stroke-width="2" opacity="0.8"/>
        <text text-anchor="middle" y="55" font-family="'Space Grotesk', sans-serif" font-size="20" font-weight="600" fill="#d2b078" letter-spacing="8">
          INDIA
        </text>
        <text text-anchor="middle" y="90" font-family="'IBM Plex Mono', monospace" font-size="13" font-weight="400" fill="#90a7b8" letter-spacing="3">
          30° 18' 59" N  /  78° 01' 55" E
        </text>
      </g>

      <!-- Quality Badge & Footer Branding -->
      ${qualityBadge}
      ${bottomBranding}
    </svg>
  `;
}

async function render() {
  const freeSvg = createMapSvg({ isFree: true });
  const paidSvg = createMapSvg({ isFree: false });

  await sharp(Buffer.from(freeSvg))
    .png()
    .toFile(path.join(outDir, 'free_sample.png'));

  await sharp(Buffer.from(paidSvg))
    .png()
    .toFile(path.join(outDir, 'paid_sample.png'));

  console.log('Sample posters generated successfully!');
}

render().catch(console.error);
