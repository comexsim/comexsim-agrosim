"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group, Mesh } from "three";

import type { CueId, DecisionId } from "@/engine/types";
import type { Locale } from "@/i18n/locale";
import { formatNumber } from "@/ui/format";
import type { Vec3 } from "@/world/camera";
import { useWorld } from "@/world/context";
import { WorldTag } from "@/world/labels";
import { Person } from "@/world/nature";
import { Box } from "@/world/primitives";
import { samplePath } from "@/world/path";

import { BagStack, SampleFlag } from "./buildings";
import { useScene } from "./clock";
import { Clouds, Dust, GrainLosses, Rain, RiskMap, SprayMist } from "./effects";
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
import { trackVehicle } from "./follow";
import { stepProgress } from "./visual";

export interface SceneLabels {
  tagTechnician: string;
  tagSpreader: string;
  tagHarrow: string;
  tagSprayer: string;
  tagSeeder: string;
  tagDrone: string;
  tagCombine: string;
  tagTrucks: string;
  tagSale: string;
  tagInputs: string;
  hopper: string;
  sample: string;
  grainMoisture: string;
  locale: Locale;
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
  [PEST_SECTOR.x[0] - 10, 0, -40],
];

const PEST_PASSES = passPath(PEST_SECTOR.x, PEST_SECTOR.z, 3, 4);
/** En la aplicación focalizada, primero monitorea el técnico y después entra la pulverizadora. */
const SCOUT_SHARE = 0.4;

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
        track
        path={SAMPLE_POINTS}
        progress={() => progress("q01")}
        visible={() => playing("q01", "sampling")}
      >
        <Person shirt={palette.mine} scale={4.5} />
        <WorldTag text={labels.tagTechnician} tone="mine" position={[0, 13, 0]} />
      </Mover>
      <SampleFlags />
      {visual.answered.includes("q01") &&
      scene.cue?.decision === "q01" &&
      scene.cue.quality !== "best" ? (
        <WorldTag text={labels.noAnalysis} tone="alert" position={[0, 14, 0]} />
      ) : null}

      {/* q02 · fertilizante: llega el camión y la fertilizadora recorre el lote */}
      <Mover
        track
        path={ROAD_TO_YARD}
        progress={() => Math.min(progress("q02") / 0.35, 1)}
        visible={() => playing("q02") && progress("q02") < 0.35}
      >
        <BagTruck cab={palette.truck} bag={palette.paint} scale={1.6} />
        <WorldTag text={labels.tagInputs} position={[0, 10, 0]} />
      </Mover>
      <Mover
        track
        path={FIELD_PASSES}
        progress={() => Math.max((progress("q02") - 0.35) / 0.65, 0)}
        visible={() => playing("q02") && progress("q02") >= 0.35}
      >
        <TractorWith implement="spreader" color={palette.mine} scale={2.4} />
        <Dust spread={8} />
        <WorldTag text={labels.tagSpreader} tone="mine" position={[0, 16, 0]} />
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
        track
        path={FIELD_PASSES}
        progress={() => progress("q03")}
        visible={() => playing("q03", "till")}
      >
        <TractorWith implement="harrow" color={palette.mine} scale={2.4} />
        <Dust spread={20} />
        <WorldTag text={labels.tagHarrow} tone="mine" position={[0, 16, 0]} />
      </Mover>
      <Mover
        track
        path={FIELD_PASSES}
        progress={() => progress("q03")}
        visible={() => playing("q03", "notill")}
      >
        <group scale={2.4}>
          <Sprayer color={palette.mine} />
          <SprayMist active={() => playing("q03", "notill")} />
        </group>
        <WorldTag text={labels.tagSprayer} tone="mine" position={[0, 16, 0]} />
      </Mover>

      {/* q04 · llegan las bolsas de semilla */}
      <Mover
        track
        path={ROAD_TO_YARD}
        progress={() => progress("q04")}
        visible={() => playing("q04")}
      >
        <BagTruck
          cab={palette.truck}
          bag={scene.cue?.quality === "best" ? palette.mine : palette.straw}
          scale={1.6}
        />
        <WorldTag text={labels.tagInputs} position={[0, 10, 0]} />
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

      {/* q05 · se carga la tolva: el operario lleva las bolsas y el contador suma los kilos */}
      <Mover
        path={LOADING_PATH}
        progress={() => (Math.sin(progress("q05") * Math.PI * 7 - Math.PI / 2) + 1) / 2}
        visible={() => playing("q05")}
      >
        <Person shirt={palette.mine} scale={2.6} />
        <Box size={[0.9, 0.6, 0.9]} at={[0.6, 3.6, 0]} color={palette.straw} />
      </Mover>
      {playing("q05") ? (
        <CounterTag
          position={[YARD[0] + 16, 13, YARD[2] - 2]}
          progress={() => progress("q05")}
          text={(p) =>
            `${labels.hopper}: ${formatNumber(Math.round((visual.seedKg * p) / 100) * 100, labels.locale)} kg`
          }
        />
      ) : null}

      {/* q06 · el técnico trata la semilla junto a la sembradora */}
      {playing("q06") ? (
        <group position={[YARD[0] + 10, 0, YARD[2] + 6]}>
          <Person shirt={palette.mine} scale={2.6} />
          <WorldTag text={labels.tagTechnician} tone="mine" position={[0, 8, 0]} />
        </group>
      ) : null}

      {/* q07 · siembra: la sembradora recorre el lote hasta donde alcanza la semilla */}
      <Mover
        track
        path={FIELD_PASSES}
        progress={() => Math.min(progress("q07"), sownShare)}
        visible={() => playing("q07")}
      >
        <TractorWith implement="seeder" color={palette.mine} scale={2.4} />
        <Dust spread={24} />
        <WorldTag text={labels.tagSeeder} tone="mine" position={[0, 16, 0]} />
      </Mover>
      {sownShare < 1 && visual.answered.includes("q07") && !visual.answered.includes("q14") ? (
        <WorldTag text={labels.noSeed} tone="alert" position={[60, 10, 50]} />
      ) : null}

      {/* q08, q09, q10, q11 · pulverizadora en todo el lote */}
      <Mover
        track
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
        <WorldTag text={labels.tagSprayer} tone="mine" position={[0, 16, 0]} />
      </Mover>

      {/* q09 y q10 · el técnico recorre el lote */}
      <Mover
        track
        path={SCOUT_PATH}
        progress={() => {
          const cue = scene.cue;
          if (!cue) return 0;
          const p = progress(cue.decision);
          return cue.id === "spray-spot" ? Math.min(p / SCOUT_SHARE, 1) : p;
        }}
        visible={() => {
          // Solo cuando se decidió monitorear: si se aplica, sale la pulverizadora sin el técnico.
          const cue = scene.cue;
          if (!cue || !playing(cue.decision)) return false;
          if (cue.id === "scout") return true;
          return cue.id === "spray-spot" && progress(cue.decision) < SCOUT_SHARE;
        }}
      >
        <Person shirt={palette.mine} scale={4.5} />
        <WorldTag text={labels.tagTechnician} tone="mine" position={[0, 13, 0]} />
      </Mover>
      <PestMarker label={labels.threshold} />
      <Mover
        track
        path={PEST_PASSES}
        progress={() => Math.max((progress("q10") - SCOUT_SHARE) / (1 - SCOUT_SHARE), 0)}
        visible={() => playing("q10", "spray-spot") && progress("q10") >= SCOUT_SHARE}
      >
        <group scale={2.2}>
          <Sprayer color={palette.mine} />
          <SprayMist active={() => true} />
        </group>
        <WorldTag text={labels.tagSprayer} tone="mine" position={[0, 16, 0]} />
      </Mover>

      {/* q11 · el dron sobrevuela y deja el mapa de riesgo */}
      <Mover
        track
        path={FIELD_PASSES}
        progress={() => progress("q11")}
        visible={() => playing("q11")}
      >
        <Drone color={palette.mine} scale={3.6} position={[0, 18, 0]} />
        <WorldTag text={labels.tagDrone} tone="mine" position={[0, 28, 0]} />
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
      {(scene.cue?.decision === "q12" && scene.cue.quality !== "best") ||
      (!visual.answered.includes("q12") && scene.day() >= 109) ? (
        <WorldTag text={labels.moisture} tone="alert" position={[-20, 12, 10]} />
      ) : null}

      {/* q12 · si se espera, la humedad del grano baja día a día hasta el rango comercial */}
      {playing("q12", "harvest-ready") && scene.cue?.quality === "best" ? (
        <CounterTag
          position={[-20, 16, 10]}
          tone="alert"
          progress={() => progress("q12")}
          text={(p) => `${labels.grainMoisture}: ${formatNumber(18 - 4.5 * p, labels.locale, 1)} %`}
        />
      ) : null}

      {/* q13 · el técnico mide un metro de surco y estima el rendimiento */}
      {playing("q13") ? (
        <group position={[-30, 0, 20]}>
          <Person shirt={palette.mine} scale={4.5} />
          <Box size={[9, 0.12, 0.5]} at={[5.5, 0.4, 0]} color={palette.contractor} shadow={false} />
          <CounterTag
            position={[0, 16, 0]}
            progress={() => progress("q13")}
            text={(p) =>
              `${labels.sample}: ${formatNumber(visual.yieldTHa * Math.min(p * 1.4, 1), labels.locale, 1)} t/ha`
            }
          />
        </group>
      ) : null}

      {/* q14 · cosecha */}
      <Harvester label={labels.tagCombine} />
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
          {i === 0 ? <WorldTag text={labels.tagTrucks} position={[0, 13, 0]} /> : null}
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
          {i === 0 ? <WorldTag text={labels.tagSale} position={[0, 13, 0]} /> : null}
        </Mover>
      ))}
      {visual.rained && scene.cue?.decision === "q11" ? (
        <WorldTag text={labels.rain} tone="alert" position={[0, 30, 0]} />
      ) : null}
    </>
  );
}

/** Del galpón a la sembradora: el operario carga las bolsas de semilla. */
const LOADING_PATH: Vec3[] = [
  [YARD[0] - 4, 0, YARD[2] + 22],
  [YARD[0] + 12, 0, YARD[2] + 2],
];

/**
 * Etiqueta con un número que avanza con la animación (kilos, humedad, t/ha). Solo vuelve a
 * dibujar el texto cuando cambia, para no rehacer la textura cada cuadro.
 */
function CounterTag({
  text,
  progress,
  position,
  tone = "mine",
}: {
  text: (progress: number) => string;
  progress: () => number;
  position: Vec3;
  tone?: "mine" | "alert";
}) {
  const [label, setLabel] = useState(() => text(0));
  useFrame(() => {
    const next = text(Math.min(Math.max(progress(), 0), 1));
    if (next !== label) setLabel(next);
  });
  return <WorldTag text={label} tone={tone} position={position} />;
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
function Harvester({ label }: { label: string }) {
  const { palette } = useWorld();
  const { scene, progress, playing } = useStep();
  const group = useRef<Group>(null);
  const hopper = useRef<Mesh>(null);
  useFrame(() => {
    const current = group.current;
    if (!current) return;
    current.visible = playing("q14");
    trackVehicle(current, current.visible);
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
      <Dust spread={22} color="grain" />
      <WorldTag text={label} position={[0, 20, 0]} />
    </group>
  );
}
