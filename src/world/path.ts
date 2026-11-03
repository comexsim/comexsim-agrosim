// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo): se reconcilia al
// promover las piezas de granja al design system.
/**
 * Recorridos del mundo 2.0 (ADR-019): un vehículo avanza por una polilínea a velocidad constante.
 * Puro para probarlo sin WebGL; lo usan el tráfico ambiente y los traslados de la misión.
 */
import type { Vec3 } from "./camera";

export interface PathSample {
  position: Vec3;
  /** Rumbo en radianes alrededor del eje vertical (0 = mirando hacia +X). */
  heading: number;
}

/** Largo total de una polilínea, en metros. */
export function pathLength(points: readonly Vec3[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return total;
}

/** Punto y rumbo a la fracción `u` ∈ [0, 1] del recorrido (se recorta fuera del rango). */
export function samplePath(points: readonly Vec3[], u: number): PathSample {
  const first = points[0];
  if (!first) throw new Error("samplePath: el recorrido no tiene puntos");
  if (points.length === 1) return { position: [...first], heading: 0 };
  const target = Math.min(Math.max(u, 0), 1) * pathLength(points);
  let walked = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (walked + length >= target || i === points.length - 1) {
      const k = length === 0 ? 0 : Math.min((target - walked) / length, 1);
      return {
        position: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
        heading: Math.atan2(-(b[2] - a[2]), b[0] - a[0]),
      };
    }
    walked += length;
  }
  return { position: [...first], heading: 0 };
}

/**
 * Fracción del recorrido de un vehículo del tráfico ambiente en `time` segundos: ida y vuelta o
 * en bucle, con su desfase para que no salgan todos juntos.
 */
export function loopProgress(
  time: number,
  lengthM: number,
  speedMs: number,
  offset = 0,
  pingPong = false,
): number {
  if (lengthM <= 0 || speedMs <= 0) return 0;
  const lap = lengthM / speedMs;
  const raw = (((time / lap + offset) % 1) + 1) % 1;
  if (!pingPong) return raw;
  return raw < 0.5 ? raw * 2 : 2 - raw * 2;
}
