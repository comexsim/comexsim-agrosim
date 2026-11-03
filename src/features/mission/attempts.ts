import type { AttemptSummary } from "@/engine/report";

/**
 * Historial de intentos en el navegador (sin backend en esta demo). Si el almacenamiento falla
 * (ventana privada, bloqueado), la misión funciona igual: solo no compara intentos.
 */

const KEY = (missionId: string) => `agrosim:attempts:${missionId}`;
const MAX_ATTEMPTS = 10;

function isSummary(value: unknown): value is AttemptSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.score === "number" &&
    typeof candidate.profit === "string" &&
    Array.isArray(candidate.best)
  );
}

export function parseAttempts(raw: string | null): AttemptSummary[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSummary) : [];
  } catch {
    return [];
  }
}

export function loadAttempts(missionId: string): AttemptSummary[] {
  try {
    return parseAttempts(window.localStorage.getItem(KEY(missionId)));
  } catch {
    return [];
  }
}

export function saveAttempts(missionId: string, attempts: AttemptSummary[]): void {
  try {
    window.localStorage.setItem(KEY(missionId), JSON.stringify(attempts.slice(-MAX_ATTEMPTS)));
  } catch {
    // Sin almacenamiento disponible: el intento vale igual, solo no se recuerda.
  }
}
