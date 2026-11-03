"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

import type { CueId, DecisionId } from "@/engine/types";
import type { Vec3 } from "@/world/camera";
import { useWorld } from "@/world/context";
import { WorldTag } from "@/world/labels";
import { Person } from "@/world/nature";
import { samplePath } from "@/world/path";

import { BagStack, SampleFlag } from "./buildings";
import { useScene } from "./clock";
import { Clouds, GrainLosses, Rain, RiskMap, SprayMist } from "./effects";
import {
  ACOPIO_TO_PLANT,
  FIELD,
  FIELD_PASSES,
  FIELD_TO_ACOPIO,
  passPath,
  PEST_SECTOR,
  SAMPLE_POINTS,
  YARD,
} from "./layout";
import { BagTruck, Combine, Drone, GrainTruck, Mover, Sprayer, TractorWith } from "./machines";
import { stepProgress } from "./visual";

export interface SceneLabels {
  noAnalysis: string;
  noSeed: string;
  threshold: string;
  moisture: string;
  rain: string;
}

/** Del camino al casco de la finca (los camiones de insumos). */
const ROAD_TO_YARD: Vec3[] = [
  [-280, 0, 90],
  [YARD[0] + 30, 0, 90],
  [YARD[0] + 30, 0, YARD[2] + 14],
  [YARD[0] + 14, 0, YARD[2] + 14],
];

const SCOUT_PATH: Vec3[] = [
  [-FIELD.width / 2 - 6, 0, -10],
  [-30, 0, -10],
  [20, 0, -30],
  [PEST_SECTOR.x[0] + 10, 0, -40],
];

const PEST_PASSES = passPath(PEST_SECTOR.x, PEST_SECTOR.z, 3, 4);

function useStep() {
  const scene = useScene();
  return {
    scene,
    progress: (decision: DecisionId) =>
      stepProgress(scene.visual, scene.cue, decision, scene.now()),
    /** La animación de esta decisión está en curso con este paso. */
    playing: (decision: DecisionId, cue?: CueId) => {
      const active = scene.cue;
      if (!active || active.decision !== decision || (cue && active.id !== cue)) return false;
      return scene.now() - active.startedAt < active.duration;
    },
  };
}

/** Todos los actores de la campaña; cada uno decide si aparece según el paso en curso. */
export function Actors({ labels }: { labels: SceneLabels }) {
  const { palette } = useWorld();
  const { scene, progress, playing } = useStep();
  const { visual } = scene;
  const sownShare = visual.sownShare;

  return (
    <>
      {/* q01 · muestreo de suelo */}
      <Mover
        path={SAMPLE_POINTS}
        progress={() => progress("q01")}
        visible={() => playing("q01", "sampling")}
      >
        <Person shirt={palette.mine} scale={4.5} />
      </Mover>
      <SampleFlags />
      {visual.answered.includes("q01") &&
      scene.cue?.decision === "q01" &&
      scene.cue.quality !== "best" ? (
        <WorldTag text={labels.noAnalysis} tone="alert" position={[0, 14, 0]} />
      ) : null}

      {/* q02 · fertilizante: llega el camión y la fertilizadora recorre el lote */}
      <Mover
        path={ROAD_TO_YARD}
        progress={() => Math.min(progress("q02") / 0.35, 1)}
        visible={() => playing("q02") && progress("q02") < 0.35}
      >
        <BagTruck cab={palette.truck} bag={palette.paint} scale={1.6} />
      </Mover>
      <Mover
        path={FIELD_PASSES}
        progress={() => Math.max((progress("q02") - 0.35) / 0.65, 0)}
        visible={() => playing("q02") && progress("q02") >= 0.35}
      >
        <TractorWith implement="spreader" color={palette.mine} scale={2.4} />
      </Mover>
      {visual.bags > 0 ? (
        <BagStack
          bags={visual.bags}
          color={palette.paint}
          position={[YARD[0] - 6, 0, YARD[2] + 16]}
        />
      ) : null}

      {/* q03 · preparación: rastra (labranza) o pulverizadora (barbecho de la siembra directa) */}
      <Mover
        path={FIELD_PASSES}
        progress={() => progress("q03")}
        visible={() => playing("q03", "till")}
      >
        <TractorWith implement="harrow" color={palette.mine} scale={2.4} />
      </Mover>
      <Mover
        path={FIELD_PASSES}
        progress={() => progress("q03")}
        visible={() => playing("q03", "notill")}
      >
        <group scale={2.4}>
          <Sprayer color={palette.mine} />
          <SprayMist active={() => playing("q03", "notill")} />
        </group>
      </Mover>

      {/* q04 · llegan las bolsas de semilla */}
      <Mover path={ROAD_TO_YARD} progress={() => progress("q04")} visible={() => playing("q04")}>
        <BagTruck
          cab={palette.truck}
          bag={scene.cue?.quality === "best" ? palette.mine : palette.straw}
          scale={1.6}
        />
      </Mover>
      {visual.answered.includes("q04") && !visual.answered.includes("q07") ? (
        <BagStack bags={120} color={palette.straw} position={[YARD[0] - 6, 0, YARD[2] + 24]} />
      ) : null}

      {/* q05 y q06 · la sembradora espera en el casco con la tolva cargada */}
      {visual.answered.includes("q04") && !visual.answered.includes("q07") ? (
        <TractorWith
          implement="seeder"
          color={palette.mine}
          scale={1.7}
          position={[YARD[0] + 16, 0, YARD[2] - 2]}
        />
      ) : null}

      {/* q07 · siembra: la sembradora recorre el lote hasta donde alcanza la semilla */}
      <Mover
        path={FIELD_PASSES}
        progress={() => Math.min(progress("q07"), sownShare)}
        visible={() => playing("q07")}
      >
        <TractorWith implement="seeder" color={palette.mine} scale={2.4} />
      </Mover>
      {sownShare < 1 && visual.answered.includes("q07") && !visual.answered.includes("q14") ? (
        <WorldTag text={labels.noSeed} tone="alert" position={[60, 10, 50]} />
      ) : null}

      {/* q08, q09, q10, q11 · pulverizadora en todo el lote */}
      <Mover
        path={FIELD_PASSES}
        progress={() => {
          const cue = scene.cue;
          return cue ? progress(cue.decision) : 0;
        }}
        visible={() => {
          const cue = scene.cue;
          return (
            !!cue && (cue.id === "spray-weeds" || cue.id === "spray-all") && playing(cue.decision)
          );
        }}
      >
        <group scale={2.4}>
          <Sprayer color={palette.mine} />
          <SprayMist active={() => true} />
        </group>
      </Mover>

      {/* q09 y q10 · el técnico recorre el lote */}
      <Mover
        path={SCOUT_PATH}
        progress={() => {
          const cue = scene.cue;
          return cue ? progress(cue.decision) : 0;
        }}
        visible={() => {
          const cue = scene.cue;
          return (
            !!cue && (cue.decision === "q09" || cue.decision === "q10") && playing(cue.decision)
          );
        }}
      >
        <Person shirt={palette.mine} scale={4.5} />
      </Mover>
      <PestMarker label={labels.threshold} />
      <Mover
        path={PEST_PASSES}
        progress={() => progress("q10")}
        visible={() => playing("q10", "spray-spot")}
      >
        <group scale={2.2}>
          <Sprayer color={palette.mine} />
          <SprayMist active={() => true} />
        </group>
      </Mover>

      {/* q11 · el dron sobrevuela y deja el mapa de riesgo */}
      <Mover path={FIELD_PASSES} progress={() => progress("q11")} visible={() => playing("q11")}>
        <Drone color={palette.mine} scale={3.6} position={[0, 18, 0]} />
      </Mover>
      <RiskMap
        reveal={() => {
          const day = scene.day();
          return day >= 70 && day < 96 ? progress("q11") : 0;
        }}
        controlled={() => visual.rust === "controlled" || visual.rust === "blanket"}
      />

      {/* Lluvia del evento y nubes de la cosecha */}
      <Rain active={() => isRaining(scene.day(), visual.rained, scene.cue?.decision === "q11")} />
      <Clouds
        active={() => {
          const day = scene.day();
          return (
            (day >= 93 && day < 100) || (day >= 109 && day < 113) || scene.cue?.decision === "q11"
          );
        }}
      />
      {scene.cue?.decision === "q12" || (!visual.answered.includes("q12") && scene.day() >= 109) ? (
        <WorldTag text={labels.moisture} tone="alert" position={[-20, 12, 10]} />
      ) : null}

      {/* q14 · cosecha */}
      <Harvester />
      <GrainLosses
        harvested={() => Math.min(progress("q14"), sownShare)}
        density={visual.harvestLoss === "high" ? 0.6 : 0.08}
      />

      {/* q15 · camiones al acopio */}
      {Array.from({ length: Math.min(visual.trips, 10) }, (_, i) => (
        <Mover
          key={i}
          path={FIELD_TO_ACOPIO}
          progress={() => Math.min(Math.max(progress("q15") * 1.8 - i * 0.09, 0), 1)}
          visible={() => {
            const p = progress("q15") * 1.8 - i * 0.09;
            return playing("q15") && p > 0 && p < 1;
          }}
        >
          <GrainTruck cab={palette.truck} scale={2} />
        </Mover>
      ))}

      {/* q17 · venta: los camiones llevan el grano a la planta aceitera */}
      {[0, 1, 2].map((i) => (
        <Mover
          key={i}
          path={ACOPIO_TO_PLANT}
          progress={() => Math.min(Math.max(progress("q17") * 1.5 - i * 0.18, 0), 1)}
          visible={() => {
            const p = progress("q17") * 1.5 - i * 0.18;
            return playing("q17") && p > 0 && p < 1;
          }}
        >
          <GrainTruck cab={palette.truck} scale={2} />
        </Mover>
      ))}
      {visual.rained && scene.cue?.decision === "q11" ? (
        <WorldTag text={labels.rain} tone="alert" position={[0, 30, 0]} />
      ) : null}
    </>
  );
}

function isRaining(day: number, rained: boolean, eventShown: boolean): boolean {
  return (day >= 94 && day < 99) || (rained && eventShown);
}

/** Banderines del muestreo: aparecen a medida que el técnico pasa y quedan hasta la siembra. */
function SampleFlags() {
  const { palette } = useWorld();
  const { scene, progress } = useStep();
  const flags = useRef<Group>(null);
  useFrame(() => {
    const group = flags.current;
    if (!group) return;
    const done = progress("q01");
    const best =
      scene.visual.answered.includes("q01") &&
      (scene.cue?.decision !== "q01" || scene.cue.quality === "best");
    const sampled = scene.cue?.decision === "q01" ? scene.cue.quality === "best" : best;
    group.children.forEach((flag, i) => {
      flag.visible = sampled && scene.day() < 12 && done >= i / SAMPLE_POINTS.length;
    });
  });
  return (
    <group ref={flags}>
      {SAMPLE_POINTS.map((point) => (
        <SampleFlag key={point.join(",")} color={palette.alert} position={point} scale={3.4} />
      ))}
    </group>
  );
}

/** Marca del sector con orugas: un anillo dorado mientras se decide qué hacer. */
function PestMarker({ label }: { label: string }) {
  const { palette } = useWorld();
  const { scene } = useStep();
  const ring = useRef<Mesh>(null);
  const cx = (PEST_SECTOR.x[0] + PEST_SECTOR.x[1]) / 2;
  const cz = (PEST_SECTOR.z[0] + PEST_SECTOR.z[1]) / 2;
  const visible =
    scene.cue?.decision === "q10" ||
    (!scene.visual.answered.includes("q10") && scene.day() >= 53 && scene.day() < 60);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.04);
  });
  if (!visible) return null;
  return (
    <group position={[cx, 0, cz]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 5, 0]}>
        <ringGeometry args={[26, 28, 48]} />
        <meshBasicMaterial color={palette.alert} transparent opacity={0.85} />
      </mesh>
      <WorldTag text={label} tone="alert" position={[0, 12, 0]} />
    </group>
  );
}

/** Cosechadora en zigzag con la tolva que se llena y se descarga cada dos pasadas. */
function Harvester() {
  const { palette } = useWorld();
  const { scene, progress, playing } = useStep();
  const group = useRef<Group>(null);
  const hopper = useRef<Mesh>(null);
  useFrame(() => {
    const current = group.current;
    if (!current) return;
    current.visible = playing("q14");
    if (!current.visible) return;
    const p = Math.min(progress("q14"), scene.visual.sownShare);
    const sample = samplePath(FIELD_PASSES, p);
    current.position.set(...sample.position);
    current.rotation.y = sample.heading;
    const cycle = (p * 4) % 1;
    hopper.current?.scale.set(2.8, Math.max(cycle * 1.3, 0.05), 2.2);
  });
  return (
    <group ref={group}>
      <Combine ref={hopper} color={palette.contractor} scale={2.6} />
    </group>
  );
}
