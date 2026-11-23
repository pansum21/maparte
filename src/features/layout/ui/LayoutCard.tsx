import type { Layout } from "../domain/types";
import { formatLayoutDimensions } from "../infrastructure/layoutRepository";

function createFallbackRatioSymbol(width: number, height: number): string {
  const w = Number(width) > 0 ? Number(width) : 20;
  const h = Number(height) > 0 ? Number(height) : 30;
  const ratio = Math.max(0.15, Math.min(6, w / h));
  const maxInnerWidth = 50;
  const maxInnerHeight = 30;

  let innerWidth = maxInnerWidth;
  let innerHeight = innerWidth / ratio;

  if (innerHeight > maxInnerHeight) {
    innerHeight = maxInnerHeight;
    innerWidth = innerHeight * ratio;
  }

  const x = Number(((64 - innerWidth) / 2).toFixed(2));
  const y = Number(((40 - innerHeight) / 2).toFixed(2));
  const roundedWidth = Number(innerWidth.toFixed(2));
  const roundedHeight = Number(innerHeight.toFixed(2));

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 40'><rect x='2' y='2' width='60' height='36' rx='5' fill='none' stroke='#9CC3DA' stroke-width='1.2'/><rect x='${x}' y='${y}' width='${roundedWidth}' height='${roundedHeight}' rx='3' fill='#4B91B7' fill-opacity='0.45' stroke='#9CC3DA' stroke-width='0.9'/></svg>`;
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

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isSelected}
      title={`${layoutOption.name} (${sizeText})`}
      aria-label={`${layoutOption.name} (${sizeText})`}
    >
      {symbolDataUri ? (
        <img
          className="layout-card-symbol"
          src={symbolDataUri}
          alt={`${layoutOption.name} ratio symbol`}
        />
      ) : null}
    </button>
  );
}
