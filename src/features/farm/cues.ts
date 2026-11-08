import type { CueId } from "@/engine/types";

/** Duración de la animación de cada paso (ms). */
export const CUE_DURATION: Partial<Record<CueId, number>> = {
  sampling: 6000,
  fertilize: 7000,
  till: 6500,
  notill: 6000,
  sow: 8000,
  "spray-weeds": 6500,
  "spray-all": 6500,
  "spray-spot": 5000,
  drone: 7000,
  harvest: 8500,
  trucks: 7500,
  dryer: 5500,
  sale: 6500,
  "seed-load": 6000,
  "yield-check": 6000,
  "harvest-ready": 6000,
};
export const DEFAULT_CUE_DURATION = 4500;
