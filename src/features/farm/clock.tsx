"use client";

import { createContext, useContext } from "react";

import type { ActiveCue, FieldVisual } from "./visual";

/**
 * Lo que la escena lee en cada cuadro sin volver a renderizar React: el reloj de la animación, el
 * día de campaña (con decimales mientras avanza el tiempo) y lo que hay que mostrar.
 */
export interface SceneSource {
  now: () => number;
  day: () => number;
  visual: FieldVisual;
  cue: ActiveCue | null;
}

const SceneContext = createContext<SceneSource | null>(null);

export const SceneProvider = SceneContext.Provider;

export function useScene(): SceneSource {
  const value = useContext(SceneContext);
  if (!value) throw new Error("useScene debe usarse dentro de <FarmScene>");
  return value;
}
