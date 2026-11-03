"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group } from "three";

import type { StationId } from "@/engine/types";
import { useWorld } from "@/world/context";
import { WorldTag } from "@/world/labels";
import { Ground, Road, TreeRow } from "@/world/nature";
import { Box } from "@/world/primitives";
import { WorldStage, type WorldInsets } from "@/world/stage";

import { Actors, type SceneLabels } from "./Actors";
import { Dryer, House, OilPlant, Scale, Shed, Silo } from "./buildings";
import { SceneProvider, useScene, type SceneSource } from "./clock";
import { ACOPIO, FIELD, PLANT, ROAD, ROAD_Z, SHOTS, YARD } from "./layout";
import { Sprayer, TractorWith } from "./machines";
import { SoyField } from "./SoyField";
import { stepProgress } from "./visual";

export interface FarmLabels extends SceneLabels {
  scene: string;
  yard: string;
  field: string;
  acopio: string;
  plant: string;
}

export interface FarmSceneProps {
  source: SceneSource;
  station: StationId;
  labels: FarmLabels;
  insets?: WorldInsets;
  interactive?: boolean;
  fallback: ReactNode;
}

/**
 * La finca entera en una sola escena que se transforma con la campaña: el lote, el casco, el
 * camino, el acopio y la planta aceitera. La cámara vuela entre estaciones.
 */
export default function FarmScene({
  source,
  station,
  labels,
  insets,
  interactive = true,
  fallback,
}: FarmSceneProps) {
  return (
    <WorldStage
      label={labels.scene}
      shot={SHOTS[station]}
      insets={insets}
      interactive={interactive}
      fallback={fallback}
    >
      <SceneProvider value={source}>
        <Landscape labels={labels} />
        <SoyField />
        <Yard />
        <Acopio />
        <OilPlant position={PLANT} />
        <Actors labels={labels} />
      </SceneProvider>
    </WorldStage>
  );
}

function Landscape({ labels }: { labels: FarmLabels }) {
  const { palette } = useWorld();
  const halfW = FIELD.width / 2;
  const halfD = FIELD.depth / 2;
  return (
    <>
      <Ground size={[2400, 1400]} color={palette.grass} y={-0.02} position={[80, 0, 0]} />
      <Road length={ROAD.to - ROAD.from} position={[(ROAD.from + ROAD.to) / 2, 0, ROAD_Z]} />
      {/* Cortinas rompevientos alrededor del lote */}
      <TreeRow from={[-halfW - 20, 0, -halfD - 20]} to={[halfW + 20, 0, -halfD - 20]} count={22} />
      <TreeRow from={[-halfW - 30, 0, -halfD - 10]} to={[-halfW - 30, 0, halfD - 30]} count={10} />
      <TreeRow from={[halfW + 24, 0, -halfD - 10]} to={[halfW + 24, 0, halfD - 30]} count={10} />
      <TreeRow from={[ACOPIO[0] - 40, 0, -60]} to={[PLANT[0] + 40, 0, -75]} count={18} />
      <TreeRow from={[-260, 0, 120]} to={[420, 0, 125]} count={34} />
      <WorldTag text={labels.field} tone="mine" position={[0, 22, -halfD]} />
      <WorldTag text={labels.yard} position={[YARD[0], 22, YARD[2] - 12]} />
      <WorldTag text={labels.acopio} position={[ACOPIO[0], 34, ACOPIO[2] - 16]} />
      <WorldTag text={labels.plant} position={[PLANT[0], 36, PLANT[2] - 8]} />
    </>
  );
}

/** Casco de la finca: galpón, vivienda, silos chicos y la maquinaria cuando no trabaja. */
function Yard() {
  const { palette } = useWorld();
  const scene = useScene();
  const [x, , z] = YARD;
  const sprayer = useRef<Group>(null);
  useFrame(() => {
    // La pulverizadora estacionada se oculta mientras su gemela trabaja en el lote.
    const cue = scene.cue;
    const working =
      !!cue &&
      ["notill", "spray-weeds", "spray-all", "spray-spot"].includes(cue.id) &&
      stepProgress(scene.visual, cue, cue.decision, scene.now()) < 1;
    if (sprayer.current) sprayer.current.visible = !working;
  });
  return (
    <group>
      <Ground size={[90, 70]} color={palette.gravel} y={0.02} position={[x, 0, z + 6]} />
      <Shed position={[x - 4, 0, z - 14]} />
      <House position={[x - 32, 0, z + 4]} />
      <Silo radius={2.6} height={9} position={[x + 22, 0, z - 20]} />
      <Silo radius={2.6} height={9} position={[x + 29, 0, z - 20]} />
      <group ref={sprayer} position={[x - 18, 0, z + 26]} scale={1.6}>
        <Sprayer color={palette.mine} />
      </group>
      <TractorWith
        implement="spreader"
        color={palette.mine}
        scale={1.6}
        position={[x + 4, 0, z + 30]}
      />
      <Box size={[0.4, 1.2, 70]} at={[x - 45, 0, z + 6]} color={palette.wall2} />
    </group>
  );
}

/** Centro de acopio: balanza, secadora y una batería de silos que se llena con la cosecha. */
function Acopio() {
  const { palette } = useWorld();
  const scene = useScene();
  const [x, , z] = ACOPIO;
  const silos = useRef<Group>(null);
  const pile = useRef<Group>(null);
  useFrame(() => {
    const now = scene.now();
    const fill =
      stepProgress(scene.visual, scene.cue, "q15", now) * 0.55 +
      stepProgress(scene.visual, scene.cue, "q16", now) * 0.25;
    silos.current?.children.forEach((silo, i) => {
      const level = silo.getObjectByName("level");
      if (!level) return;
      const share = Math.max(Math.min(fill * 1.2 - i * 0.12, 1), 0.01);
      // El cilindro crece desde la base: se escala y se sube la mitad de lo que crece.
      level.scale.y = share;
      level.position.y = 10 * share;
    });
    if (pile.current) pile.current.visible = scene.visual.storage === "poor";
  });
  return (
    <group>
      <Ground size={[120, 80]} color={palette.gravel} y={0.02} position={[x, 0, z + 6]} />
      <group ref={silos}>
        {[-24, -12, 0, 12].map((dx) => (
          <group key={dx} position={[x + dx, 0, z - 12]}>
            <Silo radius={5} height={20} />
            <mesh name="level" position={[0, 0, 0]} scale={[1, 0.01, 1]}>
              <cylinderGeometry args={[5.08, 5.08, 20, 20]} />
              <meshStandardMaterial color={palette.grain} roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
      <Dryer position={[x + 26, 0, z - 10]} />
      <Scale position={[x - 6, 0, z + 26]} />
      <group ref={pile} position={[x + 30, 0, z + 16]}>
        <mesh position={[0, 3, 0]} castShadow>
          <coneGeometry args={[9, 6, 10]} />
          <meshStandardMaterial color={palette.cropDry} roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
