import type { DecisionId, Quality } from "@/engine/types";

/**
 * Guion del Modo Presentación: un recorrido guiado de unos 6 minutos para mostrar la demo sin
 * riesgo de equivocarse en vivo. Toma la decisión recomendada, salvo donde conviene mostrar qué
 * cuesta un error: ignorar las malezas se ve en el lote y baja el resultado.
 */
export const PRESENTATION_SEED = 0;

export const PRESENTATION_PICKS: Partial<Record<DecisionId, Quality>> = { q08: "poor" };

/** Pausas en milisegundos antes de cada acción. */
export const PRESENTATION_BEATS = {
  /** En el briefing, tiempo para presentar la misión. */
  briefing: 9000,
  /** Tiempo para leer el enunciado antes de marcar la opción. */
  read: 4200,
  /** Tiempo con la opción marcada antes de confirmarla. */
  choose: 2400,
  /** Tiempo para leer la consecuencia. */
  feedback: 6500,
  /** Tiempo adicional cuando además ocurrió un evento. */
  event: 3500,
} as const;
