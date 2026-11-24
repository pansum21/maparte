import type { Layout } from "../domain/types";
import { formatLayoutDimensions } from "../infrastructure/layoutRepository";

function createFallbackRatioSymbol(width: number, height: number): string {
  const w = Number(width) > 0 ? Number(width) : 20;
  const h = Number(height) > 0 ? Number(height) : 30;
  const isPortrait = h > w;
  const ratio = Math.max(0.15, Math.min(6, w / h));

  if (isPortrait) {
    const maxInnerWidth = 30;
    const maxInnerHeight = 44;
    let innerHeight = maxInnerHeight;
    let innerWidth = innerHeight * ratio;
    if (innerWidth > maxInnerWidth) {
      innerWidth = maxInnerWidth;
      innerHeight = innerWidth / ratio;
    }
    const x = Number(((40 - innerWidth) / 2).toFixed(2));
    const y = Number(((56 - innerHeight) / 2).toFixed(2));
    const roundedWidth = Number(innerWidth.toFixed(2));
    const roundedHeight = Number(innerHeight.toFixed(2));
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 56'><rect x='2' y='2' width='36' height='52' rx='4' fill='none' stroke='#9CC3DA' stroke-width='1.5'/><rect x='${x}' y='${y}' width='${roundedWidth}' height='${roundedHeight}' rx='2.5' fill='#4B91B7' fill-opacity='0.45' stroke='#9CC3DA' stroke-width='0.9'/></svg>`;
  } else {
    const maxInnerWidth = 44;
    const maxInnerHeight = 30;
    let innerWidth = maxInnerWidth;
    let innerHeight = innerWidth / ratio;
    if (innerHeight > maxInnerHeight) {
      innerHeight = maxInnerHeight;
      innerWidth = innerHeight * ratio;
    }
    const x = Number(((56 - innerWidth) / 2).toFixed(2));
    const y = Number(((40 - innerHeight) / 2).toFixed(2));
    const roundedWidth = Number(innerWidth.toFixed(2));
    const roundedHeight = Number(innerHeight.toFixed(2));
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 40'><rect x='2' y='2' width='52' height='36' rx='4' fill='none' stroke='#9CC3DA' stroke-width='1.5'/><rect x='${x}' y='${y}' width='${roundedWidth}' height='${roundedHeight}' rx='2.5' fill='#4B91B7' fill-opacity='0.45' stroke='#9CC3DA' stroke-width='0.9'/></svg>`;
  }
}

function getLayoutSymbolDataUri(layoutOption: Layout): string {
  let symbol = String(layoutOption?.symbol ?? "").trim();
  if (!symbol && layoutOption) {
    symbol = createFallbackRatioSymbol(layoutOption.width, layoutOption.height);
  }
  if (!symbol) return "";
  const normalizedSymbol = symbol.replace(
    /stroke-width=(['"])([\d.]+)\1/g,
    (_match, quote: string, value: string) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return `stroke-width=${quote}${value}${quote}`;
      }
      const thinner = Math.max(0.8, parsed * 0.5);
      return `stroke-width=${quote}${thinner}${quote}`;
    },
  );
  return `data:image/svg+xml;utf8,${encodeURIComponent(normalizedSymbol)}`;
}

function getLayoutCardLabel(layoutOption: Layout): string {
  const id = layoutOption.id.toLowerCase();
  const multi = id.match(/(?:double|triple)_(square|circle|heart)/);
  if (multi) {
    const count = id.includes("triple") ? "Triple" : "Double";
    const orientation = id.endsWith("_portrait") ? "P" : "L";
    return `${count} ${multi[1][0].toUpperCase()}${multi[1].slice(1)} ${orientation}`;
  }
  // Print sizes: A0 to A5, US formats, Posters
  if (id.includes("_a0_")) return "A0";
  if (id.includes("_a1_")) return "A1";
  if (id.includes("_a2_")) return "A2";
  if (id.includes("_a3_")) return "A3";
  if (id.includes("_a4_")) return "A4";
  if (id.includes("_a5_")) return "A5";
  if (id.includes("letter")) return "Letter";
  if (id.includes("legal")) return "Legal";
  if (id.includes("tabloid")) return "Tabloid";
  if (id.includes("12x18") || id.includes("18x12")) return "12×18";
  if (id.includes("18x24") || id.includes("24x18")) return "18×24";
  if (id.includes("24x36")) return "24×36";
  if (id.includes("50x70") || id.includes("70x50")) return "50×70";
  if (id.includes("70x100")) return "70×100";

  // Frame layouts
  if (id === "print_maparte_square_caption_a4_portrait") return "Top Square";
  if (id === "print_maparte_square_caption_a4_top") return "Bottom Square";
  if (id === "print_maparte_square_caption_a4_landscape") return "Square Right";
  if (id === "print_maparte_square_caption_a4_landscape_left") return "Square Left";
  if (id === "print_maparte_corner_caption_a4_portrait") return "Corner Top";
  if (id === "print_maparte_corner_caption_a4_bottom") return "Corner Bottom";

  if (id === "print_maparte_circle_caption_a4_portrait") return "GTA 6";
  if (id === "print_maparte_circle_caption_a4_top") return "GTA 6 Top";
  if (id === "print_maparte_circle_poster_a4_portrait") return "Compass";
  if (id === "print_maparte_circle_poster_a4_top") return "Compass Top";

  if (id === "print_maparte_circle_caption_a4_landscape") return "GTA 6 Right";
  if (id === "print_maparte_circle_caption_a4_landscape_left") return "GTA 6 Left";
  if (id === "print_maparte_circle_poster_a4_landscape") return "Compass Right";
  if (id === "print_maparte_circle_poster_a4_landscape_left") return "Compass Left";

  // Other categories: clean short name
  const name = layoutOption.name || "";
  const match = name.match(/A[0-5]|Letter|Legal|Tabloid|\d+[\s×x]+\d+/i);
  if (match) return match[0].replace(/\s+/g, "");
  const short = name.replace(/·.*$/, "").replace(/\(.*?\)/g, "").trim();
  return short || name;
}

interface LayoutCardProps {
  layoutOption: Layout | null;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function LayoutCard({
  layoutOption,
  onClick,
  isSelected = false,
}: LayoutCardProps) {
  if (!layoutOption) {
    return null;
  }
  const className = ["layout-card", isSelected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");
  const symbolDataUri = getLayoutSymbolDataUri(layoutOption);
  const sizeText = formatLayoutDimensions(layoutOption);
  const label = getLayoutCardLabel(layoutOption);

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isSelected}
      title={`${layoutOption.name} (${sizeText})`}
      aria-label={`${layoutOption.name} (${sizeText})`}
    >
      <div className="layout-card-symbol-wrap">
        {symbolDataUri ? (
          <img
            className="layout-card-symbol"
            src={symbolDataUri}
            alt={`${layoutOption.name} ratio symbol`}
          />
        ) : null}
      </div>
      <span className="layout-card-label" title={label}>
        {label}
      </span>
    </button>
  );
}
