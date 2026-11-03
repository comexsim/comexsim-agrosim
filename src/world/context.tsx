"use client";

// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo): se reconcilia al
// promover las piezas de granja al design system.
import { createContext, useContext, useEffect, useState, type RefObject } from "react";
import { MeshStandardMaterial } from "three";

import { readWorldPalette, type WorldPalette } from "./palette";

/**
 * Lo que comparten las piezas del mundo 2.0 (ADR-019): la paleta del tema y si hay que moverse
 * menos. Va por contexto para que cada pieza no relea el CSS.
 */
export interface WorldContextValue {
  palette: WorldPalette;
  reducedMotion: boolean;
}

const WorldContext = createContext<WorldContextValue | null>(null);

export const WorldContextProvider = WorldContext.Provider;

export function useWorld(): WorldContextValue {
  const value = useContext(WorldContext);
  if (!value) throw new Error("useWorld debe usarse dentro de <WorldStage>");
  return value;
}

/** Relee la paleta cuando cambia el tema (atributo `data-theme` o preferencia del sistema). */
export function useWorldPalette(ref: RefObject<HTMLElement | null>): WorldPalette | null {
  const [palette, setPalette] = useState<WorldPalette | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setPalette(readWorldPalette(element));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, [ref]);
  return palette;
}

export interface SurfaceOptions {
  rough?: number;
  metal?: number;
  /** Se enciende de noche (ventanas, faroles): brillo propio con el color de la luz. */
  glow?: boolean;
}

const materials = new Map<string, MeshStandardMaterial>();

/**
 * Un material por color y acabado, compartido por todas las piezas: un puerto con cientos de
 * mallas compila una decena de programas en vez de cientos (60 FPS en una GPU integrada).
 */
export function surface(
  color: string,
  options: SurfaceOptions = {},
  night = false,
): MeshStandardMaterial {
  const { rough = 0.82, metal = 0, glow = false } = options;
  const lit = glow && night;
  const key = `${color}|${rough}|${metal}|${lit ? 1 : 0}`;
  const cached = materials.get(key);
  if (cached) return cached;
  const material = new MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    emissive: lit ? color : "#000000",
    emissiveIntensity: lit ? 1.6 : 0,
  });
  materials.set(key, material);
  return material;
}

/** Atajo para las piezas: el material de un color con la hora del día del mundo. */
export function useSurface(): (color: string, options?: SurfaceOptions) => MeshStandardMaterial {
  const { palette } = useWorld();
  return (color, options) => surface(color, options, palette.night);
}
