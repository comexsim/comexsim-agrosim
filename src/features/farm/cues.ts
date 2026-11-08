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
