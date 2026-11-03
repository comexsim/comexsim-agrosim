"use client";

// Adaptado del `WorldStage` de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo): sin Tailwind y con
// la sombra ajustada al tamaño de la finca.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { NeutralToneMapping, SRGBColorSpace, type DirectionalLight, type Object3D } from "three";

import { CAMERA_DISTANCE, shotPosition, type CameraShot } from "./camera";
import { CameraRig } from "./camera-rig";
import { useWorldPalette, WorldContextProvider } from "./context";
import type { WorldPalette } from "./palette";
import { initialDpr, nextDpr, shouldDropAmbientOcclusion } from "./quality";
import { prefersReducedMotion, useWebGLSupport } from "./runtime";

export interface WorldInsets {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface WorldStageProps {
  /** Nombre accesible de la escena. */
  label: string;
  /** Plano de cámara; al cambiarlo, la cámara vuela a él. */
  shot: CameraShot;
  /** Vehículo que la cámara sigue. */
  follow?: RefObject<Object3D | null>;
  /** Oclusión ambiental, SMAA y tono neutro. */
  effects?: boolean;
  /** Permite girar un poco y acercar. */
  interactive?: boolean;
  /** Lo que se muestra sin GPU (el respaldo 2D). */
  fallback?: ReactNode;
  /** Píxeles que tapan los paneles: el centro de la vista se corre al espacio libre. */
  insets?: WorldInsets;
  children: ReactNode;
}

/**
 * Escenario del mundo: cámara ortográfica por estaciones, luz de día o de noche según el tema,
 * sombras suaves que siguen a la cámara, N8AO, SMAA y tono neutro. Mide los FPS: baja la densidad
 * de píxeles y, si aun así no llega, apaga la oclusión ambiental.
 */
export function WorldStage({
  label,
  shot,
  follow,
  effects = true,
  interactive = true,
  fallback = null,
  insets,
  children,
}: WorldStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const support = useWebGLSupport();
  const palette = useWorldPalette(host);
  const reducedMotion = useMemo(() => (support ? prefersReducedMotion() : false), [support]);
  const [ready, setReady] = useState(false);
  const [ambientOcclusion, setAmbientOcclusion] = useState(true);

  if (support === false) return <>{fallback}</>;

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {support && palette ? (
        <Canvas
          orthographic
          shadows
          dpr={[1, 2]}
          frameloop={ready ? "always" : "never"}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          camera={{ position: shotPosition(shot), zoom: 4, near: 1, far: CAMERA_DISTANCE * 4 }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = SRGBColorSpace;
            gl.toneMapping = NeutralToneMapping;
            gl.debug.checkShaderErrors = false;
          }}
        >
          <WorldContextProvider value={{ palette, reducedMotion }}>
            <Sky palette={palette} />
            <Lights palette={palette} />
            <CameraRig
              shot={shot}
              follow={follow}
              reducedMotion={reducedMotion}
              interactive={interactive}
            />
            {children}
            <ViewOffset insets={insets} />
            <Warmup onReady={setReady} />
            <Quality onDropAmbientOcclusion={() => setAmbientOcclusion(false)} />
          </WorldContextProvider>
          <EffectComposer enabled={effects} multisampling={0}>
            <N8AO
              enabled={ambientOcclusion}
              halfRes
              quality="performance"
              aoRadius={5}
              distanceFalloff={1}
              intensity={palette.night ? 2 : 3}
              color={palette.dark}
            />
            <SMAA />
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          </EffectComposer>
        </Canvas>
      ) : null}
    </div>
  );
}

/** Cielo y niebla: el horizonte se funde con el borde del mundo, sin cortes. */
function Sky({ palette }: { palette: WorldPalette }) {
  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.horizon, CAMERA_DISTANCE + 160, CAMERA_DISTANCE + 900]} />
    </>
  );
}

const SUN_OFFSET: [number, number, number] = [-90, 160, -70];
const MOON_OFFSET: [number, number, number] = [110, 170, -60];

/** Sol (o luna) con sombras que siguen al centro de la cámara. */
function Lights({ palette }: { palette: WorldPalette }) {
  const sun = useRef<DirectionalLight>(null);
  const controls = useThree((state) => state.controls) as unknown as {
    getTarget?: (out: { x: number; y: number; z: number }) => { x: number; y: number; z: number };
  } | null;
  const offset = palette.night ? MOON_OFFSET : SUN_OFFSET;
  const point = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);

  useFrame(() => {
    const light = sun.current;
    if (!light) return;
    const target = controls?.getTarget?.(point) ?? point;
    light.position.set(target.x + offset[0], target.y + offset[1], target.z + offset[2]);
    light.target.position.set(target.x, target.y, target.z);
    light.target.updateMatrixWorld();
  });

  return (
    <>
      <hemisphereLight args={[palette.sky, palette.soil, palette.night ? 0.95 : 1.5]} />
      <directionalLight
        ref={sun}
        color={palette.light}
        intensity={palette.night ? 1.1 : 2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-camera-near={10}
        shadow-camera-far={520}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={3}
      />
    </>
  );
}

/** Corre el centro de la proyección al espacio libre entre los paneles (`setViewOffset`). */
function ViewOffset({ insets }: { insets?: WorldInsets }) {
  const applied = useRef("");
  useFrame(({ camera, size }) => {
    const x = -((insets?.left ?? 0) - (insets?.right ?? 0)) / 2;
    const y = -((insets?.top ?? 0) - (insets?.bottom ?? 0)) / 2;
    const key = `${size.width}x${size.height}:${x},${y}`;
    if (key === applied.current) return;
    applied.current = key;
    if (x === 0 && y === 0) camera.clearViewOffset();
    else camera.setViewOffset(size.width, size.height, x, y, size.width, size.height);
    camera.updateProjectionMatrix();
  });
  return null;
}

/** Compila los materiales antes del primer cuadro, para que el movimiento empiece sin saltos. */
function Warmup({ onReady }: { onReady: (ready: boolean) => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    let mounted = true;
    const start = () => {
      if (mounted) onReady(true);
    };
    gl.compileAsync(scene, camera).then(start, start);
    return () => {
      mounted = false;
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

const WARM_UP = 1.5;

/** Calidad adaptable: baja la densidad y, en la mínima, avisa para apagar N8AO. */
function Quality({ onDropAmbientOcclusion }: { onDropAmbientOcclusion: () => void }) {
  const setDpr = useThree((state) => state.setDpr);
  const meter = useRef({ elapsed: 0, frames: 0, time: 0, dpr: 0, dropped: false });
  useFrame((_, delta) => {
    const state = meter.current;
    if (state.dpr === 0) state.dpr = initialDpr(window.devicePixelRatio);
    state.elapsed += delta;
    if (state.elapsed < WARM_UP) return;
    state.frames += 1;
    state.time += delta;
    if (state.time < 1) return;
    const fps = state.frames / state.time;
    state.frames = 0;
    state.time = 0;
    if (!state.dropped && shouldDropAmbientOcclusion(state.dpr, fps)) {
      state.dropped = true;
      onDropAmbientOcclusion();
      return;
    }
    const next = nextDpr(state.dpr, fps);
    if (next === state.dpr) return;
    state.dpr = next;
    setDpr(next);
  });
  return null;
}
