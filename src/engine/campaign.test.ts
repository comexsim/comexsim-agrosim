import { describe, expect, it } from "vitest";

import { AGRO_001 } from "@/data/agro-001";

import {
  shuffle,
  applyDecision,
  createCampaign,
  currentDecision,
  isFinished,
  metrics,
  optionsFor,
} from "./campaign";
import { buildReport, improvedDecisions, summarize } from "./report";
import type { CampaignState, OptionKey, Quality } from "./types";

const mission = AGRO_001;

/** Juega la campaña eligiendo, en cada decisión, la opción de la calidad pedida. */
function play(seed: number, pick: (quality: Quality[]) => number): CampaignState {
  let state = createCampaign(mission, seed);
  while (!isFinished(mission, state)) {
    const decision = currentDecision(mission, state);
    if (!decision) break;
    const options = optionsFor(mission, state, decision);
    const index = pick(options.map((option) => option.quality));
    state = applyDecision(mission, state, options[index]?.key as OptionKey).state;
  }
  return state;
}

const bestPath = (seed: number) => play(seed, (qualities) => qualities.indexOf("best"));
const worstPath = (seed: number) =>
  play(seed, (qualities) => {
    const poor = qualities.indexOf("poor");
    return poor >= 0 ? poor : qualities.indexOf("fair");
  });

describe("misión AGRO #001", () => {
  it("tiene 18 decisiones repartidas en las seis etapas y una sola mejor opción en las fijas", () => {
    expect(mission.decisions).toHaveLength(18);
    expect(new Set(mission.decisions.map((d) => d.stage)).size).toBe(6);
    for (const decision of mission.decisions) {
      if (decision.kind !== "choice" && decision.kind !== "calc") continue;
      expect(decision.options.filter((o) => o.quality === "best")).toHaveLength(1);
    }
  });

  it("las dimensiones suman 100 puntos y coinciden con los puntos de las decisiones", () => {
    const total = Object.values(mission.dimensions).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
    for (const stage of ["soil", "sowing", "crop", "harvest", "postharvest", "market"] as const) {
      const points = mission.decisions
        .filter((d) => d.stage === stage)
        .reduce((sum, d) => sum + d.points, 0);
      expect(points).toBe(mission.dimensions[stage]);
    }
  });
});

describe("campaña con todas las decisiones recomendadas", () => {
  const state = bestPath(0);
  const report = buildReport(mission, state);

  it("logra el rendimiento potencial en las 100 ha", () => {
    expect(report.sownHa).toBe(100);
    expect(report.yieldTHa).toBe(3);
    // 300 t brutas − 1 % de cosecha = 297 t; − 2 % de merma = 291,1 t comercializables.
    expect(report.commercialT).toBe(291.1);
  });

  it("cuadra el costo total del escenario base (USD 53.130)", () => {
    expect(report.costs).toBe("53130");
    expect(report.costPerHa).toBe("531");
  });

  it("vende a plazo con el precio del evento de mercado y obtiene 100 puntos", () => {
    // Semilla 0: el precio sube USD 10 → 360; a plazo, 375 por 291,1 t.
    expect(state.price).toBe("360");
    expect(report.revenue).toBe("109163");
    expect(report.profit).toBe("56033");
    expect(report.score).toBe(100);
    expect(report.grade).toBe("excellent");
    expect(report.mistakes).toHaveLength(0);
  });
});

describe("consecuencias de las malas decisiones", () => {
  it("una campaña descuidada rinde, produce y puntúa menos, sin bloquear", () => {
    const report = buildReport(mission, worstPath(0));
    expect(report.yieldTHa).toBeLessThan(2);
    expect(report.commercialT).toBeLessThan(150);
    expect(report.score).toBeLessThan(40);
    expect(report.mistakes.length).toBeGreaterThan(12);
  });

  it("q05: comprar poca semilla deja hectáreas sin sembrar y abarata la cosecha contratada", () => {
    let state = createCampaign(mission, 0);
    for (const key of ["b", "b", "b", "b"] as const)
      state = applyDecision(mission, state, key).state;
    state = applyDecision(mission, state, "a").state; // 4.000 kg en vez de 6.000
    expect(metrics(mission, state).sownHa).toBe(66.7);
    expect(state.costs.at(-1)).toEqual({ concept: "seed", amount: "4800", day: 9 });
  });

  it("q10: ignorar las orugas provoca daño en el evento de plagas", () => {
    let state = createCampaign(mission, 0);
    while (currentDecision(mission, state)?.id !== "q10") {
      const decision = currentDecision(mission, state);
      if (!decision) break;
      const best = optionsFor(mission, state, decision).find((o) => o.quality === "best");
      state = applyDecision(mission, state, best?.key ?? "b").state;
    }
    const before = state.condition;
    const { state: after, outcome } = applyDecision(mission, state, "c");
    expect(outcome.events).toEqual(["pests"]);
    expect(after.condition).toBe(before - 12);
    expect(after.log.some((entry) => entry.key === "pestsDamage")).toBe(true);
  });

  it("q12: cosechar con 18 % de humedad cobra el secado sobre lo cosechado", () => {
    expect(bestPath(0).costs.some((line) => line.concept === "drying")).toBe(false);
    let wet = createCampaign(mission, 0);
    while (!isFinished(mission, wet)) {
      const decision = currentDecision(mission, wet);
      if (!decision) break;
      const options = optionsFor(mission, wet, decision);
      const pick =
        decision.id === "q12" ? "a" : (options.find((o) => o.quality === "best")?.key ?? "b");
      wet = applyDecision(mission, wet, pick).state;
    }
    const drying = wet.costs.find((line) => line.concept === "drying");
    expect(drying?.amount).toBe("2673"); // 9 USD/t × 297 t
  });
});

describe("decisiones con opciones dinámicas", () => {
  it("q13: la respuesta correcta es la producción bruta de la campaña en curso", () => {
    let state = createCampaign(mission, 0);
    while (currentDecision(mission, state)?.id !== "q13") {
      const decision = currentDecision(mission, state);
      if (!decision) break;
      const best = optionsFor(mission, state, decision).find((o) => o.quality === "best");
      state = applyDecision(mission, state, best?.key ?? "b").state;
    }
    const decision = currentDecision(mission, state);
    if (!decision) throw new Error("falta q13");
    const options = optionsFor(mission, state, decision);
    expect(options.find((o) => o.quality === "best")?.value).toBe("300");
    expect(options.map((o) => o.value).sort()).toEqual(["30", "300", "3000"]);
  });

  it("la semilla cambia la posición de la respuesta correcta y el precio del mercado", () => {
    const positions = [0, 1, 2].map((seed) => {
      let state = createCampaign(mission, seed);
      while (currentDecision(mission, state)?.id !== "q13") {
        const decision = currentDecision(mission, state);
        if (!decision) break;
        const best = optionsFor(mission, state, decision).find((o) => o.quality === "best");
        state = applyDecision(mission, state, best?.key ?? "b").state;
      }
      const decision = currentDecision(mission, state);
      return decision
        ? optionsFor(mission, state, decision).findIndex((o) => o.quality === "best")
        : -1;
    });
    expect(new Set(positions).size).toBe(3);
    expect(bestPath(1).price).toBe("340");
  });

  it("q15: planificar menos viajes de los necesarios cobra el flete urgente", () => {
    let state = createCampaign(mission, 0);
    while (currentDecision(mission, state)?.id !== "q15") {
      const decision = currentDecision(mission, state);
      if (!decision) break;
      const best = optionsFor(mission, state, decision).find((o) => o.quality === "best");
      state = applyDecision(mission, state, best?.key ?? "b").state;
    }
    const decision = currentDecision(mission, state);
    if (!decision) throw new Error("falta q15");
    const options = optionsFor(mission, state, decision);
    const few = options.find((o) => o.params.n === 8);
    const right = options.find((o) => o.params.n === 10);
    expect(right?.cost).toBe("2200");
    expect(few?.cost).toBe("2440"); // 10 × 220 + 2 × 120
  });
});

describe("comparación de intentos", () => {
  it("lista las decisiones que mejoraron respecto del intento anterior", () => {
    const first = summarize(mission, worstPath(0));
    const second = summarize(mission, bestPath(1));
    const improved = improvedDecisions(first, second);
    expect(improved.length).toBeGreaterThan(12);
    expect(second.score).toBeGreaterThan(first.score);
  });
});

describe("orden de las opciones", () => {
  it("la recomendada cae en las tres posiciones según el intento, en cada decisión fija", () => {
    for (const [index, decision] of mission.decisions.entries()) {
      if (decision.kind !== "choice" && decision.kind !== "calc") continue;
      const positions = new Set(
        Array.from({ length: 30 }, (_, seed) =>
          shuffle(decision.options, seed, index).findIndex((o) => o.quality === "best"),
        ),
      );
      expect(positions.size, decision.id).toBe(3);
    }
  });

  it("en un mismo intento la recomendada no está siempre en el mismo lugar", () => {
    for (const seed of [0, 1, 2, 3]) {
      let state = createCampaign(mission, seed);
      const positions = new Set<number>();
      while (!isFinished(mission, state)) {
        const decision = currentDecision(mission, state);
        if (!decision) break;
        const options = optionsFor(mission, state, decision);
        const best = options.findIndex((o) => o.quality === "best");
        if (decision.kind === "choice" || decision.kind === "calc") positions.add(best);
        state = applyDecision(mission, state, options[best]?.key ?? "a").state;
      }
      expect(positions.size, `semilla ${seed}`).toBe(3);
    }
  });

  it("mezclar es determinista: la misma semilla da siempre el mismo orden", () => {
    const first = mission.decisions[0];
    if (first?.kind !== "choice") throw new Error("q01 debería ser de opciones fijas");
    expect(shuffle(first.options, 7, 0)).toEqual(shuffle(first.options, 7, 0));
  });
});
