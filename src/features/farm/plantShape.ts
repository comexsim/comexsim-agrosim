import { ConeGeometry, CylinderGeometry, OctahedronGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Siluetas low-poly para las mallas instanciadas del lote (miles de copias: pocos vértices). La
 * soya se reconoce por sus hojas de tres folíolos; la versión anterior era una bola y parecía
 * lechuga (observación O7).
 */

function leaflet(angle: number, height: number, size: number): BufferGeometry {
  // Folíolo: un rombo aplanado que apunta hacia afuera y sube un poco hacia la punta.
  return new OctahedronGeometry(1, 0)
    .scale(0.5 * size, 0.1 * size, 0.27 * size)
    .rotateZ(0.35)
    .translate(0.5 * size, 0, 0)
    .rotateY(angle)
    .translate(0, height, 0);
}

/** Planta de soya: tallo y dos pisos de hojas trifoliadas, de unos 1,75 de alto y 1 de radio. */
export function soyPlantGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [new CylinderGeometry(0.05, 0.07, 1.5, 4).translate(0, 0.75, 0)];
  for (const [base, height, size] of [
    [0, 0.85, 1.05],
    [Math.PI / 3, 1.3, 0.9],
    [0, 1.65, 0.6],
  ] as const) {
    for (let i = 0; i < 3; i += 1) parts.push(leaflet(base + (i * Math.PI * 2) / 3, height, size));
  }
  const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
  if (!merged) throw new Error("soyPlantGeometry: las piezas no comparten atributos");
  merged.computeVertexNormals();
  return merged;
}

/** Maleza: una mata de hojas finas y abiertas, distinta de la soya a simple vista. */
export function weedGeometry(): BufferGeometry {
  const parts = [-0.5, 0, 0.5, 1.6, 2.6].map((angle, i) =>
    new ConeGeometry(0.16, 1.7 - (i % 2) * 0.4, 3)
      .translate(0, 0.85, 0)
      .rotateZ(0.45 + (i % 3) * 0.15)
      .rotateY(angle * 1.3),
  );
  const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
  if (!merged) throw new Error("weedGeometry: las piezas no comparten atributos");
  merged.computeVertexNormals();
  return merged;
}
