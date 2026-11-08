/**
 * Tipos del motor de campaña. La misión es solo datos (`src/data/agro-001.ts`): el motor no conoce
 * ni un costo ni una dosis, y todo lo que muestra es ilustrativo.
 */

export type StageId = "soil" | "sowing" | "crop" | "harvest" | "postharvest" | "market";
export type DimensionId = StageId | "sustainability";
export type OptionKey = "a" | "b" | "c";
export type Quality = "best" | "fair" | "poor";
export type DecisionId = `q${string}`;

/** Estaciones de la cámara: dónde mira la escena en cada decisión. */
/** `follow`: plano cercano que acompaña a la máquina que trabaja; `macro`: primer plano del cultivo. */
export type StationId =
  "farm" | "yard" | "field" | "follow" | "macro" | "acopio" | "plant" | "result";

/** Animaciones de la finca que dispara una decisión (las dibuja `features/farm`). */
export type CueId =
  | "sampling"
  | "fertilize"
  | "till"
  | "notill"
  | "rough-prep"
  | "seed-delivery"
  | "seed-load"
  | "inoculate"
  | "sow"
  | "spray-weeds"
  | "weeds-grow"
  | "scout"
  /** Nadie entra al lote: la decisión fue no hacer nada. */
  | "idle"
  | "spray-all"
  | "spray-spot"
  | "drone"
  | "harvest-ready"
  | "yield-check"
  | "harvest"
  | "trucks"
  | "dryer"
  | "sale"
  | "dashboard";

/** Lo que una opción le hace a la campaña. Montos en USD como texto exacto (decimal.js). */
export interface Effects {
  /** Gasto fijo de la opción. */
  cost?: string;
  /** Concepto del gasto en el desglose de costos (clave de i18n `costs.*`). */
  concept?: string;
  /** Cambio en el índice de condición del cultivo (0–100). */
  condition?: number;
  /** Multiplica el rendimiento potencial. */
  yieldFactor?: number;
  /** Precio de la semilla elegida (USD/kg): lo cobra la decisión de cuántos kg comprar. */
  seedPrice?: string;
  /** Kilos de semilla comprados: el costo es kg × precio y fija cuántas ha alcanzan. */
  seedKg?: number;
  /** Servicio cobrado por hectárea sembrada (la cosecha contratada). */
  perSownHa?: string;
  /** Fracción del grano que se pierde en la cosecha. */
  harvestLoss?: number;
  /** Fracción del grano que se pierde en el acopio. */
  storageLoss?: number;
  /** Secado adicional por tonelada cosechada (grano cosechado húmedo). */
  dryingPerTonne?: string;
  /** Al cosechar se cobra el secado pendiente sobre las toneladas cosechadas. */
  chargesDrying?: boolean;
  /** `false` si es una mala práctica (descuenta en sostenibilidad). */
  practice?: boolean;
  /** Marca que miran los eventos (p. ej. suelo labrado ante la lluvia). */
  flag?: Flag;
}

export type Flag = "tilled" | "rustUnchecked" | "pestUnchecked" | "pestBlanket";

export interface StaticOption {
  key: OptionKey;
  quality: Quality;
  effects: Effects;
  /** Valores para el texto de la opción (`{n} bolsas`). */
  params?: Record<string, number | string>;
  /** Animación propia de esta opción (si no, la de la decisión). */
  cue?: CueId;
}

interface DecisionBase {
  id: DecisionId;
  stage: StageId;
  /** Día de campaña en que se plantea. */
  day: number;
  station: StationId;
  cue: CueId;
  /** Puntos que vale en su dimensión. */
  points: number;
  /** Datos del enunciado (`{dose}`, `{area}`…), para el texto y para los cálculos. */
  params?: Record<string, number | string>;
}

/** Decisión con opciones fijas (agronómica o de cálculo). */
export interface ChoiceDecision extends DecisionBase {
  kind: "choice" | "calc";
  options: readonly StaticOption[];
}

/** Opciones que dependen de cómo va la campaña: producción, viajes, venta y resultado. */
export interface DynamicDecision extends DecisionBase {
  kind: "production" | "trips" | "sale" | "result";
}

export type Decision = ChoiceDecision | DynamicDecision;

export interface MissionEvent {
  id: "pests" | "rain" | "price";
  /** Se dispara al confirmar esta decisión. */
  after: DecisionId;
  day: number;
}

export interface Mission {
  id: string;
  area: number;
  budget: string;
  durationDays: number;
  potentialYield: number;
  /** Promedio departamental de referencia (contexto del briefing). */
  regionalYield: number;
  basePrice: string;
  /** Merma comercial simplificada. */
  baseShrink: number;
  overhead: string;
  truckCapacity: number;
  tripCost: string;
  /** Recargo por cada viaje urgente que faltó planificar. */
  urgentTripPremium: string;
  /** Venta a plazo: sobreprecio por t y costo de almacenamiento y financiamiento. */
  forwardPremium: string;
  forwardCost: string;
  /** Pago anticipado: descuento por t. */
  advanceDiscount: string;
  /** Variaciones posibles del precio en el evento de mercado (USD/t). */
  priceShifts: readonly number[];
  /** Ajustes de los eventos sobre la condición del cultivo. */
  eventEffects: {
    pestDamage: number;
    pestYield: number;
    pestFocalCost: string;
    rainErosion: number;
    rainRust: number;
  };
  decisions: readonly Decision[];
  events: readonly MissionEvent[];
  dimensions: Readonly<Record<DimensionId, number>>;
}

export interface CostLine {
  concept: string;
  amount: string;
  day: number;
}

export interface LogEntry {
  day: number;
  /** Clave de i18n en `log.*` (eventos y avisos) o `decided` para una decisión. */
  key: string;
  params?: Record<string, number | string>;
  tone: "event" | "decision" | "info";
  decision?: DecisionId;
  quality?: Quality;
  /** Gasto asociado, en USD exactos. */
  cost?: string;
}

export interface Answer {
  key: OptionKey;
  quality: Quality;
}

export interface CampaignState {
  missionId: string;
  seed: number;
  day: number;
  /** Índice de la próxima decisión (igual al total cuando terminó). */
  step: number;
  costs: CostLine[];
  condition: number;
  yieldFactor: number;
  sownShare: number;
  seedPrice: string;
  harvestLoss: number;
  storageLoss: number;
  dryingPerTonne: string;
  /** Precio de pizarra vigente (cambia con el evento de mercado). */
  price: string;
  revenue: string | null;
  flags: Flag[];
  answers: Partial<Record<DecisionId, Answer>>;
  badPractices: number;
  log: LogEntry[];
  events: MissionEvent["id"][];
}

/** Opción lista para mostrar: costo ya calculado y si es la mejor. */
export interface ResolvedOption {
  key: OptionKey;
  quality: Quality;
  /** Gasto que genera, en USD exactos ("0" si no cuesta). */
  cost: string;
  params: Record<string, number | string>;
  /** Valor numérico de la alternativa en las preguntas de cálculo dinámicas. */
  value?: string;
}
