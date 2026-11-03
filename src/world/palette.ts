// Adaptado de la paleta del mundo 2.0 de @comexsim/ui (ADR-001 de este repo): mismos principios,
// colores de campo en lugar de puerto.

/**
 * Colores del mundo desde los tokens del tema activo: nada de hex en los componentes. Los objetos
 * tienen colores naturales e iguales en ambos temas; de noche cambian el cielo y la luz. El verde
 * de marca (`mine`) solo marca lo del estudiante (su maquinaria, su lote).
 */
export const WORLD_TOKENS = {
  sky: "--ag-world-sky",
  horizon: "--ag-world-horizon",
  light: "--ag-world-light",
  mine: "--ag-world-mine",
  alert: "--ag-world-alert",
  soil: "--ag-world-soil",
  soilWet: "--ag-world-soil-wet",
  soilPlowed: "--ag-world-soil-plowed",
  straw: "--ag-world-straw",
  grass: "--ag-world-grass",
  foliage: "--ag-world-foliage",
  foliage2: "--ag-world-foliage-2",
  trunk: "--ag-world-trunk",
  cropYoung: "--ag-world-crop-young",
  crop: "--ag-world-crop",
  cropDeep: "--ag-world-crop-deep",
  flower: "--ag-world-flower",
  cropYellow: "--ag-world-crop-yellow",
  cropDry: "--ag-world-crop-dry",
  weed: "--ag-world-weed",
  pest: "--ag-world-pest",
  water: "--ag-world-water",
  gravel: "--ag-world-gravel",
  asphalt: "--ag-world-asphalt",
  paint: "--ag-world-paint",
  wall: "--ag-world-wall",
  wall2: "--ag-world-wall-2",
  roof: "--ag-world-roof",
  roofMetal: "--ag-world-roof-metal",
  steel: "--ag-world-steel",
  glass: "--ag-world-glass",
  window: "--ag-world-window",
  dark: "--ag-world-dark",
  contractor: "--ag-world-contractor",
  truck: "--ag-world-truck",
  grain: "--ag-world-grain",
  skin: "--ag-world-skin",
  shirt: "--ag-world-shirt",
  fg: "--fg",
  bg: "--bg-raised",
} as const;

export type WorldColor = keyof typeof WORLD_TOKENS;

export type WorldPalette = Record<WorldColor, string> & {
  /** Escena de noche: ventanas y faroles encendidos. */
  night: boolean;
};

/** Valores del tema claro de `globals.css`: solo para pruebas y para un elemento sin estilos. */
export const WORLD_FALLBACK: Record<WorldColor, string> = {
  sky: "#cfe6f5",
  horizon: "#eef4f0",
  light: "#fff3df",
  mine: "#015941",
  alert: "#d29a2b",
  soil: "#9a7452",
  soilWet: "#6e5038",
  soilPlowed: "#7d5a3d",
  straw: "#d2bf8a",
  grass: "#a9c48d",
  foliage: "#4f9a5c",
  foliage2: "#7cb35b",
  trunk: "#7a5a3c",
  cropYoung: "#8fcf6a",
  crop: "#4fa04a",
  cropDeep: "#2f7d3a",
  flower: "#c9a6e0",
  cropYellow: "#d9c45a",
  cropDry: "#a8834f",
  weed: "#6b8f2a",
  pest: "#c0532f",
  water: "#4f95c4",
  gravel: "#cfc6b4",
  asphalt: "#5a6068",
  paint: "#f2efe6",
  wall: "#ece5d6",
  wall2: "#c9b79b",
  roof: "#b65a41",
  roofMetal: "#9aa9b5",
  steel: "#a3abb2",
  glass: "#6c9cbd",
  window: "#ffd98a",
  dark: "#2c3138",
  contractor: "#e0a72e",
  truck: "#c4463a",
  grain: "#e6c770",
  skin: "#e2b48c",
  shirt: "#2f6690",
  fg: "#1a2421",
  bg: "#ffffff",
};

/** Luminancia relativa aproximada de un color hex (0 = negro, 1 = blanco). */
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Arma la paleta con los colores ya leídos (sin DOM, para probarla). */
export function buildWorldPalette(colors: Record<WorldColor, string>): WorldPalette {
  return { ...colors, night: luminance(colors.sky) < 0.3 };
}

export function readWorldPalette(element: Element): WorldPalette {
  const style = getComputedStyle(element);
  const colors = Object.fromEntries(
    (Object.keys(WORLD_TOKENS) as WorldColor[]).map((key) => {
      const value = style.getPropertyValue(WORLD_TOKENS[key]).trim();
      return [key, value.startsWith("#") ? value : WORLD_FALLBACK[key]];
    }),
  ) as Record<WorldColor, string>;
  return buildWorldPalette(colors);
}
