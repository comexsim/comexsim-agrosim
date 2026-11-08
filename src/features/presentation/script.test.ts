import { describe, expect, it } from "vitest";

import { AGRO_001 } from "@/data/agro-001";
import { PRESENTATION_SEED } from "@/data/presentation";
import { applyDecision, createCampaign, isFinished } from "@/engine/campaign";
import { buildReport } from "@/engine/report";
import type { OptionKey } from "@/engine/types";

import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { captionKey, nextScriptStep } from "./script";

/** Recorre el guion completo como lo hace el director. */
function run() {
  let campaign = createCampaign(AGRO_001, PRESENTATION_SEED);
  let selected: OptionKey | null = null;
  const seen = new Set<string>();
  while (!isFinished(AGRO_001, campaign)) {
    seen.add(captionKey(AGRO_001, { phase: "decide", campaign }));
    const pick = nextScriptStep(AGRO_001, { phase: "decide", campaign, selected, hadEvent: false });
    if (pick?.action.type !== "select") throw new Error("se esperaba marcar una opción");
    selected = pick.action.key;
    const confirm = nextScriptStep(AGRO_001, {
      phase: "decide",
      campaign,
      selected,
      hadEvent: false,
    });
    expect(confirm?.action.type).toBe("confirm");
    campaign = applyDecision(AGRO_001, campaign, selected).state;
    selected = null;
  }
  return { campaign, seen };
}

describe("guion del Modo Presentación", () => {
  it("recorre las 18 decisiones y deja un resultado rentable, con un solo error a la vista", () => {
    const { campaign, seen } = run();
    const report = buildReport(AGRO_001, campaign);
    expect(seen.size).toBe(18);
    expect(report.mistakes.map((mistake) => mistake.decision)).toEqual(["q08"]);
    // El error que se muestra es ignorar las malezas, como dice la narración.
    expect(campaign.answers.q08?.key).toBe("a");
    expect(Number(report.profit)).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThanOrEqual(85);
  });

  it("empieza en el briefing y no hace nada mientras corre la animación ni al final", () => {
    const campaign = createCampaign(AGRO_001, PRESENTATION_SEED);
    const base = { campaign, selected: null, hadEvent: false };
    expect(nextScriptStep(AGRO_001, { ...base, phase: "briefing" })?.action.type).toBe("begin");
    expect(nextScriptStep(AGRO_001, { ...base, phase: "play" })).toBeNull();
    expect(nextScriptStep(AGRO_001, { ...base, phase: "result" })).toBeNull();
  });

  it("deja más tiempo para leer cuando hubo un evento", () => {
    const campaign = createCampaign(AGRO_001, PRESENTATION_SEED);
    const base = { campaign, selected: null, phase: "feedback" as const };
    const plain = nextScriptStep(AGRO_001, { ...base, hadEvent: false })?.wait ?? 0;
    const event = nextScriptStep(AGRO_001, { ...base, hadEvent: true })?.wait ?? 0;
    expect(event).toBeGreaterThan(plain);
  });

  it("tiene narración para cada momento en ambos idiomas", () => {
    const { seen } = run();
    for (const tree of [es, en]) {
      const captions = tree.presentation.captions as Record<string, string>;
      for (const key of [...seen, "briefing", "result"]) expect(captions[key], key).toBeTruthy();
    }
  });
});
