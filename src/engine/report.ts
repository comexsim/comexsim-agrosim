import Decimal from "decimal.js";

import { costsByConcept, metrics } from "./campaign";
import type { CampaignState, DecisionId, DimensionId, Mission, Quality, StageId } from "./types";

/**
 * Informe final de la campaña: resultado económico y puntaje académico de 0 a 100 en siete
 * dimensiones (las seis etapas más sostenibilidad y buenas prácticas). Puro.
 */

const QUALITY_SHARE: Record<Quality, number> = { best: 1, fair: 0.5, poor: 0 };

export const DIMENSIONS: readonly DimensionId[] = [
  "soil",
  "sowing",
  "crop",
  "harvest",
  "postharvest",
  "market",
  "sustainability",
];

export type Grade = "excellent" | "good" | "developing";

export interface DimensionScore {
  id: DimensionId;
  score: number;
  max: number;
}

export interface Mistake {
  decision: DecisionId;
  stage: StageId;
  quality: Quality;
  day: number;
}

export interface CampaignReport {
  revenue: string;
  costs: string;
  profit: string;
  costPerHa: string;
  costPerTonne: string;
  /** Margen sobre ventas en porcentaje, con un decimal. */
  margin: number;
  sownHa: number;
  yieldTHa: number;
  commercialT: number;
  /** Cuánto superaron los costos al capital disponible, o `null` si alcanzó. */
  overBudget: string | null;
  breakdown: { concept: string; amount: string }[];
  dimensions: DimensionScore[];
  score: number;
  grade: Grade;
  mistakes: Mistake[];
}

function usd(value: Decimal): string {
  return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0);
}

export function gradeFor(score: number): Grade {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  return "developing";
}

export function scoreDimensions(mission: Mission, state: CampaignState): DimensionScore[] {
  const earned = new Map<DimensionId, number>();
  for (const decision of mission.decisions) {
    const answer = state.answers[decision.id];
    if (!answer) continue;
    const points = decision.points * QUALITY_SHARE[answer.quality];
    earned.set(decision.stage, (earned.get(decision.stage) ?? 0) + points);
  }
  const sustainability = Math.max(0, mission.dimensions.sustainability - state.badPractices);
  earned.set("sustainability", sustainability);
  return DIMENSIONS.map((id) => ({
    id,
    score: Math.round((earned.get(id) ?? 0) * 10) / 10,
    max: mission.dimensions[id],
  }));
}

export function buildReport(mission: Mission, state: CampaignState): CampaignReport {
  const m = metrics(mission, state);
  const revenue = new Decimal(state.revenue ?? 0);
  const costs = new Decimal(m.spent);
  const profit = revenue.minus(costs);
  const dimensions = scoreDimensions(mission, state);
  const score = Math.round(dimensions.reduce((total, d) => total + d.score, 0));
  const mistakes: Mistake[] = mission.decisions.flatMap((decision) => {
    const answer = state.answers[decision.id];
    if (!answer || answer.quality === "best") return [];
    return [
      { decision: decision.id, stage: decision.stage, quality: answer.quality, day: decision.day },
    ];
  });
  return {
    revenue: usd(revenue),
    costs: usd(costs),
    profit: usd(profit),
    costPerHa: usd(costs.div(mission.area)),
    costPerTonne: m.commercialT > 0 ? usd(costs.div(m.commercialT)) : "0",
    margin: revenue.gt(0) ? profit.div(revenue).times(100).toDecimalPlaces(1).toNumber() : 0,
    sownHa: m.sownHa,
    yieldTHa: m.yieldTHa,
    commercialT: m.commercialT,
    overBudget: costs.gt(mission.budget) ? usd(costs.minus(mission.budget)) : null,
    breakdown: costsByConcept(state),
    dimensions,
    score,
    grade: gradeFor(score),
    mistakes,
  };
}

/** Lo que se guarda de un intento terminado, para compararlo con el siguiente. */
export interface AttemptSummary {
  score: number;
  profit: string;
  yieldTHa: number;
  commercialT: number;
  costs: string;
  best: DecisionId[];
}

export function summarize(mission: Mission, state: CampaignState): AttemptSummary {
  const report = buildReport(mission, state);
  return {
    score: report.score,
    profit: report.profit,
    yieldTHa: report.yieldTHa,
    commercialT: report.commercialT,
    costs: report.costs,
    best: mission.decisions
      .filter((decision) => state.answers[decision.id]?.quality === "best")
      .map((decision) => decision.id),
  };
}

/** Decisiones que el intento actual resolvió mejor que el anterior. */
export function improvedDecisions(previous: AttemptSummary, current: AttemptSummary): DecisionId[] {
  return current.best.filter((id) => !previous.best.includes(id));
}
