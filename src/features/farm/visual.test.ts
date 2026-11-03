import { describe, expect, it } from "vitest";

import { AGRO_001 } from "@/data/agro-001";
import { applyDecision, createCampaign } from "@/engine/campaign";

import { fieldVisual, stepProgress, type ActiveCue } from "./visual";

describe("lo que muestra la finca", () => {
  it("al empezar: rastrojo, sin bolsas, sin plagas", () => {
    const visual = fieldVisual(createCampaign(AGRO_001, 0), 0);
    expect(visual).toMatchObject({ ground: "residue", bags: 0, pest: "none", storage: "none" });
  });

  it("refleja la labranza y las bolsas compradas", () => {
    let state = createCampaign(AGRO_001, 0);
    for (const key of ["b", "c", "a"] as const) state = applyDecision(AGRO_001, state, key).state;
    const visual = fieldVisual(state, 0);
    expect(visual.ground).toBe("plowed");
    expect(visual.bags).toBe(200);
    expect(visual.stress).toBeGreaterThan(0);
  });

  it("el avance del paso en curso va de 0 a 1 con su animación", () => {
    const visual = fieldVisual(createCampaign(AGRO_001, 0), 0);
    const cue: ActiveCue = {
      id: "sow",
      decision: "q07",
      key: "b",
      quality: "best",
      startedAt: 1000,
      duration: 4000,
    };
    expect(stepProgress(visual, cue, "q07", 3000)).toBe(0.5);
    expect(stepProgress(visual, null, "q07", 3000)).toBe(0);
  });
});
