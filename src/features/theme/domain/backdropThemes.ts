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
    name: "Classic Gallery Wall",
    mode: "dark",
    background: "default",
    previewGradient: "linear-gradient(135deg, #070e17 0%, #0c1a28 50%, #0e243a 100%)",
    description: "Deep ambient gallery charcoal wall with soft overhead lighting",
  },
  {
    id: "studio_light",
    name: "Daylight Studio Wall",
    mode: "light",
    background: "linear-gradient(145deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)",
    previewGradient: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)",
    description: "Crisp museum gallery daylight white with natural wall shadows",
  },
  {
    id: "warm_parchment",
    name: "Warm Linen & Parchment",
    mode: "light",
    background: "linear-gradient(135deg, #fdfbf7 0%, #f4ede4 50%, #eae0d0 100%)",
    previewGradient: "linear-gradient(135deg, #fdfbf7 0%, #eae0d0 100%)",
    description: "Cozy warm beige living room wall with earthy undertones",
  },
  {
    id: "velvet_noir",
    name: "Velvet Noir Accent Wall",
    mode: "dark",
    background: "linear-gradient(180deg, #09090b 0%, #000000 100%)",
    previewGradient: "linear-gradient(180deg, #18181b 0%, #000000 100%)",
    description: "Dramatic pure black accent wall for high-contrast framed art",
  },
  {
    id: "nordic_slate",
    name: "Nordic Slate Gray Wall",
    mode: "dark",
    background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
    previewGradient: "linear-gradient(145deg, #334155 0%, #0f172a 100%)",
    description: "Modern Scandinavian cool charcoal slate wall",
  },
  {
    id: "oceanic_abyss",
    name: "Oceanic Navy Wall",
    mode: "dark",
    background: "linear-gradient(145deg, #032b43 0%, #081d2c 50%, #020b12 100%)",
    previewGradient: "linear-gradient(145deg, #0284c7 0%, #032b43 50%, #010c14 100%)",
    description: "Deep coastal midnight navy feature wall with cyan undertones",
  },
  {
    id: "sunset_ember",
    name: "Warm Terracotta Wall",
    mode: "dark",
    background: "linear-gradient(145deg, #2e1065 0%, #4a044e 50%, #170221 100%)",
    previewGradient: "linear-gradient(145deg, #7c3aed 0%, #db2777 50%, #170221 100%)",
    description: "Atmospheric twilight terracotta and rose accent wall",
  },
  {
    id: "alpine_emerald",
    name: "Forest Emerald Wall",
    mode: "dark",
    background: "linear-gradient(145deg, #064e3b 0%, #022c22 50%, #01140e 100%)",
    previewGradient: "linear-gradient(145deg, #059669 0%, #022c22 100%)",
    description: "Rich evergreen forest and moody dark green living room wall",
  },
  {
    id: "minimal_white",
    name: "Pure Minimalist White",
    mode: "light",
    background: "#ffffff",
    previewGradient: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    description: "Ultra-clean high-key white gallery wall",
  },
  {
    id: "cyberpunk_neon",
    name: "Ambient Game Room Wall",
    mode: "dark",
    background: "linear-gradient(135deg, #0d0221 0%, #240046 50%, #030008 100%)",
    previewGradient: "linear-gradient(135deg, #7209b7 0%, #f72585 50%, #3a0ca3 100%)",
    description: "Modern ambient neon twilight wall for contemporary interiors",
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

export const BACKDROP_STORAGE_KEY = "maparte_studio_backdrop_v2";
