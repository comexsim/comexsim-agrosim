"use client";

// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo).
import { useMemo } from "react";

import type { Vec3 } from "./camera";
import { useSurface, useWorld } from "./context";
import { Box, Cylinder, type GroupProps } from "./primitives";

/** Árbol de copa redonda (`round`) o pino (`pine`). */
export function Tree({
  variant = "round",
  color,
  scale = 1,
  ...props
}: GroupProps & { variant?: "round" | "pine"; color?: string; scale?: number }) {
  const { palette } = useWorld();
  const surface = useSurface();
  const leaves = surface(color ?? palette.foliage, { rough: 0.9 });
  return (
    <group scale={scale} {...props}>
      <Cylinder radius={0.35} height={2.4} color={palette.trunk} segments={6} />
      {variant === "round" ? (
        <mesh position={[0, 4.2, 0]} material={leaves} castShadow receiveShadow>
          <icosahedronGeometry args={[2.4, 0]} />
        </mesh>
      ) : (
        <>
          <mesh position={[0, 4.4, 0]} material={leaves} castShadow receiveShadow>
            <coneGeometry args={[2.2, 4.4, 7]} />
          </mesh>
          <mesh position={[0, 6.6, 0]} material={leaves} castShadow>
            <coneGeometry args={[1.5, 3, 7]} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Fila de árboles con variación fija (sin azar: la escena es siempre la misma). */
export function TreeRow({ from, to, count }: { from: Vec3; to: Vec3; count: number }) {
  const { palette } = useWorld();
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const k = count === 1 ? 0 : i / (count - 1);
        const jitter = ((i * 37) % 11) / 11 - 0.5;
        return (
          <Tree
            key={i}
            variant={i % 3 === 2 ? "pine" : "round"}
            color={i % 2 === 0 ? palette.foliage : palette.foliage2}
            scale={0.85 + ((i * 13) % 7) / 20}
            position={[
              from[0] + (to[0] - from[0]) * k + jitter * 2,
              from[1],
              from[2] + (to[2] - from[2]) * k + jitter * 3,
            ]}
          />
        );
      })}
    </>
  );
}

/** Explanada plana (pasto, ripio, suelo) apoyada en Y = 0. */
export function Ground({
  size,
  color,
  y = 0,
  ...props
}: GroupProps & { size: [number, number]; color: string; y?: number }) {
  const material = useSurface()(color, { rough: 0.95 });
  return (
    <group {...props}>
      <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]} material={material} receiveShadow>
        <planeGeometry args={size} />
      </mesh>
    </group>
  );
}

/** Camino de asfalto con línea central discontinua, a lo largo de X. */
export function Road({
  length,
  width = 8,
  ...props
}: GroupProps & { length: number; width?: number }) {
  const { palette } = useWorld();
  const dashes = useMemo(
    () => Array.from({ length: Math.floor(length / 8) }, (_, i) => -length / 2 + 4 + i * 8),
    [length],
  );
  return (
    <group {...props}>
      <Ground size={[length, width]} color={palette.asphalt} y={0.03} />
      {dashes.map((x) => (
        <Box
          key={x}
          size={[3.6, 0.02, 0.3]}
          at={[x, 0.05, 0]}
          color={palette.paint}
          shadow={false}
        />
      ))}
    </group>
  );
}

/** Persona: piernas, torso y cabeza, a escala con los vehículos. */
export function Person({ shirt, ...props }: GroupProps & { shirt: string }) {
  const { palette } = useWorld();
  const surface = useSurface();
  return (
    <group {...props}>
      <Cylinder radius={0.22} height={0.85} color={palette.dark} segments={8} />
      <Cylinder
        radius={0.26}
        top={0.22}
        height={0.7}
        at={[0, 0.85, 0]}
        color={shirt}
        segments={8}
      />
      <mesh position={[0, 1.78, 0]} material={surface(palette.skin)} castShadow>
        <sphereGeometry args={[0.2, 10, 8]} />
      </mesh>
    </group>
  );
}
