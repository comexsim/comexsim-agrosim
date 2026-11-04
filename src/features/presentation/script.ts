import { PRESENTATION_BEATS, PRESENTATION_PICKS } from "@/data/presentation";
import { currentDecision, optionsFor } from "@/engine/campaign";
import type { CampaignState, Mission, OptionKey, Quality } from "@/engine/types";

/**
 * Qué haría ahora el presentador. Puro: el director de la interfaz solo espera la pausa y
 * despacha la acción, y los tests recorren la misión entera.
 */
export type ScriptAction =
  { type: "begin" } | { type: "select"; key: OptionKey } | { type: "confirm" } | { type: "next" };

export interface ScriptStep {
  action: ScriptAction;
  wait: number;
}

export interface ScriptInput {
  phase: "briefing" | "decide" | "play" | "feedback" | "result";
  campaign: CampaignState;
  selected: OptionKey | null;
  /** Hubo un evento en la última decisión (se deja más tiempo para leerlo). */
  hadEvent: boolean;
}

export function nextScriptStep(mission: Mission, input: ScriptInput): ScriptStep | null {
  const { phase, campaign, selected, hadEvent } = input;
  if (phase === "briefing") return { action: { type: "begin" }, wait: PRESENTATION_BEATS.briefing };
  if (phase === "feedback") {
    const wait = PRESENTATION_BEATS.feedback + (hadEvent ? PRESENTATION_BEATS.event : 0);
    return { action: { type: "next" }, wait };
  }
  if (phase !== "decide") return null;
  if (selected) return { action: { type: "confirm" }, wait: PRESENTATION_BEATS.choose };
  const decision = currentDecision(mission, campaign);
  if (!decision) return null;
  const wanted: Quality = PRESENTATION_PICKS[decision.id] ?? "best";
  const options = optionsFor(mission, campaign, decision);
  const option = options.find((candidate) => candidate.quality === wanted) ?? options[0];
  if (!option) return null;
  return { action: { type: "select", key: option.key }, wait: PRESENTATION_BEATS.read };
}

/** Clave de la narración según el momento del recorrido. */
export function captionKey(
  mission: Mission,
  input: Pick<ScriptInput, "phase" | "campaign">,
): string {
  if (input.phase === "briefing") return "briefing";
  if (input.phase === "result") return "result";
  // Durante la animación y la consecuencia, la decisión en curso ya es la anterior.
  const index = input.phase === "decide" ? input.campaign.step : input.campaign.step - 1;
  return mission.decisions[index]?.id ?? "result";
}
