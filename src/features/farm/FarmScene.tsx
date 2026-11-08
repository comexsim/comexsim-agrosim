"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { BoxGeometry, Object3D, type InstancedMesh } from "three";
import type { Group } from "three";

import type { StationId } from "@/engine/types";
import type { Vec3 } from "@/world/camera";
import { useSurface, useWorld } from "@/world/context";
import { WorldTag } from "@/world/labels";
import { Ground, Road, TreeRow } from "@/world/nature";
import { loopProgress } from "@/world/path";
import { Box, Cylinder } from "@/world/primitives";
import { WorldStage, type WorldInsets } from "@/world/stage";

import { Actors, type SceneLabels } from "./Actors";
import { Dryer, House, OilPlant, Scale, Shed, Silo } from "./buildings";
import { SceneProvider, useScene, type SceneSource } from "./clock";
import { ACOPIO, FIELD, PLANT, ROAD, ROAD_Z, SHOTS, YARD } from "./layout";
import { BagTruck, GrainTruck, Mover, Sprayer, TractorWith } from "./machines";
import { followTarget } from "./follow";
import { MacroPlot } from "./MacroPlot";
import { SoyField } from "./SoyField";
import { stepProgress } from "./visual";

export interface FarmLabels extends SceneLabels {
  scene: string;
  yard: string;
  field: string;
  acopio: string;
  plant: string;
  closeup: string;
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
      follow={followTarget}
      insets={insets}
      interactive={interactive}
      fallback={fallback}
    >
      <SceneProvider value={source}>
        <Landscape labels={labels} tags={station !== "result"} />
        <Fence />
        <PowerLine />
        <RoadTraffic />
        <SoyField />
        <Yard />
        <Acopio />
        <OilPlant position={PLANT} />
        <Actors labels={labels} />
        {station === "macro" ? <MacroPlot labels={labels} /> : null}
      </SceneProvider>
    </WorldStage>
  );
}

function Landscape({ labels, tags }: { labels: FarmLabels; tags: boolean }) {
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
      {tags ? (
        <>
          <WorldTag text={labels.field} tone="mine" position={[0, 22, -halfD]} />
          <WorldTag text={labels.yard} position={[YARD[0], 22, YARD[2] - 12]} />
          <WorldTag text={labels.acopio} position={[ACOPIO[0], 34, ACOPIO[2] - 16]} />
          <WorldTag text={labels.plant} position={[PLANT[0], 36, PLANT[2] - 8]} />
        </>
      ) : null}
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

const FENCE_X = FIELD.width / 2 + 13;
const FENCE_Z = FIELD.depth / 2 + 13;
/** El cerco deja abierta la salida de los camiones de la cosecha, en la esquina sureste. */
const GATE_X = FIELD.width / 2 - 2;
const POST_STEP = 9;
const postGeometry = new BoxGeometry(0.5, 2.2, 0.5);

/** Cerco bajo alrededor del lote: postes y un alambre, para que la finca tenga límites. */
function Fence() {
  const { palette } = useWorld();
  const material = useSurface()(palette.trunk);
  const mesh = useRef<InstancedMesh>(null);
  const posts = useMemo(() => {
    const spots: [number, number][] = [];
    for (let x = -FENCE_X; x <= FENCE_X; x += POST_STEP) {
      spots.push([x, -FENCE_Z]);
      if (x < GATE_X) spots.push([x, FENCE_Z]);
    }
    for (let z = -FENCE_Z + POST_STEP; z < FENCE_Z; z += POST_STEP) {
      spots.push([-FENCE_X, z], [FENCE_X, z]);
    }
    return spots;
  }, []);
  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const place = new Object3D();
    posts.forEach(([x, z], i) => {
      place.position.set(x, 1.1, z);
      place.updateMatrix();
      instanced.setMatrixAt(i, place.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  }, [posts]);
  return (
    <group>
      <instancedMesh
        ref={mesh}
        args={[postGeometry, material, posts.length]}
        frustumCulled={false}
      />
      <Box
        size={[FENCE_X * 2, 0.12, 0.12]}
        at={[0, 1.8, -FENCE_Z]}
        color={palette.wall2}
        shadow={false}
      />
      <Box
        size={[FENCE_X + GATE_X, 0.12, 0.12]}
        at={[(GATE_X - FENCE_X) / 2, 1.8, FENCE_Z]}
        color={palette.wall2}
        shadow={false}
      />
      <Box
        size={[0.12, 0.12, FENCE_Z * 2]}
        at={[-FENCE_X, 1.8, 0]}
        color={palette.wall2}
        shadow={false}
      />
      <Box
        size={[0.12, 0.12, FENCE_Z * 2]}
        at={[FENCE_X, 1.8, 0]}
        color={palette.wall2}
        shadow={false}
      />
    </group>
  );
}

/** Postes de luz a lo largo del camino. */
function PowerLine() {
  const { palette } = useWorld();
  const xs = useMemo(() => {
    const spots: number[] = [];
    for (let x = ROAD.from + 30; x < ROAD.to; x += 62) spots.push(x);
    return spots;
  }, []);
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, 0, ROAD_Z + 9]}>
          <Cylinder radius={0.3} height={13} color={palette.trunk} segments={6} />
          <Box size={[0.3, 0.3, 4.4]} at={[0, 11.6, 0]} color={palette.trunk} shadow={false} />
        </group>
      ))}
      <Box
        size={[ROAD.to - ROAD.from, 0.08, 0.08]}
        at={[(ROAD.from + ROAD.to) / 2, 11.9, ROAD_Z + 9]}
        color={palette.dark}
        shadow={false}
      />
    </group>
  );
}

const TRAFFIC_LANE = ROAD_Z + 2;
const TRAFFIC_SPEED = 11;

/** Tráfico ajeno por el carril de afuera, para que el mundo no esté quieto entre decisiones. */
function RoadTraffic() {
  const { palette } = useWorld();
  const scene = useScene();
  const length = ROAD.to - ROAD.from;
  const forward = useMemo<Vec3[]>(
    () => [
      [ROAD.from, 0, TRAFFIC_LANE],
      [ROAD.to, 0, TRAFFIC_LANE],
    ],
    [],
  );
  const progress = (offset: number) => () =>
    loopProgress(scene.now() / 1000, length, TRAFFIC_SPEED, offset);
  return (
    <>
      <Mover path={forward} progress={progress(0.1)}>
        <GrainTruck cab={palette.contractor} scale={1.5} />
      </Mover>
      <Mover path={forward} progress={progress(0.45)}>
        <BagTruck cab={palette.shirt} bag={palette.wall2} scale={1.5} />
      </Mover>
      <Mover path={forward} progress={progress(0.8)}>
        <GrainTruck cab={palette.truck} scale={1.5} />
      </Mover>
    </>
  );
}
