"use client";

// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo).
import type { ThreeElements } from "@react-three/fiber";

import type { Vec3 } from "./camera";
import { useSurface, type SurfaceOptions } from "./context";

/**
 * Bloques de construcción de las piezas. Medidas en metros de maqueta; `at` es el centro de la
 * base, así las piezas apoyan en Y = 0 sin cuentas.
 */
export type GroupProps = ThreeElements["group"];

export function Box({
  size,
  at = [0, 0, 0],
  color,
  rotation,
  shadow = true,
  ...options
}: SurfaceOptions & {
  size: Vec3;
  at?: Vec3;
  color: string;
  rotation?: Vec3;
  shadow?: boolean;
}) {
  const material = useSurface()(color, options);
  return (
    <mesh
      position={[at[0], at[1] + size[1] / 2, at[2]]}
      rotation={rotation}
      material={material}
      castShadow={shadow}
      receiveShadow
    >
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Cilindro de pie (o acostado con `rotation`): ruedas, postes, silos, tolvas. */
export function Cylinder({
  radius,
  height,
  at = [0, 0, 0],
  color,
  rotation,
  segments = 14,
  top,
  ...options
}: SurfaceOptions & {
  radius: number;
  height: number;
  at?: Vec3;
  color: string;
  rotation?: Vec3;
  segments?: number;
  /** Radio de arriba, si es distinto (conos truncados). */
  top?: number;
}) {
  const material = useSurface()(color, options);
  return (
    <mesh
      position={[at[0], at[1] + height / 2, at[2]]}
      rotation={rotation}
      material={material}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[top ?? radius, radius, height, segments]} />
    </mesh>
  );
}

/** Rueda de maquinaria: cilindro acostado a lo largo de Z. */
export function Wheel({
  radius,
  width,
  at,
  color,
}: {
  radius: number;
  width: number;
  at: Vec3;
  color: string;
}) {
  return (
    <Cylinder
      radius={radius}
      height={width}
      at={[at[0], at[1] + radius - width / 2, at[2]]}
      rotation={[Math.PI / 2, 0, 0]}
      color={color}
      rough={0.95}
      segments={14}
    />
  );
}
