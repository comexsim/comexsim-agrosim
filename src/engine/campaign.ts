import Decimal from "decimal.js";

import type {
  CampaignState,
  ChoiceDecision,
  CostLine,
  Decision,
  Effects,
  LogEntry,
  Mission,
  MissionEvent,
  OptionKey,
  Quality,
  ResolvedOption,
} from "./types";

/**
 * Motor de la campaña: puro (sin reloj ni azar propios; la semilla entra como parámetro) y sin un
 * solo número del dominio: todo sale de la misión. Las reglas son pedagógicas y explícitas, no un
 * modelo agronómico: una mala decisión cambia el resultado, nunca bloquea.
 */

const KEYS: readonly OptionKey[] = ["a", "b", "c"];

/** USD enteros, redondeo comercial. */
function usd(value: Decimal.Value): string {
  return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0);
}

/** Toneladas y hectáreas con un decimal (no son dinero: basta `number`). */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createCampaign(mission: Mission, seed: number): CampaignState {
  return {
    missionId: mission.id,
    seed,
    day: 0,
    step: 0,
    costs: [{ concept: "overhead", amount: mission.overhead, day: 0 }],
    condition: 100,
    yieldFactor: 1,
    sownShare: 1,
    seedPrice: "0",
    harvestLoss: 0,
    storageLoss: 0,
    dryingPerTonne: "0",
    price: mission.basePrice,
    revenue: null,
    flags: [],
    answers: {},
    badPractices: 0,
    log: [
      { day: 0, key: "start", tone: "info" },
      { day: 0, key: "overhead", tone: "info", cost: mission.overhead },
    ],
    events: [],
  };
}

export function currentDecision(mission: Mission, state: CampaignState): Decision | null {
  return mission.decisions[state.step] ?? null;
}

export function isFinished(mission: Mission, state: CampaignState): boolean {
  return state.step >= mission.decisions.length;
}

export interface CampaignMetrics {
  spent: string;
  budgetLeft: string;
  sownHa: number;
  /** Rendimiento estimado con las decisiones tomadas hasta ahora (t/ha). */
  yieldTHa: number;
  grossT: number;
  harvestedT: number;
  commercialT: number;
  condition: number;
}

export function metrics(mission: Mission, state: CampaignState): CampaignMetrics {
  const spent = state.costs.reduce((total, line) => total.plus(line.amount), new Decimal(0));
  const sownHa = round1(mission.area * state.sownShare);
  // La condición pesa hasta un 40 %: un cultivo descuidado rinde menos, pero algo rinde.
  const yieldTHa = round1(
    mission.potentialYield * state.yieldFactor * (0.6 + (0.4 * state.condition) / 100),
  );
  const grossT = round1(sownHa * yieldTHa);
  const harvestedT = round1(grossT * (1 - state.harvestLoss));
  const commercialT = round1(harvestedT * (1 - mission.baseShrink - state.storageLoss));
  return {
    spent: usd(spent),
    budgetLeft: usd(new Decimal(mission.budget).minus(spent)),
    sownHa,
    yieldTHa,
    grossT,
    harvestedT,
    commercialT,
    condition: Math.round(state.condition),
  };
}

/** Costo de una opción fija según cómo va la campaña (semilla y cosecha dependen de antes). */
function effectsCost(mission: Mission, state: CampaignState, effects: Effects): Decimal {
  let cost = new Decimal(effects.cost ?? 0);
  if (effects.seedKg !== undefined)
    cost = cost.plus(new Decimal(state.seedPrice).times(effects.seedKg));
  if (effects.perSownHa !== undefined) {
    cost = cost.plus(new Decimal(effects.perSownHa).times(metrics(mission, state).sownHa));
  }
  return cost;
}

/** Las seis formas de ordenar tres opciones. */
const ORDERS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * Mezcla tres opciones con la semilla del intento y el número de decisión: la recomendada cae en
 * cualquier lugar y sin un patrón que se pueda memorizar entre una decisión y la siguiente.
 */
export function shuffle<T>(values: readonly T[], seed: number, salt: number): T[] {
  if (values.length !== 3) return [...values];
  const mixed = (Math.imul(seed + 1, 2654435761) ^ Math.imul(salt + 1, 40503)) >>> 0;
  const order = ORDERS[mixed % ORDERS.length] ?? ORDERS[0];
  return (order ?? [0, 1, 2]).map((i) => values[i] as T);
}

/** Ordena tres valores con la semilla, para que la respuesta correcta no esté siempre en el medio. */
function arrange<T>(values: readonly [T, T, T], seed: number, salt: number): T[] {
  const shift = (seed + salt) % 3;
  return [...values.slice(shift), ...values.slice(0, shift)];
}

function tripsCost(mission: Mission, chosen: number, needed: number): Decimal {
  const trip = new Decimal(mission.tripCost);
  if (chosen >= needed) return trip.times(chosen);
  return trip.times(needed).plus(new Decimal(mission.urgentTripPremium).times(needed - chosen));
}

function saleOffers(mission: Mission, state: CampaignState) {
  const tonnes = new Decimal(metrics(mission, state).commercialT);
  const price = new Decimal(state.price);
  const spot = tonnes.times(price);
  const forward = tonnes.times(price.plus(mission.forwardPremium));
  const advance = tonnes.times(price.minus(mission.advanceDiscount));
  return [
    { key: "a" as const, gross: spot, cost: new Decimal(0), price },
    {
      key: "b" as const,
      gross: forward,
      cost: new Decimal(mission.forwardCost),
      price: price.plus(mission.forwardPremium),
    },
    {
      key: "c" as const,
      gross: advance,
      cost: new Decimal(0),
      price: price.minus(mission.advanceDiscount),
    },
  ];
}

/** Calidad por ranking del ingreso neto: comparar márgenes es lo que se evalúa. */
function rankQualities(nets: readonly Decimal[]): Quality[] {
  const sorted = [...nets].sort((a, b) => b.comparedTo(a));
  return nets.map((net) =>
    net.eq(sorted[0] ?? net) ? "best" : net.eq(sorted[1] ?? net) ? "fair" : "poor",
  );
}

function totalCosts(state: CampaignState): Decimal {
  return state.costs.reduce((total, line) => total.plus(line.amount), new Decimal(0));
}

/** Opciones listas para mostrar, con su costo y su valor. */
export function optionsFor(
  mission: Mission,
  state: CampaignState,
  decision: Decision,
): ResolvedOption[] {
  const index = mission.decisions.indexOf(decision);
  const m = metrics(mission, state);
  switch (decision.kind) {
    case "choice":
    case "calc":
      return shuffle(decision.options, state.seed, index).map((option) => ({
        key: option.key,
        quality: option.quality,
        cost: usd(effectsCost(mission, state, option.effects)),
        params: option.params ?? {},
      }));
    case "production": {
      const correct = Math.round(m.grossT);
      const values = arrange(
        [Math.round(correct / 10), correct, correct * 10] as const,
        state.seed,
        index,
      );
      return values.map((value, i) => ({
        key: KEYS[i] as OptionKey,
        quality: value === correct ? "best" : "poor",
        cost: "0",
        params: { t: value },
        value: String(value),
      }));
    }
    case "trips": {
      const needed = Math.max(1, Math.ceil(m.harvestedT / mission.truckCapacity));
      const values = arrange(
        [Math.max(1, needed - 2), needed, needed + 2] as const,
        state.seed,
        index,
      );
      return values.map((value, i) => ({
        key: KEYS[i] as OptionKey,
        quality: value === needed ? "best" : "poor",
        cost: usd(tripsCost(mission, value, needed)),
        params: { n: value },
        value: String(value),
      }));
    }
    case "sale": {
      const offers = saleOffers(mission, state);
      const qualities = rankQualities(offers.map((offer) => offer.gross.minus(offer.cost)));
      const resolved = offers.map((offer, i) => ({
        key: offer.key,
        quality: qualities[i] ?? "poor",
        cost: usd(offer.cost),
        params: { price: offer.price.toNumber() },
        value: usd(offer.gross.minus(offer.cost)),
      }));
      return shuffle(resolved, state.seed, index);
    }
    case "result": {
      const profit = new Decimal(state.revenue ?? 0).minus(totalCosts(state));
      const step = new Decimal(10000);
      const correct = usd(profit);
      const values = arrange(
        [usd(profit.minus(step)), correct, usd(profit.plus(step))] as const,
        state.seed,
        index,
      );
      return values.map((value, i) => ({
        key: KEYS[i] as OptionKey,
        quality: value === correct ? "best" : "poor",
        cost: "0",
        params: { amount: value },
        value,
      }));
    }
  }
}

/** Datos del enunciado: los fijos de la misión y, en las dinámicas, los de la campaña en curso. */
export function promptParams(
  mission: Mission,
  state: CampaignState,
  decision: Decision,
): Record<string, number | string> {
  const m = metrics(mission, state);
  switch (decision.kind) {
    case "production":
      return { ha: m.sownHa, yield: m.yieldTHa };
    case "trips":
      return {
        t: m.harvestedT,
        capacity: mission.truckCapacity,
        tripCost: Number(mission.tripCost),
      };
    case "sale":
      return { t: m.commercialT, price: Number(state.price) };
    case "result":
      return { revenue: state.revenue ?? "0", costs: usd(totalCosts(state)) };
    default:
      return decision.params ?? {};
  }
}

export interface Outcome {
  quality: Quality;
  cost: string;
  events: MissionEvent["id"][];
}

function addCost(costs: CostLine[], concept: string, amount: Decimal, day: number): CostLine[] {
  if (amount.lte(0)) return costs;
  return [...costs, { concept, amount: usd(amount), day }];
}

function applyEffects(
  mission: Mission,
  state: CampaignState,
  decision: ChoiceDecision,
  key: OptionKey,
): CampaignState {
  const option = decision.options.find((candidate) => candidate.key === key);
  if (!option) throw new Error(`Opción ${key} inexistente en ${decision.id}`);
  const { effects } = option;
  const cost = effectsCost(mission, state, effects);
  let next: CampaignState = {
    ...state,
    costs: addCost(
      state.costs,
      effects.concept ?? (effects.seedKg ? "seed" : "other"),
      cost,
      decision.day,
    ),
    condition: clamp(state.condition + (effects.condition ?? 0), 0, 100),
    yieldFactor: state.yieldFactor * (effects.yieldFactor ?? 1),
    seedPrice: effects.seedPrice ?? state.seedPrice,
    harvestLoss: state.harvestLoss + (effects.harvestLoss ?? 0),
    storageLoss: state.storageLoss + (effects.storageLoss ?? 0),
    dryingPerTonne: effects.dryingPerTonne ?? state.dryingPerTonne,
    badPractices: state.badPractices + (effects.practice === false ? 1 : 0),
    flags: effects.flag ? [...state.flags, effects.flag] : state.flags,
  };
  if (effects.seedKg !== undefined) {
    const rate = Number(decision.params?.seedRate ?? 1);
    next = { ...next, sownShare: Math.min(1, effects.seedKg / (rate * mission.area)) };
  }
  if (effects.chargesDrying && new Decimal(next.dryingPerTonne).gt(0)) {
    const drying = new Decimal(next.dryingPerTonne).times(metrics(mission, next).harvestedT);
    next = { ...next, costs: addCost(next.costs, "drying", drying, decision.day) };
  }
  return next;
}

function applyDynamic(
  mission: Mission,
  state: CampaignState,
  decision: Decision,
  chosen: ResolvedOption,
): CampaignState {
  if (decision.kind === "trips") {
    return {
      ...state,
      costs: addCost(state.costs, "transport", new Decimal(chosen.cost), decision.day),
    };
  }
  if (decision.kind === "sale") {
    const offer = saleOffers(mission, state).find((candidate) => candidate.key === chosen.key);
    if (!offer) return state;
    return {
      ...state,
      revenue: usd(offer.gross),
      costs: addCost(state.costs, "saleCosts", offer.cost, decision.day),
    };
  }
  return state;
}

function fireEvent(mission: Mission, state: CampaignState, event: MissionEvent): CampaignState {
  const effects = mission.eventEffects;
  const log: LogEntry[] = [];
  let next = { ...state, events: [...state.events, event.id] };
  if (event.id === "pests") {
    if (state.flags.includes("pestUnchecked")) {
      next = {
        ...next,
        condition: clamp(next.condition + effects.pestDamage, 0, 100),
        yieldFactor: next.yieldFactor * effects.pestYield,
      };
      log.push({ day: event.day, key: "pestsDamage", tone: "event" });
    } else if (state.flags.includes("pestBlanket")) {
      log.push({ day: event.day, key: "pestsBlanket", tone: "event" });
    } else {
      const focal = new Decimal(effects.pestFocalCost);
      next = { ...next, costs: addCost(next.costs, "pests", focal, event.day) };
      log.push({ day: event.day, key: "pestsFocal", tone: "event", cost: usd(focal) });
    }
  }
  if (event.id === "rain") {
    log.push({ day: event.day, key: "rain", tone: "event" });
    if (state.flags.includes("tilled")) {
      next = { ...next, condition: clamp(next.condition + effects.rainErosion, 0, 100) };
      log.push({ day: event.day, key: "rainErosion", tone: "event" });
    }
    if (state.flags.includes("rustUnchecked")) {
      next = { ...next, condition: clamp(next.condition + effects.rainRust, 0, 100) };
      log.push({ day: event.day, key: "rainRust", tone: "event" });
    }
  }
  if (event.id === "price") {
    const shift = mission.priceShifts[state.seed % mission.priceShifts.length] ?? 0;
    const price = new Decimal(mission.basePrice).plus(shift);
    next = { ...next, price: usd(price) };
    log.push({
      day: event.day,
      key: shift >= 0 ? "priceUp" : "priceDown",
      tone: "event",
      params: { shift: Math.abs(shift), price: price.toNumber() },
    });
  }
  return { ...next, day: Math.max(next.day, event.day), log: [...next.log, ...log] };
}

/** Confirma la opción `key` de la decisión en curso y dispara los eventos que le siguen. */
export function applyDecision(
  mission: Mission,
  state: CampaignState,
  key: OptionKey,
): { state: CampaignState; outcome: Outcome } {
  const decision = currentDecision(mission, state);
  if (!decision) throw new Error("La campaña ya terminó");
  const options = optionsFor(mission, state, decision);
  const chosen = options.find((option) => option.key === key);
  if (!chosen) throw new Error(`Opción ${key} inexistente en ${decision.id}`);

  const base: CampaignState = { ...state, day: decision.day };
  const spentBefore = totalCosts(state);
  let next =
    decision.kind === "choice" || decision.kind === "calc"
      ? applyEffects(mission, base, decision, key)
      : applyDynamic(mission, base, decision, chosen);
  next = {
    ...next,
    step: state.step + 1,
    answers: { ...next.answers, [decision.id]: { key, quality: chosen.quality } },
    log: [
      ...next.log,
      {
        day: decision.day,
        key: "decided",
        tone: "decision",
        decision: decision.id,
        quality: chosen.quality,
        cost: usd(totalCosts(next).minus(spentBefore)),
      },
    ],
  };
  const fired: MissionEvent["id"][] = [];
  for (const event of mission.events.filter((candidate) => candidate.after === decision.id)) {
    next = fireEvent(mission, next, event);
    fired.push(event.id);
  }
  return {
    state: next,
    outcome: {
      quality: chosen.quality,
      cost: usd(totalCosts(next).minus(spentBefore)),
      events: fired,
    },
  };
}

/** Desglose de costos por concepto, en el orden en que aparecieron. */
export function costsByConcept(state: CampaignState): { concept: string; amount: string }[] {
  const totals = new Map<string, Decimal>();
  for (const line of state.costs) {
    totals.set(line.concept, (totals.get(line.concept) ?? new Decimal(0)).plus(line.amount));
  }
  return [...totals].map(([concept, amount]) => ({ concept, amount: usd(amount) }));
}
