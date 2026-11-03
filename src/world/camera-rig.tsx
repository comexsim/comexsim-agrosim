"use client";

// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo): se reconcilia al
// promover las piezas de granja al design system.
import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Vector3, type Object3D } from "three";

import {
  flightDuration,
  flightShot,
  followEase,
  shotPosition,
  shotZoom,
  type CameraShot,
} from "./camera";

export interface CameraRigProps {
  /** Plano al que vuela la cámara; al cambiarlo, vuela con aceleración suave (o corta). */
  shot: CameraShot;
  /** Vehículo a seguir: la cámara mantiene el plano pero con el centro en él. */
  follow?: RefObject<Object3D | null>;
  /** Corta en lugar de volar (preferencia «reducir movimiento»). */
  reducedMotion: boolean;
  /** Permite girar un poco y acercar con el mouse o el dedo. */
  interactive?: boolean;
}

type Flight = { from: CameraShot; to: CameraShot; elapsed: number; duration: number };

const ROTATE_RANGE = 0.45;

function shotKey(shot: CameraShot): string {
  return `${shot.target.join(",")}|${shot.azimuth}|${shot.polar}|${shot.span}`;
}

/** Ubica la cámara en un plano, sin transición (los vuelos se animan cuadro a cuadro). */
function applyShot(control: CameraControls, shot: CameraShot, width: number, height: number) {
  const [px, py, pz] = shotPosition(shot);
  const [tx, ty, tz] = shot.target;
  void control.setLookAt(px, py, pz, tx, ty, tz, false);
  void control.zoomTo(shotZoom(shot.span, width, height), false);
}
const POLAR_RANGE = 0.22;

/**
 * Cámara por estaciones del mundo 2.0 (ADR-019, D6): drei `CameraControls` para mirar y acercar,
 * y los vuelos entre planos con las funciones puras de `camera.ts` (se alejan un poco a mitad de
 * camino para que se lea el recorrido). Siguiendo a un vehículo, el centro lo acompaña con
 * suavizado exponencial.
 */
export function CameraRig({ shot, follow, reducedMotion, interactive = true }: CameraRigProps) {
  const controls = useRef<CameraControls>(null);
  const size = useThree((state) => state.size);
  const current = useRef<CameraShot>(shot);
  const flight = useRef<Flight | null>(null);
  const followed = useRef(new Vector3());

  const apply = useCallback(
    (next: CameraShot) => {
      const control = controls.current;
      if (!control) return;
      applyShot(control, next, size.width, size.height);
      current.current = next;
    },
    [size.width, size.height],
  );

  // El plano llega como objeto nuevo en cada render; se compara por valor con una clave.
  const key = shotKey(shot);
  const latest = useRef(shot);
  useEffect(() => {
    latest.current = shot;
  });

  // Al montar y al cambiar el tamaño: el plano actual, sin vuelo.
  useEffect(() => {
    apply(current.current);
  }, [apply]);

  // Al cambiar de plano: vuelo (o corte con movimiento reducido).
  useEffect(() => {
    const next = latest.current;
    if (reducedMotion) {
      flight.current = null;
      apply(next);
      return;
    }
    const from = current.current;
    flight.current = { from, to: next, elapsed: 0, duration: flightDuration(from, next) };
  }, [key, reducedMotion, apply]);

  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    control.minAzimuthAngle = shot.azimuth - ROTATE_RANGE;
    control.maxAzimuthAngle = shot.azimuth + ROTATE_RANGE;
    control.minPolarAngle = Math.max(shot.polar - POLAR_RANGE, 0.2);
    control.maxPolarAngle = Math.min(shot.polar + POLAR_RANGE, 1.35);
  }, [shot.azimuth, shot.polar]);

  useFrame((_, delta) => {
    const active = flight.current;
    if (active) {
      active.elapsed += delta;
      const t = Math.min(active.elapsed / active.duration, 1);
      apply(flightShot(active.from, active.to, t));
      if (t >= 1) flight.current = null;
      return;
    }
    const vehicle = follow?.current;
    const control = controls.current;
    if (!vehicle || !control) return;
    vehicle.getWorldPosition(followed.current);
    const target = control.getTarget(new Vector3());
    const k = reducedMotion ? 1 : followEase(delta);
    void control.moveTo(
      target.x + (followed.current.x - target.x) * k,
      target.y + (followed.current.y - target.y) * k,
      target.z + (followed.current.z - target.z) * k,
      false,
    );
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={interactive}
      smoothTime={0.35}
      // Sin desplazar: la cámara siempre mira la estación; solo gira un poco y acerca.
      truckSpeed={0}
      minZoom={0.5}
      maxZoom={60}
    />
  );
}
