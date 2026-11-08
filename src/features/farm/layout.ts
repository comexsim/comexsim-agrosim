import { ISO_AZIMUTH, isoShot, type CameraShot, type Vec3 } from "@/world/camera";
import type { StationId } from "@/engine/types";

/**
 * Trazado de la maqueta (metros de maqueta, no reales): un solo lote de 100 ha que se transforma,
 * el casco de la finca, el camino, el acopio y la planta aceitera. Puro, para probarlo sin WebGL.
 */

export const FIELD = { width: 200, depth: 140 } as const;
/** Distancia entre hileras y entre plantas de la maqueta (a escala de lectura, no agronómica). */
export const ROW_SPACING = 3.5;
export const PLANT_SPACING = 2.4;
/** Pasadas de la maquinaria sobre el lote. */
export const PASSES = 8;

export const YARD: Vec3 = [-165, 0, -30];
export const ACOPIO: Vec3 = [240, 0, 10];
export const PLANT: Vec3 = [360, 0, -20];
/** Diorama de primer plano del cultivo, lejos de la finca para que no se vea desde arriba. */
export const MACRO: Vec3 = [-560, 0, 320];
/** El camino corre a lo largo de X, al sur del lote. */
export const ROAD_Z = 92;
export const ROAD = { from: -280, to: 450 } as const;
/** Sector del lote donde aparecen las orugas (esquina noreste). */
export const PEST_SECTOR = { x: [15, 70], z: [-62, -17] } as const;

export const SHOTS: Record<StationId, CameraShot> = {
  farm: isoShot([40, 0, 10], 480),
  field: isoShot([0, 0, 0], 250),
  // Cerca de la máquina que trabaja: la cámara la sigue y el resto del lote queda de fondo.
  follow: isoShot([0, 0, 0], 120),
  macro: { target: MACRO, azimuth: ISO_AZIMUTH, polar: 1.12, span: 34 },
  yard: isoShot([YARD[0] + 10, 0, YARD[2] + 5], 120),
  acopio: isoShot([ACOPIO[0], 0, ACOPIO[2] + 10], 160),
  plant: isoShot([PLANT[0] - 10, 0, PLANT[2] + 10], 170),
  result: isoShot([95, 0, 15], 700),
};

export interface PlantSpot {
  x: number;
  z: number;
  /** Orden en que la maquinaria pasa por la planta (0 = primera), normalizado a [0, 1). */
  order: number;
  /** Ruido fijo por planta (0–1), para variaciones sin azar. */
  noise: number;
  row: number;
}

/** Ruido determinista a partir de dos enteros. */
export function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Plantas del lote en hileras a lo largo de X. El orden sigue las pasadas en zigzag de la
 * maquinaria: así lo que la máquina deja atrás coincide con lo que se dibuja sembrado o cosechado.
 */
export function plantGrid(
  width: number = FIELD.width,
  depth: number = FIELD.depth,
  passes: number = PASSES,
): PlantSpot[] {
  const rows = Math.floor(depth / ROW_SPACING);
  const cols = Math.floor(width / PLANT_SPACING);
  const rowsPerPass = rows / passes;
  const spots: PlantSpot[] = [];
  for (let r = 0; r < rows; r += 1) {
    const pass = Math.min(Math.floor(r / rowsPerPass), passes - 1);
    for (let c = 0; c < cols; c += 1) {
      const along = pass % 2 === 0 ? c : cols - 1 - c;
      spots.push({
        x: -width / 2 + PLANT_SPACING / 2 + c * PLANT_SPACING,
        z: -depth / 2 + ROW_SPACING / 2 + r * ROW_SPACING,
        order: (pass + along / cols) / passes,
        noise: hash(r, c),
        row: r,
      });
    }
  }
  return spots;
}

/**
 * Recorrido en zigzag que cubre un rectángulo con `passes` pasadas a lo largo de X, con las
 * cabeceras fuera del lote para que la máquina gire sin pisar el cultivo.
 */
export function passPath(
  x: readonly [number, number],
  z: readonly [number, number],
  passes: number = PASSES,
  headland = 6,
): Vec3[] {
  const points: Vec3[] = [];
  const step = (z[1] - z[0]) / passes;
  for (let p = 0; p < passes; p += 1) {
    const lane = z[0] + step * (p + 0.5);
    const [start, end] =
      p % 2 === 0 ? [x[0] - headland, x[1] + headland] : [x[1] + headland, x[0] - headland];
    points.push([start, 0, lane], [end, 0, lane]);
  }
  return points;
}

export const FIELD_PASSES = passPath(
  [-FIELD.width / 2, FIELD.width / 2],
  [-FIELD.depth / 2, FIELD.depth / 2],
);

/** Del casco de la finca a la cabecera del lote, por el camino interno. */
export const YARD_TO_FIELD: Vec3[] = [
  [YARD[0] + 18, 0, YARD[2] + 22],
  [-FIELD.width / 2 - 12, 0, YARD[2] + 22],
  [-FIELD.width / 2 - 12, 0, -FIELD.depth / 2 + 8],
];

/** Del lote al acopio por el camino principal (los camiones de la cosecha). */
export const FIELD_TO_ACOPIO: Vec3[] = [
  [FIELD.width / 2 + 10, 0, FIELD.depth / 2 - 6],
  [FIELD.width / 2 + 10, 0, ROAD_Z - 2],
  [ACOPIO[0] - 40, 0, ROAD_Z - 2],
  [ACOPIO[0] - 40, 0, ACOPIO[2] + 26],
  [ACOPIO[0] - 6, 0, ACOPIO[2] + 26],
];

/** Del acopio a la planta aceitera (la venta). */
export const ACOPIO_TO_PLANT: Vec3[] = [
  [ACOPIO[0] + 10, 0, ROAD_Z - 2],
  [PLANT[0] - 30, 0, ROAD_Z - 2],
  [PLANT[0] - 30, 0, PLANT[2] + 30],
];

/** Puntos de muestreo de suelo (zigzag representativo del lote). */
export const SAMPLE_POINTS: Vec3[] = [
  [-80, 0, -50],
  [-40, 0, 30],
  [0, 0, -40],
  [35, 0, 45],
  [70, 0, -20],
  [85, 0, 50],
];
