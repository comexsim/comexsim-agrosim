import { create } from "zustand";

import { AGRO_001 } from "@/data/agro-001";
import { PRESENTATION_SEED } from "@/data/presentation";
import {
  applyDecision,
  createCampaign,
  currentDecision,
  isFinished,
  optionsFor,
  type Outcome,
} from "@/engine/campaign";
import { summarize, type AttemptSummary } from "@/engine/report";
import type { CampaignState, DecisionId, OptionKey, StationId } from "@/engine/types";
import { cueSegments, FOLLOW_CUES, segmentsDuration, type Speed } from "@/features/farm/cues";
import { cueProgress, elapsedFor, type ActiveCue } from "@/features/farm/visual";

import { loadAttempts, saveAttempts } from "./attempts";
import { loadSpeed, saveSpeed } from "./speed";

/**
 * Estado de la pantalla de la misión. El motor es puro; aquí se suman el reloj de la interfaz
 * (cuándo empieza cada animación) y el historial de intentos del navegador.
 */

export type Phase = "briefing" | "decide" | "play" | "feedback" | "result";

export interface Timeline {
  from: number;
  to: number;
  startedAt: number;
  duration: number;
}

export interface LastDecision extends Outcome {
  decision: DecisionId;
  key: OptionKey;
}

interface MissionStore {
  campaign: CampaignState;
  phase: Phase;
  selected: OptionKey | null;
  last: LastDecision | null;
  cue: ActiveCue | null;
  timeline: Timeline;
  /** Viajes planificados en q15 (los camiones que se dibujan). */
  trips: number;
  attempts: AttemptSummary[];
  /** Modo Presentación: el guion lleva la misión y no cuenta como intento. */
  presenting: boolean;
  paused: boolean;
  /** Velocidad de las animaciones: a paso real con tiempo acelerado, o corrida. */
  speed: Speed;
  hydrate: () => void;
  begin: (now: number) => void;
  select: (key: OptionKey) => void;
  confirm: (now: number) => void;
  reveal: () => void;
  /** Termina la animación en curso y muestra la consecuencia. */
  skip: (now: number) => void;
  next: (now: number) => void;
  restart: () => void;
  startPresentation: () => void;
  stopPresentation: () => void;
  togglePause: () => void;
  /** Cambia la velocidad; la animación en curso sigue desde donde iba. */
  setSpeed: (speed: Speed, now: number) => void;
}

const mission = AGRO_001;

/** Milisegundos por día de campaña al avanzar el tiempo entre decisiones. */
const MS_PER_DAY = 70;

function still(day: number): Timeline {
  return { from: day, to: day, startedAt: 0, duration: 1 };
}

function advance(from: number, to: number, now: number): Timeline {
  const duration = Math.min(Math.max((to - from) * MS_PER_DAY, 900), 3600);
  return { from, to, startedAt: now, duration };
}

export const useMission = create<MissionStore>((set, get) => ({
  campaign: createCampaign(mission, 0),
  phase: "briefing",
  selected: null,
  last: null,
  cue: null,
  timeline: still(0),
  trips: 0,
  attempts: [],
  presenting: false,
  paused: false,
  speed: "normal",

  hydrate: () => {
    const attempts = loadAttempts(mission.id);
    const speed = loadSpeed();
    if (get().presenting) set({ attempts, speed });
    else set({ attempts, speed, campaign: createCampaign(mission, attempts.length) });
  },

  begin: (now) => {
    const first = currentDecision(mission, get().campaign);
    set({ phase: "decide", timeline: advance(0, first?.day ?? 0, now) });
  },

  select: (key) => {
    if (get().phase === "decide") set({ selected: key });
  },

  confirm: (now) => {
    const { campaign, selected, phase } = get();
    const decision = currentDecision(mission, campaign);
    if (phase !== "decide" || !selected || !decision) return;
    const option = optionsFor(mission, campaign, decision).find((o) => o.key === selected);
    const { state, outcome } = applyDecision(mission, campaign, selected);
    const staticOption =
      decision.kind === "choice" || decision.kind === "calc"
        ? decision.options.find((o) => o.key === selected)
        : undefined;
    const cueId = staticOption?.cue ?? decision.cue;
    const { speed } = get();
    const segments = cueSegments(cueId, speed);
    const duration = segmentsDuration(segments);
    set({
      campaign: state,
      phase: "play",
      last: { ...outcome, decision: decision.id, key: selected },
      cue: {
        id: cueId,
        decision: decision.id,
        key: selected,
        quality: outcome.quality,
        startedAt: now,
        duration,
        segments,
        speed,
      },
      // Mientras se anima la decisión, el tiempo corre hasta el último evento que disparó.
      timeline: { from: decision.day, to: state.day, startedAt: now, duration },
      trips: decision.kind === "trips" ? Number(option?.value ?? 0) : get().trips,
    });
  },

  reveal: () => {
    if (get().phase === "play") set({ phase: "feedback" });
  },

  skip: (now) => {
    const { phase, cue, timeline } = get();
    if (phase !== "play" || !cue) return;
    set({
      phase: "feedback",
      cue: { ...cue, startedAt: now - cue.duration },
      timeline: { ...timeline, startedAt: now - timeline.duration },
    });
  },

  next: (now) => {
    const { campaign, attempts, phase, presenting } = get();
    if (phase !== "feedback") return;
    if (isFinished(mission, campaign)) {
      if (presenting) {
        set({ phase: "result", cue: null, selected: null });
        return;
      }
      const saved = [...attempts, summarize(mission, campaign)];
      saveAttempts(mission.id, saved);
      set({ phase: "result", attempts: saved, cue: null, selected: null });
      return;
    }
    const upcoming = currentDecision(mission, campaign);
    set({
      phase: "decide",
      selected: null,
      cue: null,
      timeline: advance(campaign.day, upcoming?.day ?? campaign.day, now),
    });
  },

  restart: () => {
    const { attempts } = get();
    set({
      campaign: createCampaign(mission, attempts.length),
      phase: "briefing",
      selected: null,
      last: null,
      cue: null,
      timeline: still(0),
      trips: 0,
    });
  },

  startPresentation: () => {
    set({
      campaign: createCampaign(mission, PRESENTATION_SEED),
      phase: "briefing",
      selected: null,
      last: null,
      cue: null,
      timeline: still(0),
      trips: 0,
      presenting: true,
      paused: false,
    });
  },

  stopPresentation: () => {
    if (!get().presenting) return;
    set({ presenting: false, paused: false });
    get().restart();
  },

  togglePause: () => set({ paused: !get().paused }),

  setSpeed: (speed, now) => {
    const { cue, phase, timeline } = get();
    saveSpeed(speed);
    if (phase !== "play" || !cue || cue.speed === speed) {
      set({ speed });
      return;
    }
    // Se rehace el reloj de la animación para que el avance siga igual en este instante.
    const segments = cueSegments(cue.id, speed);
    const duration = segmentsDuration(segments);
    const startedAt = now - elapsedFor(segments, cueProgress(cue, now));
    const share = Math.min(Math.max((now - timeline.startedAt) / timeline.duration, 0), 1);
    set({
      speed,
      cue: { ...cue, segments, speed, duration, startedAt },
      timeline: { ...timeline, duration, startedAt: now - share * duration },
    });
  },
}));

/** Día de campaña con decimales en el instante `now`, con aceleración suave. */
export function dayAt(timeline: Timeline, now: number): number {
  const t = Math.min(Math.max((now - timeline.startedAt) / timeline.duration, 0), 1);
  const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  return timeline.from + (timeline.to - timeline.from) * k;
}

/** Hacia dónde mira la cámara en cada fase. */
export function stationFor(
  phase: Phase,
  campaign: CampaignState,
  last: LastDecision | null,
  cue: ActiveCue | null = null,
  accelerated = false,
): StationId {
  if (phase === "briefing") return "farm";
  if (phase === "result") return "result";
  // La cámara acompaña a la máquina solo a paso real; en tiempo acelerado mira todo el lote.
  if (phase === "play" && cue && FOLLOW_CUES.has(cue.id) && cue.speed !== "fast" && !accelerated) {
    return "follow";
  }
  if ((phase === "play" || phase === "feedback") && last) {
    return mission.decisions.find((d) => d.id === last.decision)?.station ?? "farm";
  }
  const upcoming = currentDecision(mission, campaign);
  if (upcoming?.closeup) return "macro";
  return upcoming?.station ?? "farm";
}

export { mission as MISSION };
