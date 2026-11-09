import { AGRO_001 } from "@/data/agro-001";
import type { CampaignState, CueId, DecisionId, OptionKey, Quality } from "@/engine/types";

import type { Segment, Speed } from "./cues";

/**
 * Lo que la finca tiene que mostrar según las decisiones tomadas: el puente entre el motor y la
 * escena. Puro; la escena solo lo dibuja.
 */

export interface ActiveCue {
  id: CueId;
  decision: DecisionId;
  key: OptionKey;
  quality: Quality;
  /** Marca de tiempo de inicio (ms, `performance.now()`), para animar cuadro a cuadro. */
  startedAt: number;
  duration: number;
  /** Tramos de la animación (velocidad normal); sin tramos, el avance es lineal. */
  segments?: readonly Segment[];
  speed?: Speed;
}

export interface FieldVisual {
  answered: DecisionId[];
  /** Cómo quedó el suelo con la preparación (q03). */
  ground: "residue" | "plowed" | "rough";
  /** Fracción del lote que alcanzó a sembrarse con la semilla comprada (q05). */
  sownShare: number;
  /** Malezas visibles (0–1) y si se controlaron (q08). */
  weeds: number;
  weedsControlled: boolean;
  /** Estrés del cultivo según el índice de condición (0 sano, 1 muy dañado). */
  stress: number;
  pest: "none" | "found" | "focal" | "blanket" | "damage";
  rust: "none" | "risk" | "controlled" | "blanket" | "damage";
  /** Pérdidas visibles detrás de la cosechadora (q14). */
  harvestLoss: "low" | "high";
  /** Bolsas de fertilizante en el galpón (q02). */
  bags: number;
  /** Viajes de camión planificados (q15). */
  trips: number;
  /** Cómo quedó el grano en el acopio (q16). */
  storage: "none" | "good" | "poor";
  rained: boolean;
  priceShift: "none" | "up" | "down";
  /** Kilos de semilla comprados (q05), para el contador de la tolva. */
  seedKg: number;
  /** Rendimiento estimado (t/ha), para la estimación de la producción (q13). */
  yieldTHa: number;
}

function key(state: CampaignState, id: DecisionId): OptionKey | null {
  return state.answers[id]?.key ?? null;
}

const BAGS: Record<OptionKey, number> = { a: 80, b: 160, c: 200 };

/** Kilos de la opción de semilla elegida, tomados de la misión (nada del dominio en la escena). */
function seedKgOf(state: CampaignState): number {
  const answer = state.answers.q05;
  const decision = AGRO_001.decisions.find((d) => d.id === "q05");
  if (!answer || !decision || (decision.kind !== "choice" && decision.kind !== "calc")) return 0;
  return decision.options.find((option) => option.key === answer.key)?.effects.seedKg ?? 0;
}

export function fieldVisual(state: CampaignState, trips: number, yieldTHa = 0): FieldVisual {
  const answered = Object.keys(state.answers) as DecisionId[];
  const prep = key(state, "q03");
  const weedsAnswer = key(state, "q08");
  const pestAnswer = key(state, "q10");
  const rustAnswer = key(state, "q11");
  const lossAnswer = key(state, "q14");
  const storageAnswer = key(state, "q16");
  const fertilizer = key(state, "q02");
  const priceLog = state.log.find((entry) => entry.key === "priceUp" || entry.key === "priceDown");

  return {
    answered,
    ground: prep === "a" ? "plowed" : prep === "c" ? "rough" : "residue",
    sownShare: state.sownShare,
    weeds: weedsAnswer === "a" ? 1 : prep === "c" ? 0.7 : 0.55,
    weedsControlled: weedsAnswer === "b" || weedsAnswer === "c",
    stress: Math.min(Math.max((100 - state.condition) / 60, 0), 1),
    pest:
      pestAnswer === null
        ? "none"
        : pestAnswer === "a"
          ? "blanket"
          : pestAnswer === "b"
            ? "focal"
            : "damage",
    rust:
      rustAnswer === null
        ? "none"
        : rustAnswer === "a"
          ? "blanket"
          : rustAnswer === "b"
            ? "controlled"
            : "damage",
    harvestLoss: lossAnswer === "a" || lossAnswer === "c" ? "high" : "low",
    bags: fertilizer ? BAGS[fertilizer] : 0,
    trips,
    storage: storageAnswer === null ? "none" : storageAnswer === "b" ? "good" : "poor",
    rained: state.events.includes("rain"),
    priceShift: priceLog ? (priceLog.key === "priceUp" ? "up" : "down") : "none",
    seedKg: seedKgOf(state),
    yieldTHa,
  };
}

/** Avance (0–1) del paso que dibuja una decisión: 0 antes de decidir, 1 cuando ya terminó. */
export function stepProgress(
  visual: FieldVisual,
  cue: ActiveCue | null,
  decision: DecisionId,
  now: number,
): number {
  if (cue?.decision === decision) return cueProgress(cue, now);
  return visual.answered.includes(decision) ? 1 : 0;
}

/** Avance (0–1) de una animación en el instante `now`, tramo por tramo. */
export function cueProgress(cue: ActiveCue, now: number): number {
  const elapsed = now - cue.startedAt;
  if (!cue.segments?.length) return Math.min(Math.max(elapsed / cue.duration, 0), 1);
  if (elapsed <= 0) return 0;
  let start = 0;
  let from = 0;
  for (const segment of cue.segments) {
    if (elapsed < start + segment.ms) {
      return from + (segment.to - from) * ((elapsed - start) / segment.ms);
    }
    start += segment.ms;
    from = segment.to;
  }
  return 1;
}

/** Si la animación está en un tramo de tiempo acelerado. */
export function cueAccelerated(cue: ActiveCue, now: number): boolean {
  const elapsed = now - cue.startedAt;
  let start = 0;
  for (const segment of cue.segments ?? []) {
    if (elapsed >= start && elapsed < start + segment.ms) return !!segment.fast;
    start += segment.ms;
  }
  return false;
}

/** Instantes (ms, como `now`) en que empieza cada tramo después del primero. */
export function cueBoundaries(cue: ActiveCue): number[] {
  const marks: number[] = [];
  let at = cue.startedAt;
  for (const segment of (cue.segments ?? []).slice(0, -1)) {
    at += segment.ms;
    marks.push(at);
  }
  return marks;
}

/** Milisegundos desde el inicio en que unos tramos alcanzan el avance `progress`. */
export function elapsedFor(segments: readonly Segment[], progress: number): number {
  let start = 0;
  let from = 0;
  for (const segment of segments) {
    if (progress <= segment.to) {
      const span = segment.to - from;
      return start + (span > 0 ? ((progress - from) / span) * segment.ms : 0);
    }
    start += segment.ms;
    from = segment.to;
  }
  return start;
}
