// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo): se reconcilia al
// promover las piezas de granja al design system.
/**
 * Planos de cámara del mundo 2.0 (ADR-019): puros para probarlos sin WebGL. Un plano es un punto
 * que se mira, desde qué ángulo y con cuánto acercamiento; la cámara ortográfica vuela de un plano
 * a otro y puede seguir a un vehículo.
 */
export type Vec3 = [number, number, number];

export interface CameraShot {
  /** Punto que se mira. */
  target: Vec3;
  /** Giro alrededor del eje vertical, en radianes (0 = mirando hacia −Z). */
  azimuth: number;
  /** Ángulo desde la vertical, en radianes (0 = cenital, π/2 = horizonte). */
  polar: number;
  /** Metros de mundo que entran a lo ancho de la pantalla. */
  span: number;
}

/** Vista isométrica de la maqueta: 45° de giro y unos 55° desde la vertical. */
export const ISO_AZIMUTH = Math.PI / 4;
export const ISO_POLAR = 0.96;

/** Distancia a la que se ubica la cámara ortográfica (no cambia el tamaño, solo el recorte). */
export const CAMERA_DISTANCE = 400;

export function isoShot(target: Vec3, span: number, azimuth = ISO_AZIMUTH): CameraShot {
  return { target, azimuth, polar: ISO_POLAR, span };
}

/** Posición de la cámara para un plano, a `distance` del punto que mira. */
export function shotPosition(shot: CameraShot, distance = CAMERA_DISTANCE): Vec3 {
  const [x, y, z] = shot.target;
  const horizontal = Math.sin(shot.polar) * distance;
  return [
    x + Math.sin(shot.azimuth) * horizontal,
    y + Math.cos(shot.polar) * distance,
    z + Math.cos(shot.azimuth) * horizontal,
  ];
}

/** Acercamiento de la cámara ortográfica (píxeles por metro) para que entre `span` a lo ancho. */
export function shotZoom(span: number, width: number, height: number): number {
  const fitWidth = width / span;
  if (height <= width) return Math.max(fitWidth, 0.5);
  // En pantallas verticales se acerca más (hasta 2,2 veces), para no achicar la estación a una
  // franja; se recorta a los lados, que es lo que menos importa en la vista isométrica.
  const fitHeight = height / (span * 0.75);
  return Math.max(Math.min(fitHeight, fitWidth * 2.2), 0.5);
}

/** Curva de aceleración suave en los dos extremos (ease in-out cúbica). */
export function easeInOut(t: number): number {
  const k = Math.min(Math.max(t, 0), 1);
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** El giro más corto entre dos ángulos, para que la cámara no dé la vuelta larga. */
export function lerpAngle(a: number, b: number, k: number): number {
  const turn = Math.PI * 2;
  let delta = (b - a) % turn;
  if (delta > Math.PI) delta -= turn;
  if (delta < -Math.PI) delta += turn;
  return a + delta * k;
}

/**
 * Plano intermedio de un vuelo, con `t` ∈ [0, 1]. A mitad del vuelo se aleja un poco (`lift`) para
 * que se lea el recorrido entre una estación y otra, como en la referencia.
 */
export function flightShot(from: CameraShot, to: CameraShot, t: number, lift = 0.35): CameraShot {
  const k = easeInOut(t);
  const distance = Math.hypot(to.target[0] - from.target[0], to.target[2] - from.target[2]);
  const widen = Math.sin(Math.PI * k) * Math.min(distance * lift, Math.max(from.span, to.span));
  return {
    target: [
      lerp(from.target[0], to.target[0], k),
      lerp(from.target[1], to.target[1], k),
      lerp(from.target[2], to.target[2], k),
    ],
    azimuth: lerpAngle(from.azimuth, to.azimuth, k),
    polar: lerp(from.polar, to.polar, k),
    span: lerp(from.span, to.span, k) + widen,
  };
}

/** Segundos de un vuelo: más largo cuanto más lejos, entre 1,2 y 3,2 s. */
export function flightDuration(from: CameraShot, to: CameraShot): number {
  const distance = Math.hypot(to.target[0] - from.target[0], to.target[2] - from.target[2]);
  const spanChange = Math.abs(to.span - from.span);
  return Math.min(Math.max(1.2, (distance + spanChange) / 120), 3.2);
}

/** Suavizado exponencial independiente de los cuadros por segundo (para seguir un vehículo). */
export function followEase(delta: number, rate = 4): number {
  return 1 - Math.exp(-Math.min(delta, 0.1) * rate);
}
