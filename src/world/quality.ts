// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo): se reconcilia al
// promover las piezas de granja al design system.
/**
 * Calidad adaptable de las escenas 3D (R-4b.7, AGENTS §0: 60 FPS en un portátil común). Pura para
 * probarla sin WebGL: decide la densidad de píxeles según los cuadros por segundo medidos.
 */

/** Densidad máxima: más que 2 no se nota y cuesta el cuádruple de píxeles. */
export const MAX_DPR = 2;
/** Por debajo de estos FPS se baja la densidad. */
export const LOWER_FPS = 52;
const STEP = 0.25;

/** Densidad inicial: la del dispositivo, sin pasar del máximo. */
export function initialDpr(deviceDpr: number): number {
  return Math.min(Math.max(deviceDpr, 1), MAX_DPR);
}

/**
 * Densidad del próximo tramo según los FPS del último. Solo baja: con FPS bajos, un paso; con muy
 * bajos, dos. Nunca baja de 1. No vuelve a subir, para no oscilar entre dos valores.
 */
export function nextDpr(current: number, fps: number): number {
  if (fps >= LOWER_FPS) return current;
  const steps = fps < LOWER_FPS / 2 ? 2 : 1;
  return Math.max(1, current - STEP * steps);
}

/**
 * El mundo 2.0 (ADR-019) apaga la oclusión ambiental si, ya en la densidad mínima, sigue sin llegar
 * a los FPS: es el efecto más caro y el que menos se extraña en una GPU integrada.
 */
export function shouldDropAmbientOcclusion(dpr: number, fps: number): boolean {
  return dpr <= 1 && fps < LOWER_FPS;
}
