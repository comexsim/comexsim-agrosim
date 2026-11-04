import { AGRO_001 } from "@/data/agro-001";
import { applyDecision, createCampaign, currentDecision, optionsFor } from "@/engine/campaign";

import type { SceneSource } from "./clock";
import { fieldVisual } from "./visual";

/**
 * Finca de vitrina para la portada: la campaña con la siembra recomendada, quieta con el
 * cultivo desarrollado (antes de la floración y de las plagas). Sin animaciones de decisión.
 */
export function showcaseSource(day = 47): SceneSource {
  let state = createCampaign(AGRO_001, 0);
  while (currentDecision(AGRO_001, state)?.id !== "q08") {
    const decision = currentDecision(AGRO_001, state);
    if (!decision) break;
    const best = optionsFor(AGRO_001, state, decision).find((option) => option.quality === "best");
    state = applyDecision(AGRO_001, state, best?.key ?? "b").state;
  }
  const visual = { ...fieldVisual(state, 0), weeds: 0 };
  return { now: () => performance.now(), day: () => day, visual, cue: null };
}
