"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useRef, type ReactNode } from "react";
import type { Group, Mesh } from "three";

import type { Vec3 } from "@/world/camera";
import { useWorld } from "@/world/context";
import { Box, Cylinder, Wheel, type GroupProps } from "@/world/primitives";
import { samplePath } from "@/world/path";

import { trackVehicle } from "./follow";

/**
 * Maquinaria agrícola low-poly hecha con primitivas (hasta que haya un pack CC0 recoloreado).
 * Todas miran a +X y apoyan en Y = 0. Lo del estudiante va en el verde de marca; lo contratado,
 * en amarillo.
 */

/** Mueve a su hijo por un recorrido según el avance (0–1) que devuelve `progress` cada cuadro. */
export const Mover = forwardRef<
  Group,
  {
    path: readonly Vec3[];
    progress: () => number;
    children: ReactNode;
    visible?: () => boolean;
    /** Mientras se ve, la cámara lo sigue de cerca. */
    track?: boolean;
  }
>(function Mover({ path, progress, children, visible, track = false }, forwarded) {
  const local = useRef<Group>(null);
  useFrame(() => {
    const group = local.current;
    if (!group) return;
    const shown = visible ? visible() : true;
    group.visible = shown;
    if (track) trackVehicle(group, shown);
    if (!shown) return;
    const sample = samplePath(path, progress());
    group.position.set(...sample.position);
    group.rotation.y = sample.heading;
  });
  return (
    <group
      ref={(node) => {
        local.current = node;
        if (typeof forwarded === "function") forwarded(node);
        else if (forwarded) forwarded.current = node;
      }}
    >
      {children}
    </group>
  );
});

export function Tractor({ color, ...props }: GroupProps & { color: string }) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[3.6, 1.3, 1.7]} at={[0.4, 0.9, 0]} color={color} rough={0.5} />
      <Box size={[1.9, 1.0, 1.5]} at={[1.6, 1.7, 0]} color={color} rough={0.5} />
      <Box size={[1.7, 1.8, 1.8]} at={[-0.7, 2.2, 0]} color={palette.glass} rough={0.2} glow />
      <Box size={[1.9, 0.15, 2.0]} at={[-0.7, 4.0, 0]} color={color} rough={0.5} />
      <Cylinder
        radius={0.09}
        height={1.3}
        at={[1.9, 2.6, 0.45]}
        color={palette.dark}
        segments={6}
      />
      <Wheel radius={1.15} width={0.8} at={[-1.0, 0, 1.15]} color={palette.dark} />
      <Wheel radius={1.15} width={0.8} at={[-1.0, 0, -1.15]} color={palette.dark} />
      <Wheel radius={0.65} width={0.5} at={[1.9, 0, 0.95]} color={palette.dark} />
      <Wheel radius={0.65} width={0.5} at={[1.9, 0, -0.95]} color={palette.dark} />
    </group>
  );
}

/** Tractor con implemento detrás: rastra de discos, fertilizadora o sembradora. */
export function TractorWith({
  implement,
  color,
  ...props
}: GroupProps & { implement: "harrow" | "spreader" | "seeder"; color: string }) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Tractor color={color} position={[2.5, 0, 0]} />
      <Box size={[1.4, 0.2, 0.3]} at={[0.2, 0.7, 0]} color={palette.dark} />
      {implement === "harrow" ? (
        <group position={[-1.6, 0, 0]}>
          <Box size={[0.6, 0.4, 9]} at={[0, 1.0, 0]} color={palette.contractor} />
          {[-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].map((z) => (
            <Cylinder
              key={z}
              radius={0.55}
              height={0.12}
              at={[0, 0.5, z]}
              rotation={[Math.PI / 2, 0, 0.3]}
              color={palette.steel}
              metal={0.5}
              rough={0.4}
            />
          ))}
        </group>
      ) : null}
      {implement === "spreader" ? (
        <group position={[-1.6, 0, 0]}>
          <Cylinder radius={1.3} top={1.6} height={1.6} at={[0, 1.0, 0]} color={color} />
          <Wheel radius={0.55} width={0.35} at={[0, 0, 1.2]} color={palette.dark} />
          <Wheel radius={0.55} width={0.35} at={[0, 0, -1.2]} color={palette.dark} />
          <Box size={[0.2, 0.1, 3.4]} at={[-1.1, 0.8, 0]} color={palette.steel} />
        </group>
      ) : null}
      {implement === "seeder" ? (
        <group position={[-1.8, 0, 0]}>
          <Box size={[0.8, 0.5, 11]} at={[0, 0.8, 0]} color={palette.dark} />
          {[-4.5, -2.7, -0.9, 0.9, 2.7, 4.5].map((z) => (
            <group key={z}>
              <Box size={[1.2, 1.0, 1.2]} at={[-0.2, 1.3, z]} color={color} rough={0.5} />
              <Wheel radius={0.35} width={0.2} at={[-0.6, 0, z]} color={palette.dark} />
            </group>
          ))}
        </group>
      ) : null}
    </group>
  );
}

/** Pulverizadora autopropulsada con botalones abiertos. */
export function Sprayer({ color, ...props }: GroupProps & { color: string }) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[4.2, 0.5, 1.6]} at={[0, 1.6, 0]} color={palette.dark} />
      <Cylinder
        radius={1.0}
        height={2.6}
        at={[-0.6, 2.1 - 1.3 + 1.0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        color={palette.paint}
        rough={0.4}
      />
      <Box size={[1.4, 1.6, 1.6]} at={[1.7, 2.1, 0]} color={color} rough={0.4} />
      <Box size={[1.2, 1.0, 1.5]} at={[1.75, 2.6, 0]} color={palette.glass} rough={0.2} glow />
      <Box size={[0.25, 0.2, 18]} at={[-2.2, 1.4, 0]} color={palette.steel} metal={0.4} />
      {[-1.6, 1.6].map((x) =>
        [-0.85, 0.85].map((z) => (
          <Wheel key={`${x}${z}`} radius={0.85} width={0.35} at={[x, 0, z]} color={palette.dark} />
        )),
      )}
    </group>
  );
}

/** Cosechadora con plataforma, tolva (se llena con `fill`) y tubo de descarga. */
export const Combine = forwardRef<Mesh, GroupProps & { color: string }>(function Combine(
  { color, ...props },
  hopper,
) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[6.4, 2.6, 3.0]} at={[-0.4, 1.0, 0]} color={color} rough={0.5} />
      <Box size={[1.8, 1.8, 2.0]} at={[2.2, 3.4, 0]} color={palette.glass} rough={0.2} glow />
      <Box size={[2.0, 0.2, 2.2]} at={[2.2, 5.2, 0]} color={color} />
      <Box size={[3.2, 1.2, 2.6]} at={[-1.6, 3.6, 0]} color={color} rough={0.5} />
      <mesh ref={hopper} position={[-1.6, 4.85, 0]} scale={[2.8, 0.05, 2.2]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={palette.grain} roughness={0.9} />
      </mesh>
      <Box size={[1.6, 0.8, 10]} at={[4.3, 0.4, 0]} color={palette.contractor} rough={0.5} />
      <Cylinder
        radius={0.25}
        height={5}
        at={[-1.8, 4.2 - 2.5, 2.4]}
        rotation={[Math.PI / 2.6, 0, 0]}
        color={color}
      />
      <Wheel radius={1.2} width={0.8} at={[1.2, 0, 1.6]} color={palette.dark} />
      <Wheel radius={1.2} width={0.8} at={[1.2, 0, -1.6]} color={palette.dark} />
      <Wheel radius={0.75} width={0.5} at={[-2.8, 0, 1.4]} color={palette.dark} />
      <Wheel radius={0.75} width={0.5} at={[-2.8, 0, -1.4]} color={palette.dark} />
    </group>
  );
});

/** Camión tolva granelero; `loaded` muestra el grano con carpa abierta. */
export function GrainTruck({
  cab,
  loaded = true,
  ...props
}: GroupProps & { cab: string; loaded?: boolean }) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[2.2, 2.4, 2.4]} at={[5.2, 0.8, 0]} color={cab} rough={0.5} />
      <Box size={[0.08, 0.9, 2.1]} at={[6.32, 1.9, 0]} color={palette.glass} rough={0.2} glow />
      <Box size={[11, 0.4, 2.3]} at={[-0.4, 0.8, 0]} color={palette.dark} />
      <Box size={[8.6, 1.9, 2.5]} at={[-1.2, 1.2, 0]} color={palette.wall2} rough={0.7} />
      {loaded ? (
        <Box size={[8.2, 0.4, 2.2]} at={[-1.2, 3.0, 0]} color={palette.grain} rough={0.95} />
      ) : null}
      {[-4.6, -3.5, 4.7].map((x) =>
        [-1.0, 1.0].map((z) => (
          <Wheel key={`${x}${z}`} radius={0.55} width={0.4} at={[x, 0, z]} color={palette.dark} />
        )),
      )}
    </group>
  );
}

/** Camión de plataforma con bolsas (fertilizante o semilla). */
export function BagTruck({ cab, bag, ...props }: GroupProps & { cab: string; bag: string }) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[2.2, 2.4, 2.4]} at={[4.4, 0.8, 0]} color={cab} rough={0.5} />
      <Box size={[0.08, 0.9, 2.1]} at={[5.52, 1.9, 0]} color={palette.glass} rough={0.2} glow />
      <Box size={[8, 0.35, 2.4]} at={[-0.6, 0.85, 0]} color={palette.dark} />
      {[-3.6, -2.0, -0.4, 1.2, 2.6].map((x) => (
        <Box key={x} size={[1.3, 1.2, 2.0]} at={[x, 1.2, 0]} color={bag} rough={0.9} />
      ))}
      {[-3.5, 3.9].map((x) =>
        [-1.0, 1.0].map((z) => (
          <Wheel key={`${x}${z}`} radius={0.55} width={0.4} at={[x, 0, z]} color={palette.dark} />
        )),
      )}
    </group>
  );
}

/** Dron agrícola con rotores que giran. */
export function Drone({ color, ...props }: GroupProps & { color: string }) {
  const { palette } = useWorld();
  const rotors = useRef<Group>(null);
  useFrame((_, delta) => {
    rotors.current?.children.forEach((rotor) => {
      rotor.rotation.y += delta * 40;
    });
  });
  return (
    <group {...props}>
      <Box size={[1.2, 0.5, 1.2]} at={[0, 0, 0]} color={color} rough={0.4} />
      <Box
        size={[3.4, 0.12, 0.2]}
        at={[0, 0.3, 0]}
        rotation={[0, Math.PI / 4, 0]}
        color={palette.dark}
      />
      <Box
        size={[3.4, 0.12, 0.2]}
        at={[0, 0.3, 0]}
        rotation={[0, -Math.PI / 4, 0]}
        color={palette.dark}
      />
      <group ref={rotors}>
        {(
          [
            [1.2, 1.2],
            [-1.2, 1.2],
            [1.2, -1.2],
            [-1.2, -1.2],
          ] as const
        ).map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, 0.5, z]}>
            <Box size={[1.6, 0.04, 0.18]} color={palette.steel} shadow={false} />
          </group>
        ))}
      </group>
    </group>
  );
}
