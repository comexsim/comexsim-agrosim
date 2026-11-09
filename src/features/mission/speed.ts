import { SPEEDS, type Speed } from "@/features/farm/cues";

/**
 * Velocidad de las animaciones guardada en el navegador. Si el almacenamiento falla (ventana
 * privada, bloqueado), se usa la normal y la misión funciona igual.
 */

const KEY = "agrosim:speed";

export function parseSpeed(raw: string | null): Speed {
  return SPEEDS.find((speed) => speed === raw) ?? "normal";
}

export function loadSpeed(): Speed {
  try {
    return parseSpeed(window.localStorage.getItem(KEY));
  } catch {
    return "normal";
  }
}

export function saveSpeed(speed: Speed): void {
  try {
    window.localStorage.setItem(KEY, speed);
  } catch {
    // Sin almacenamiento la elección dura lo que dura la pestaña: no impide simular.
  }
}
