export interface BackdropPreset {
  id: string;
  name: string;
  mode: "dark" | "light";
  background: string;
  previewGradient: string;
  description: string;
}

export interface CustomGradientConfig {
  color1: string;
  color2: string;
  angle: number;
}

export interface BackdropThemeState {
  type: "preset" | "custom";
  presetId: string;
  custom: CustomGradientConfig;
}

export const BACKDROP_PRESETS: BackdropPreset[] = [
  {
    id: "classic_dark",
    name: "Classic Dark Aurora",
    mode: "dark",
    background: "default",
    previewGradient: "linear-gradient(135deg, #070e17 0%, #0c1a28 50%, #0e243a 100%)",
    description: "Original liquid watermorphic glass with ambient aurora caustics",
  },
  {
    id: "studio_light",
    name: "Gallery Studio Light",
    mode: "light",
    background: "linear-gradient(145deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)",
    previewGradient: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)",
    description: "Crisp museum gallery daylight with architectural shadows",
  },
  {
    id: "warm_parchment",
    name: "Warm Parchment",
    mode: "light",
    background: "linear-gradient(135deg, #fdfbf7 0%, #f4ede4 50%, #eae0d0 100%)",
    previewGradient: "linear-gradient(135deg, #fdfbf7 0%, #eae0d0 100%)",
    description: "Vintage archival bookpaper tone with warm earthy undertones",
  },
  {
    id: "velvet_noir",
    name: "Velvet Noir",
    mode: "dark",
    background: "linear-gradient(180deg, #09090b 0%, #000000 100%)",
    previewGradient: "linear-gradient(180deg, #18181b 0%, #000000 100%)",
    description: "Deep, pure OLED contrast with deep black framing",
  },
  {
    id: "nordic_slate",
    name: "Nordic Slate",
    mode: "dark",
    background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
    previewGradient: "linear-gradient(145deg, #334155 0%, #0f172a 100%)",
    description: "Clean modern Scandinavian charcoal with cool blue undertones",
  },
  {
    id: "oceanic_abyss",
    name: "Oceanic Abyss",
    mode: "dark",
    background: "linear-gradient(145deg, #032b43 0%, #081d2c 50%, #020b12 100%)",
    previewGradient: "linear-gradient(145deg, #0284c7 0%, #032b43 50%, #010c14 100%)",
    description: "Deep marine cyan and midnight navy oceanic glow",
  },
  {
    id: "sunset_ember",
    name: "Sunset Ember",
    mode: "dark",
    background: "linear-gradient(145deg, #2e1065 0%, #4a044e 50%, #170221 100%)",
    previewGradient: "linear-gradient(145deg, #7c3aed 0%, #db2777 50%, #170221 100%)",
    description: "Atmospheric twilight with warm violet, rose, and amber",
  },
  {
    id: "alpine_emerald",
    name: "Alpine Emerald",
    mode: "dark",
    background: "linear-gradient(145deg, #064e3b 0%, #022c22 50%, #01140e 100%)",
    previewGradient: "linear-gradient(145deg, #059669 0%, #022c22 100%)",
    description: "Deep evergreen forest and jade mountain reflections",
  },
  {
    id: "minimal_white",
    name: "Pure Minimal White",
    mode: "light",
    background: "#ffffff",
    previewGradient: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    description: "Clean high-key white for ultra-minimalist workspaces",
  },
  {
    id: "cyberpunk_neon",
    name: "Cyberpunk Neon",
    mode: "dark",
    background: "linear-gradient(135deg, #0d0221 0%, #240046 50%, #030008 100%)",
    previewGradient: "linear-gradient(135deg, #7209b7 0%, #f72585 50%, #3a0ca3 100%)",
    description: "Electric synthwave radiance with purple and neon accents",
  },
];

export const DEFAULT_BACKDROP_STATE: BackdropThemeState = {
  type: "preset",
  presetId: "classic_dark",
  custom: {
    color1: "#0f172a",
    color2: "#1e1b4b",
    angle: 135,
  },
};

export const BACKDROP_STORAGE_KEY = "maparte_studio_backdrop_v1";
