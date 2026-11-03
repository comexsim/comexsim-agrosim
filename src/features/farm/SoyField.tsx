"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
} from "three";

import { cropLook } from "@/engine/growth";
import { useWorld } from "@/world/context";
import { Ground } from "@/world/nature";

import { useScene } from "./clock";
import { FIELD, PASSES, PEST_SECTOR, plantGrid, ROW_SPACING } from "./layout";
import { stepProgress, type FieldVisual } from "./visual";

/**
 * El lote de soya: miles de plantas en una sola malla instanciada que crecen, florecen,
 * amarillean y se cosechan según el día y las decisiones. También dibuja el rastrojo, los surcos
 * de la labranza y las malezas. Se actualiza solo cuando algo cambia (60 FPS en GPU integrada).
 */

const scratch = new Object3D();
const tint = new Color();
const mix = new Color();
// Material blanco: el color de cada planta va en `instanceColor`.
const instanceMaterial = new MeshStandardMaterial({ roughness: 0.85 });
const plantGeometry = new IcosahedronGeometry(1, 0).translate(0, 0.75, 0);
const weedGeometry = new ConeGeometry(0.7, 1.6, 5).translate(0, 0.8, 0);
const strawGeometry = new BoxGeometry(1.6, 0.12, 0.35);
const furrowGeometry = new BoxGeometry(1, 0.18, 0.45);

const FURROWS = Math.floor(FIELD.depth / 1.75);

function inPestSector(x: number, z: number): boolean {
  return (
    x >= PEST_SECTOR.x[0] && x <= PEST_SECTOR.x[1] && z >= PEST_SECTOR.z[0] && z <= PEST_SECTOR.z[1]
  );
}

/** Nivel de malezas (0–1) según el día y el manejo. */
function weedLevel(day: number, visual: FieldVisual): number {
  if (day < 6) return 0.35;
  if (visual.ground === "rough") return Math.max(0.6, day < 28 ? 0.6 : visual.weeds);
  // Tras el barbecho o la labranza, rebrotan desde el día 18 hasta la decisión q08.
  const regrowth = Math.min(Math.max((day - 18) / 10, 0), 1);
  return regrowth * visual.weeds;
}

export function SoyField() {
  const { palette } = useWorld();
  const scene = useScene();
  const spots = useMemo(() => plantGrid(), []);
  const weedSpots = useMemo(
    () =>
      spots
        .filter((spot, i) => i % 3 === 0 && spot.row < Math.floor(FIELD.depth / ROW_SPACING) - 1)
        .map((spot) => ({ ...spot, z: spot.z + ROW_SPACING / 2 })),
    [spots],
  );
  const strawSpots = useMemo(() => spots.filter((_, i) => i % 5 === 2), [spots]);
  const colors = useMemo(
    () => ({
      young: new Color(palette.cropYoung),
      crop: new Color(palette.crop),
      deep: new Color(palette.cropDeep),
      flower: new Color(palette.flower),
      yellow: new Color(palette.cropYellow),
      dry: new Color(palette.cropDry),
      pest: new Color(palette.pest),
      straw: new Color(palette.straw),
      weed: new Color(palette.weed),
      furrow: new Color(palette.soilPlowed),
    }),
    [palette],
  );
  const plants = useRef<InstancedMesh>(null);
  const weeds = useRef<InstancedMesh>(null);
  const straw = useRef<InstancedMesh>(null);
  const furrows = useRef<InstancedMesh>(null);
  const signature = useRef("");

  useFrame(() => {
    const { visual, cue } = scene;
    const now = scene.now();
    const day = scene.day();
    const look = cropLook(day);
    const prep = stepProgress(visual, cue, "q03", now);
    const sow = Math.min(stepProgress(visual, cue, "q07", now), visual.sownShare);
    const weedSpray = visual.weedsControlled ? stepProgress(visual, cue, "q08", now) : 0;
    const harvest = stepProgress(visual, cue, "q14", now);
    const pestSpray = stepProgress(visual, cue, "q10", now);
    const key = [
      day.toFixed(2),
      prep.toFixed(3),
      sow.toFixed(3),
      weedSpray.toFixed(3),
      harvest.toFixed(3),
      pestSpray.toFixed(2),
      visual.stress.toFixed(2),
      visual.pest,
      visual.rust,
      visual.ground,
      colors.crop.getHexString(),
    ].join("|");
    if (key === signature.current) return;
    signature.current = key;

    const plantMesh = plants.current;
    if (plantMesh) {
      spots.forEach((spot, i) => {
        const sown = spot.order < sow;
        if (!sown) {
          scratch.scale.setScalar(0);
        } else if (look.height === 0) {
          // Recién sembrado: la línea del surco detrás de la sembradora, antes de la emergencia.
          scratch.scale.set(0.9, 0.08, 0.35);
          tint.copy(colors.furrow);
        } else if (spot.order < harvest) {
          scratch.scale.set(0.55, 0.22, 0.55);
          tint.copy(colors.straw);
        } else {
          const h = look.height * (0.85 + spot.noise * 0.3);
          const w = 0.4 + h * 1.15;
          scratch.scale.set(w, 0.25 + h * 1.65, w * 0.9);
          tint.copy(colors.young).lerp(colors.crop, Math.min(h * 1.6, 1));
          if (h > 0.6) tint.lerp(colors.deep, (h - 0.6) * 1.2);
          if (spot.noise > 0.75) tint.lerp(colors.flower, look.bloom * 0.3);
          if (look.ripeness <= 1) {
            if (spot.noise < visual.stress * 0.9) tint.lerp(colors.yellow, 0.45);
            tint.lerp(colors.yellow, look.ripeness);
          } else {
            tint.copy(colors.yellow).lerp(colors.dry, look.ripeness - 1);
          }
          if (inPestSector(spot.x, spot.z) && day >= 52 && look.ripeness < 1) {
            const pest =
              visual.pest === "damage"
                ? 0.65
                : visual.pest === "none"
                  ? 0.35
                  : 0.35 * (1 - pestSpray);
            tint.lerp(colors.pest, pest);
          }
          if (visual.rust === "damage" && day >= 76 && spot.noise > 0.5 && look.ripeness < 1) {
            tint.lerp(colors.dry, 0.45);
          }
        }
        scratch.position.set(spot.x + (spot.noise - 0.5) * 0.6, 0, spot.z);
        scratch.rotation.set(0, look.height === 0 ? 0 : spot.noise * Math.PI * 2, 0);
        scratch.updateMatrix();
        plantMesh.setMatrixAt(i, scratch.matrix);
        plantMesh.setColorAt(i, tint);
      });
      plantMesh.instanceMatrix.needsUpdate = true;
      if (plantMesh.instanceColor) plantMesh.instanceColor.needsUpdate = true;
    }

    const weedMesh = weeds.current;
    if (weedMesh) {
      const level = harvest > 0 ? 0 : weedLevel(day, visual);
      // Antes de la preparación hay malezas viejas; el barbecho (q03 b) y la labranza las sacan.
      const burned = visual.ground === "rough" ? 0 : prep;
      weedSpots.forEach((spot, i) => {
        const cleared = (day < 18 && spot.order < burned) || (day >= 18 && spot.order < weedSpray);
        const visible = !cleared && spot.noise < level;
        const s = visible ? (0.55 + spot.noise * 0.6) * Math.max(level, 0.5) : 0;
        scratch.position.set(spot.x + 0.6, 0, spot.z);
        scratch.rotation.set(0, spot.noise * 6, 0);
        scratch.scale.setScalar(s);
        scratch.updateMatrix();
        weedMesh.setMatrixAt(i, scratch.matrix);
        weedMesh.setColorAt(i, mix.copy(colors.weed).lerp(colors.deep, spot.noise * 0.4));
      });
      weedMesh.instanceMatrix.needsUpdate = true;
      if (weedMesh.instanceColor) weedMesh.instanceColor.needsUpdate = true;
    }

    const strawMesh = straw.current;
    if (strawMesh) {
      const plowed = visual.ground === "plowed" ? prep : 0;
      strawSpots.forEach((spot, i) => {
        const visible = spot.order >= plowed;
        scratch.position.set(spot.x + 0.8, 0.02, spot.z + ROW_SPACING / 2);
        scratch.rotation.set(0, spot.noise * Math.PI, 0);
        scratch.scale.setScalar(visible ? 0.7 + spot.noise * 0.6 : 0);
        scratch.updateMatrix();
        strawMesh.setMatrixAt(i, scratch.matrix);
        strawMesh.setColorAt(i, colors.straw);
      });
      strawMesh.instanceMatrix.needsUpdate = true;
      if (strawMesh.instanceColor) strawMesh.instanceColor.needsUpdate = true;
    }

    const furrowMesh = furrows.current;
    if (furrowMesh) {
      const plowed = visual.ground === "plowed" ? prep : 0;
      for (let i = 0; i < FURROWS; i += 1) {
        const z = -FIELD.depth / 2 + 0.9 + i * 1.75;
        const pass = Math.min(Math.floor((i / FURROWS) * PASSES), PASSES - 1);
        const done = Math.min(Math.max(plowed * PASSES - pass, 0), 1);
        const length = FIELD.width * done;
        const forward = pass % 2 === 0;
        const x = forward ? -FIELD.width / 2 + length / 2 : FIELD.width / 2 - length / 2;
        scratch.position.set(x, 0, z);
        scratch.rotation.set(0, 0, 0);
        scratch.scale.set(Math.max(length, 0.001), done > 0 ? 1 : 0, 1);
        scratch.updateMatrix();
        furrowMesh.setMatrixAt(i, scratch.matrix);
        furrowMesh.setColorAt(i, colors.furrow);
      }
      furrowMesh.instanceMatrix.needsUpdate = true;
      if (furrowMesh.instanceColor) furrowMesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <FieldGround />
      <instancedMesh
        ref={plants}
        args={[plantGeometry, instanceMaterial, spots.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={weeds}
        args={[weedGeometry, instanceMaterial, weedSpots.length]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={straw}
        args={[strawGeometry, instanceMaterial, strawSpots.length]}
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={furrows}
        args={[furrowGeometry, instanceMaterial, FURROWS]}
        receiveShadow
        frustumCulled={false}
      />
    </group>
  );
}

/** Suelo del lote: se oscurece con la lluvia y queda ripio en la cabecera. */
function FieldGround() {
  const { palette } = useWorld();
  const { visual } = useScene();
  return (
    <>
      <Ground
        size={[FIELD.width + 24, FIELD.depth + 24]}
        color={palette.gravel}
        y={0.01}
        position={[0, 0, 0]}
      />
      <Ground
        size={[FIELD.width, FIELD.depth]}
        color={visual.rained ? palette.soilWet : palette.soil}
        y={0.03}
      />
    </>
  );
}
