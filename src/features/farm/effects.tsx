"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  type Group,
  type InstancedMesh,
  type Mesh,
} from "three";

import { useWorld } from "@/world/context";

import { FIELD, hash, plantGrid } from "./layout";

/** Clima y capas de lectura sobre el lote: lluvia, nubes, mapa de riesgo y granos perdidos. */

const scratch = new Object3D();
const DROPS = 900;
const dropGeometry = new BoxGeometry(0.12, 2.4, 0.12);

/** Lluvia: gotas que caen en bucle sobre el lote mientras `active()` sea verdadero. */
export function Rain({ active }: { active: () => boolean }) {
  const { palette } = useWorld();
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: palette.water, transparent: true, opacity: 0.55 }),
    [palette.water],
  );
  const seeds = useMemo(
    () => Array.from({ length: DROPS }, (_, i) => [hash(i, 1), hash(i, 2), hash(i, 3)] as const),
    [],
  );
  useFrame(({ clock }) => {
    const instanced = mesh.current;
    if (!instanced) return;
    instanced.visible = active();
    if (!instanced.visible) return;
    const t = clock.elapsedTime;
    seeds.forEach(([a, b, c], i) => {
      const y = 40 - ((((t * 38 + c * 40) % 40) + 40) % 40);
      scratch.position.set((a - 0.5) * (FIELD.width + 40), y, (b - 0.5) * (FIELD.depth + 40));
      scratch.rotation.set(0.25, 0, 0);
      scratch.scale.setScalar(1);
      scratch.updateMatrix();
      instanced.setMatrixAt(i, scratch.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[dropGeometry, material, DROPS]} frustumCulled={false} />;
}

/** Nubes oscuras que se acercan al lote (lluvia pronosticada o en curso). */
export function Clouds({ active }: { active: () => boolean }) {
  const { palette } = useWorld();
  const group = useRef<Group>(null);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(palette.steel).lerp(new Color(palette.dark), 0.35),
        roughness: 1,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    [palette.steel, palette.dark],
  );
  useFrame(({ clock }) => {
    const current = group.current;
    if (!current) return;
    current.visible = active();
    current.position.x = Math.sin(clock.elapsedTime * 0.15) * 12;
  });
  const puffs = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        x: (hash(i, 7) - 0.5) * 260,
        z: (hash(i, 9) - 0.5) * 180,
        s: 6 + hash(i, 11) * 7,
      })),
    [],
  );
  return (
    <group ref={group} position={[0, 62, 0]}>
      {puffs.map((puff, i) => (
        <mesh
          key={i}
          material={material}
          position={[puff.x, 0, puff.z]}
          scale={[puff.s * 1.6, puff.s * 0.6, puff.s]}
          castShadow
        >
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}

const TILES_X = 10;
const TILES_Z = 7;
const tileGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/**
 * Mapa de riesgo de roya que deja el dron: cuadrículas que aparecen a medida que vuela y se
 * colorean del verde al dorado y al rojo según el riesgo.
 */
export function RiskMap({
  reveal,
  controlled,
}: {
  reveal: () => number;
  controlled: () => boolean;
}) {
  const { palette } = useWorld();
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ transparent: true, opacity: 0.42, depthWrite: false }),
    [],
  );
  const tiles = useMemo(
    () =>
      Array.from({ length: TILES_X * TILES_Z }, (_, i) => {
        const tx = i % TILES_X;
        const tz = Math.floor(i / TILES_X);
        // Más riesgo hacia el noreste (de donde llega la humedad en el escenario).
        const risk = Math.min(
          1,
          (tx / TILES_X) * 0.6 + (1 - tz / TILES_Z) * 0.4 + hash(tx, tz) * 0.3,
        );
        return {
          tx,
          tz,
          risk,
          order: (tz % 2 === 0 ? tx : TILES_X - 1 - tx) / TILES_X / TILES_Z + tz / TILES_Z,
        };
      }),
    [],
  );
  const colors = useMemo(
    () => ({
      low: new Color(palette.mine),
      mid: new Color(palette.alert),
      high: new Color(palette.pest),
    }),
    [palette],
  );
  const tint = useMemo(() => new Color(), []);
  useFrame(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const shown = reveal();
    instanced.visible = shown > 0;
    if (!instanced.visible) return;
    const calm = controlled();
    const w = FIELD.width / TILES_X;
    const d = FIELD.depth / TILES_Z;
    tiles.forEach((tile, i) => {
      scratch.position.set(
        -FIELD.width / 2 + w * (tile.tx + 0.5),
        4.2,
        -FIELD.depth / 2 + d * (tile.tz + 0.5),
      );
      scratch.rotation.set(0, 0, 0);
      scratch.scale.set(tile.order < shown ? w * 0.94 : 0, 1, d * 0.94);
      scratch.updateMatrix();
      instanced.setMatrixAt(i, scratch.matrix);
      const risk = calm ? tile.risk * 0.35 : tile.risk;
      if (risk < 0.5) tint.copy(colors.low).lerp(colors.mid, risk * 2);
      else tint.copy(colors.mid).lerp(colors.high, (risk - 0.5) * 2);
      instanced.setColorAt(i, tint);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[tileGeometry, material, tiles.length]}
      frustumCulled={false}
      renderOrder={5}
    />
  );
}

const grainGeometry = new BoxGeometry(0.5, 0.25, 0.5);

/** Granos perdidos detrás de la cosechadora: más cuanto peor la regulación. */
export function GrainLosses({ harvested, density }: { harvested: () => number; density: number }) {
  const { palette } = useWorld();
  const mesh = useRef<InstancedMesh>(null);
  const spots = useMemo(() => plantGrid().filter((_, i) => i % 4 === 1), []);
  const material = useMemo(
    () => new MeshStandardMaterial({ color: palette.grain, roughness: 0.6 }),
    [palette.grain],
  );
  const last = useRef(-1);
  useFrame(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const done = harvested();
    if (Math.abs(done - last.current) < 0.002) return;
    last.current = done;
    spots.forEach((spot, i) => {
      const visible = spot.order < done && spot.noise < density;
      scratch.position.set(spot.x + 0.9, 0.05, spot.z + 1.2);
      scratch.rotation.set(0, spot.noise * 5, 0);
      scratch.scale.setScalar(visible ? 1 : 0);
      scratch.updateMatrix();
      instanced.setMatrixAt(i, scratch.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[grainGeometry, material, spots.length]}
      frustumCulled={false}
    />
  );
}

/** Niebla de pulverización bajo el botalón: un velo que se ve solo mientras la máquina trabaja. */
export function SprayMist({ active, width = 18 }: { active: () => boolean; width?: number }) {
  const { palette } = useWorld();
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: palette.paint,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    [palette.paint],
  );
  useFrame(({ clock }) => {
    const current = mesh.current;
    if (!current) return;
    current.visible = active();
    // La niebla late un poco, como el chorro de las boquillas.
    (current.material as MeshBasicMaterial).opacity =
      0.25 + Math.sin(clock.elapsedTime * 12) * 0.08;
  });
  return (
    <mesh ref={mesh} material={material} position={[-2.4, 0.7, 0]}>
      <boxGeometry args={[1.6, 1.3, width]} />
    </mesh>
  );
}

const PUFFS = 14;
const puffGeometry = new IcosahedronGeometry(1, 0);

/**
 * Polvo que levanta la maquinaria detrás suyo. Va como hijo del vehículo: las nubes nacen en la
 * parte de atrás (−X), se abren y suben mientras se desvanecen en bucle.
 */
export function Dust({ spread, color = "soil" }: { spread: number; color?: "soil" | "grain" }) {
  const { palette } = useWorld();
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: color === "grain" ? palette.straw : palette.soil,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    [color, palette.straw, palette.soil],
  );
  useFrame(({ clock }) => {
    const instanced = mesh.current;
    if (!instanced || !instanced.parent?.parent?.visible) return;
    for (let i = 0; i < PUFFS; i += 1) {
      const t = (clock.elapsedTime * 0.7 + i / PUFFS) % 1;
      scratch.position.set(-9 - t * 16, 0.8 + t * 5, (hash(i, 21) - 0.5) * spread);
      scratch.rotation.set(0, 0, 0);
      scratch.scale.setScalar((0.9 + t * 3.2) * (1 - t * t));
      scratch.updateMatrix();
      instanced.setMatrixAt(i, scratch.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={mesh} args={[puffGeometry, material, PUFFS]} frustumCulled={false} />
    </group>
  );
}
