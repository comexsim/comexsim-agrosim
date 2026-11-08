import type { CueId } from "@/engine/types";

/** Duración de la animación de cada paso (ms). */
export const CUE_DURATION: Partial<Record<CueId, number>> = {
  // Lo bastante lento para apreciar la máquina con la cámara cerca (observación O1).
  sampling: 9000,
  fertilize: 14000,
  till: 13000,
  notill: 13000,
  sow: 15000,
  "spray-weeds": 12000,
  "spray-all": 12000,
  "spray-spot": 10000,
  drone: 12000,
  harvest: 16000,
  trucks: 12000,
  dryer: 6000,
  sale: 10000,
  "seed-load": 6000,
  "yield-check": 6000,
  "harvest-ready": 6000,
};
export const DEFAULT_CUE_DURATION = 4500;

/** Pasos en los que trabaja una máquina o una persona: la cámara se acerca y la sigue. */
export const FOLLOW_CUES: ReadonlySet<CueId> = new Set<CueId>([
  "sampling",
  "fertilize",
  "till",
  "notill",
  "sow",
  "spray-weeds",
  "spray-all",
  "spray-spot",
  "drone",
  "harvest",
  "trucks",
  "sale",
]);

/**
 * Velocidad de las animaciones (observación de la reunión del 8 de noviembre). En «normal» la
 * máquina trabaja a un paso creíble con la cámara al lado y, cuando ya se entendió el trabajo,
 * el resto del lote avanza en tiempo acelerado y a la vista de todo el lote. «Rápida» es el
 * recorrido continuo y corto, para quien ya conoce la misión.
 */
export type Speed = "normal" | "fast";
export const SPEEDS: readonly Speed[] = ["normal", "fast"];

/** Tramo de una animación: dura `ms` y lleva el avance hasta `to`; `fast` es tiempo acelerado. */
export interface Segment {
  ms: number;
  to: number;
  fast?: boolean;
}

/** En «rápida», cada paso dura esta fracción de su duración de referencia. */
export const FAST_FACTOR = 0.6;

/**
 * Una pasada de maquinaria: el tramo en vivo cubre `liveTo` del recorrido en zigzag (unos 18 m
 * de maqueta por segundo, dos largos de la máquina) y el tramo acelerado completa el lote.
 */
function workPass(liveMs: number, liveTo: number, fastMs: number): readonly Segment[] {
  return [
    { ms: liveMs, to: liveTo },
    { ms: fastMs, to: 1, fast: true },
  ];
}

/** Tramos de la velocidad normal; los pasos que no figuran usan su duración de referencia. */
export const NORMAL_SEGMENTS: Partial<Record<CueId, readonly Segment[]>> = {
  // El técnico camina (unos 7 m de maqueta por segundo) y luego se acelera el resto del muestreo.
  sampling: workPass(7000, 0.12, 3000),
  scout: workPass(6000, 0.28, 2000),
  // Llega el camión de insumos por el camino y luego trabaja la fertilizadora.
  fertilize: [
    { ms: 7000, to: 0.35 },
    { ms: 8000, to: 0.4 },
    { ms: 4000, to: 1, fast: true },
  ],
  "seed-delivery": [{ ms: 9000, to: 1 }],
  till: workPass(8000, 0.08, 4000),
  notill: workPass(8000, 0.08, 4000),
  sow: workPass(8000, 0.08, 4000),
  "spray-weeds": workPass(8000, 0.08, 4000),
  "spray-all": workPass(8000, 0.08, 4000),
  // Primero monitorea el técnico (hasta 0,4) y después la pulverizadora entra al foco.
  "spray-spot": [
    { ms: 6000, to: 0.12 },
    { ms: 2000, to: 0.4, fast: true },
    { ms: 6000, to: 0.6 },
    { ms: 2000, to: 1, fast: true },
  ],
  drone: workPass(8000, 0.1, 4000),
  harvest: workPass(10000, 0.08, 5000),
};

/** Tramos de un paso según la velocidad elegida. */
export function cueSegments(id: CueId, speed: Speed): Segment[] {
  const normal = NORMAL_SEGMENTS[id];
  if (speed === "normal" && normal) return normal.map((segment) => ({ ...segment }));
  const ms = CUE_DURATION[id] ?? DEFAULT_CUE_DURATION;
  return [{ ms: speed === "fast" ? Math.round(ms * FAST_FACTOR) : ms, to: 1 }];
}

/** Duración total de unos tramos. */
export function segmentsDuration(segments: readonly Segment[]): number {
  return segments.reduce((total, segment) => total + segment.ms, 0);
}
