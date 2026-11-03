/**
 * Fenología simplificada de la soya para dibujar el lote: qué fase se ve según el día de campaña.
 * Los días son referenciales (ciclo de unos 110 días tras la siembra), no un modelo del cultivo.
 */

export type CropPhase =
  "bare" | "emergence" | "vegetative" | "flowering" | "pods" | "filling" | "maturity" | "dry";

export interface CropLook {
  phase: CropPhase;
  /** Altura relativa de la planta, de 0 (sin plantas) a 1 (máximo desarrollo). */
  height: number;
  /** Cuánto amarillea: 0 verde, 1 amarillo, 2 seco (marrón). */
  ripeness: number;
  /** Flores visibles (0–1). */
  bloom: number;
}

/** Límites de cada fase, en días de campaña (inicio incluido). */
export const PHASE_STARTS: readonly { phase: CropPhase; day: number }[] = [
  { phase: "bare", day: 0 },
  { phase: "emergence", day: 13 },
  { phase: "vegetative", day: 20 },
  { phase: "flowering", day: 48 },
  { phase: "pods", day: 62 },
  { phase: "filling", day: 80 },
  { phase: "maturity", day: 100 },
  { phase: "dry", day: 108 },
];

function smooth(from: number, to: number, value: number): number {
  const k = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return k * k * (3 - 2 * k);
}

export function phaseAt(day: number): CropPhase {
  let current: CropPhase = "bare";
  for (const start of PHASE_STARTS) if (day >= start.day) current = start.phase;
  return current;
}

/** Aspecto del lote en un día (admite días con decimales, para animar el paso del tiempo). */
export function cropLook(day: number): CropLook {
  const phase = phaseAt(day);
  if (phase === "bare") return { phase, height: 0, ripeness: 0, bloom: 0 };
  const height = 0.12 + 0.88 * smooth(13, 75, day);
  const ripeness = smooth(98, 106, day) + smooth(106, 112, day);
  const bloom = smooth(48, 54, day) * (1 - smooth(60, 68, day));
  return { phase, height, ripeness, bloom };
}
