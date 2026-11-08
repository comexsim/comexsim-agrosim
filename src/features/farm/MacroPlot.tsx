"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";

import { cropLook } from "@/engine/growth";
import { useSurface, useWorld } from "@/world/context";
import { WorldTag } from "@/world/labels";

import { useScene } from "./clock";
import { CLOSEUP, CLOSEUP_CENTER, hash, inCloseup, plantGrid, ROW_SPACING } from "./layout";
import { weedLevel } from "./SoyField";
import { stepProgress } from "./visual";

/**
 * Primer plano del cultivo (observaciones O2 y O3): la lupa sobre el mismo lote. Las plantas del
 * parche `CLOSEUP` se dibujan grandes y detalladas en su lugar de siempre (el lote las oculta
 * mientras tanto) y la cámara solo se acerca. Las hojas trifoliadas crecen por nudos, aparecen
 * las flores y las vainas, amarillean y se secan; entre las hileras brotan las malezas, y en la
 * decisión de las orugas se ven las larvas comiendo las hojas.
 */

const NODES = 5;

interface PlantSpec {
  x: number;
  z: number;
  seed: number;
}

export function MacroPlot({ labels }: { labels: { closeup: string; threshold: string } }) {
  const scene = useScene();
  // Las mismas plantas del lote en el parche, con su posición y su ruido.
  const plants = useMemo<PlantSpec[]>(
    () =>
      plantGrid()
        .filter((spot) => inCloseup(spot.x, spot.z))
        .map((spot) => ({ x: spot.x + (spot.noise - 0.5) * 0.6, z: spot.z, seed: spot.noise })),
    [],
  );
  const rows = useMemo(() => [...new Set(plants.map((plant) => plant.z))], [plants]);
  const weeds = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: CLOSEUP.x[0] + hash(i, 3) * (CLOSEUP.x[1] - CLOSEUP.x[0]),
        // Entre las hileras, no encima de las plantas.
        z: (rows[i % Math.max(rows.length - 1, 1)] ?? CLOSEUP_CENTER[2]) + ROW_SPACING / 2,
        seed: hash(i, 5),
      })),
    [rows],
  );
  const showPests =
    scene.cue?.decision === "q10" ||
    (!scene.visual.answered.includes("q10") && scene.day() >= 52 && scene.day() < 62);

  return (
    <group>
      {plants.map((plant) => (
        <MacroPlant key={`${plant.x},${plant.z}`} spec={plant} />
      ))}
      {weeds.map((weed) => (
        <MacroWeed key={`${weed.x},${weed.z}`} spec={weed} />
      ))}
      {showPests || scene.visual.pest === "damage" ? <Caterpillars plants={plants} /> : null}
      <WorldTag
        text={labels.closeup}
        tone="mine"
        position={[CLOSEUP_CENTER[0], 7.5, CLOSEUP.z[0]]}
      />
      {showPests ? (
        <WorldTag
          text={labels.threshold}
          tone="alert"
          position={[CLOSEUP_CENTER[0], 6.5, CLOSEUP.z[1]]}
        />
      ) : null}
    </group>
  );
}

/** Planta grande: tallo, nudos con hojas de tres folíolos, flores y vainas según el día. */
function MacroPlant({ spec }: { spec: PlantSpec }) {
  const { palette } = useWorld();
  const surface = useSurface();
  const scene = useScene();
  const root = useRef<Group>(null);
  const stem = useRef<Mesh>(null);
  const nodes = useRef<Group>(null);
  const signature = useRef("");

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const day = scene.day();
    const now = scene.now();
    const look = cropLook(day);
    const sown = stepProgress(scene.visual, scene.cue, "q07", now) > spec.seed * 0.9;
    const harvested = stepProgress(scene.visual, scene.cue, "q14", now) > spec.seed;
    const key = `${day.toFixed(1)}|${sown}|${harvested}|${scene.visual.stress.toFixed(2)}|${scene.visual.pest}`;
    if (key === signature.current) return;
    signature.current = key;

    group.visible = sown && look.height > 0;
    if (!group.visible) return;
    const height = harvested ? 0.12 : look.height * (0.9 + spec.seed * 0.2);
    const stemHeight = Math.max(height * 3.6, 0.3);
    if (stem.current) {
      // El cilindro está centrado: se escala y se sube la mitad de lo que crece.
      stem.current.scale.set(1, stemHeight, 1);
      stem.current.position.y = stemHeight / 2;
      stem.current.material = surface(look.ripeness > 1 ? palette.cropDry : palette.cropDeep);
    }
    const leafColor =
      look.ripeness <= 1
        ? mixColor(
            palette.crop,
            palette.cropYellow,
            Math.max(look.ripeness, scene.visual.stress * 0.4),
          )
        : mixColor(palette.cropYellow, palette.cropDry, look.ripeness - 1);
    const podColor = mixColor(palette.cropYoung, palette.cropDry, Math.min(look.ripeness / 2, 1));
    const damaged = scene.visual.pest === "damage" && day >= 58;
    nodes.current?.children.forEach((node, i) => {
      // Los nudos aparecen de abajo hacia arriba a medida que la planta crece.
      const grown = !harvested && i < Math.ceil(height * NODES);
      node.visible = grown;
      if (!grown) return;
      node.position.y = 0.35 + (i + 0.5) * 0.68 * height;
      node.children.forEach((child) => {
        const part = child as Mesh;
        const role = part.name;
        if (role === "leaf") {
          // Al secarse, las hojas caen; con la plaga quedan comidas.
          part.visible = look.ripeness < 1.7;
          const eaten = damaged && (i + Math.round(spec.seed * 10)) % 2 === 0 ? 0.55 : 1;
          // Del tamaño de las plantas del lote que la rodean (hileras a 3,5 y plantas a 2,4).
          part.scale.setScalar((0.45 + height * 0.5) * eaten);
          const blade = part.children[0] as Mesh | undefined;
          if (blade) blade.material = surface(leafColor, { rough: 0.8 });
        } else if (role === "flower") {
          part.visible = look.bloom > 0.2;
        } else if (role === "pod") {
          part.visible = look.phase === "pods" || look.phase === "filling" || look.ripeness > 0;
          part.material = surface(podColor, { rough: 0.85 });
        }
      });
    });
  });

  return (
    <group ref={root} position={[spec.x, 0, spec.z]} rotation={[0, spec.seed * Math.PI * 2, 0]}>
      <mesh ref={stem} position={[0, 0, 0]} material={surface(palette.cropDeep)} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 1, 6]} />
      </mesh>
      <group ref={nodes}>
        {Array.from({ length: NODES }, (_, i) => (
          <group key={i} rotation={[0, i * 1.9, 0]}>
            {[0, 1, 2].map((leaf) => (
              // Folíolo: elipse aplanada que sale del nudo; el grupo escala sin deformarla.
              <group key={leaf} name="leaf" rotation={[0, (leaf * Math.PI * 2) / 3, 0.25]}>
                <mesh position={[0.8, 0, 0]} scale={[0.8, 0.09, 0.45]} castShadow receiveShadow>
                  <sphereGeometry args={[1, 8, 5]} />
                </mesh>
              </group>
            ))}
            <mesh name="flower" position={[0.25, 0.1, 0.2]}>
              <sphereGeometry args={[0.16, 6, 4]} />
              <meshStandardMaterial color={palette.flower} roughness={0.7} />
            </mesh>
            {[0.7, 2.6].map((angle) => (
              <mesh
                key={angle}
                name="pod"
                position={[Math.cos(angle) * 0.35, -0.25, Math.sin(angle) * 0.35]}
                rotation={[0.3, angle, 0.9]}
                castShadow
              >
                <capsuleGeometry args={[0.14, 0.75, 2, 6]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

/** Maleza grande entre las hileras: aparece y desaparece igual que en el lote. */
function MacroWeed({ spec }: { spec: { x: number; z: number; seed: number } }) {
  const { palette } = useWorld();
  const surface = useSurface();
  const scene = useScene();
  const group = useRef<Group>(null);
  useFrame(() => {
    const current = group.current;
    if (!current) return;
    const day = scene.day();
    const level = scene.visual.answered.includes("q14") ? 0 : weedLevel(day, scene.visual);
    const sprayed =
      scene.visual.weedsControlled &&
      stepProgress(scene.visual, scene.cue, "q08", scene.now()) >= 1;
    const visible = !sprayed && spec.seed < level;
    current.visible = visible;
    if (visible) current.scale.setScalar(0.45 + level * 0.6);
  });
  return (
    <group ref={group} position={[spec.x, 0, spec.z]} rotation={[0, spec.seed * 6, 0]}>
      {[0, 1.3, 2.6, 3.9, 5.2].map((angle) => (
        <mesh
          key={angle}
          material={surface(palette.weed, { rough: 0.9 })}
          position={[Math.cos(angle) * 0.3, 0.9, Math.sin(angle) * 0.3]}
          rotation={[Math.sin(angle) * 0.5, angle, Math.cos(angle) * 0.5]}
          castShadow
        >
          <coneGeometry args={[0.18, 1.9, 3]} />
        </mesh>
      ))}
    </group>
  );
}

/** Orugas sobre algunas plantas: cuerpo de segmentos verdes que se arrastra por la hoja. */
function Caterpillars({ plants }: { plants: PlantSpec[] }) {
  const { palette } = useWorld();
  const surface = useSurface();
  const group = useRef<Group>(null);
  const hosts = useMemo(() => plants.filter((_, i) => i % 2 === 1), [plants]);
  useFrame(({ clock }) => {
    group.current?.children.forEach((worm, i) => {
      const t = clock.elapsedTime * 1.4 + i;
      worm.children.forEach((segment, s) => {
        segment.position.y = Math.max(Math.sin(t * 3 - s * 0.9), 0) * 0.08;
      });
      worm.position.x = hosts[i] ? hosts[i].x + Math.sin(t * 0.4) * 0.25 : 0;
    });
  });
  return (
    <group ref={group}>
      {hosts.map((host, i) => (
        <group key={i} position={[host.x, 2.1 + (i % 2) * 0.6, host.z + 0.8]} scale={1.3}>
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <mesh
              key={s}
              material={surface(
                s === 5 ? palette.dark : s % 2 === 0 ? palette.cropYellow : palette.weed,
              )}
              position={[s * 0.17 - 0.45, 0, 0]}
              castShadow
            >
              <sphereGeometry args={[s === 5 ? 0.11 : 0.12, 6, 5]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function mixColor(from: string, to: string, k: number): string {
  const a = Number.parseInt(from.slice(1), 16);
  const b = Number.parseInt(to.slice(1), 16);
  const t = Math.min(Math.max(k, 0), 1);
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
}
