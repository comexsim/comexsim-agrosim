"use client";

// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo).
import { useSyncExternalStore } from "react";

/** Renderizadores por software: con ellos no se llega a 60 FPS y se usa el respaldo 2D. */
export function isSoftwareRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(renderer);
}

function hardwareWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    return !isSoftwareRenderer(renderer);
  } catch {
    return false;
  }
}

let support: boolean | undefined;
function cachedSupport(): boolean {
  support ??= hardwareWebGL();
  return support;
}
const noSubscription = () => () => undefined;

/** `true` con GPU, `false` sin ella, `null` en el servidor (todavía no se sabe). */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noSubscription, cachedSupport, () => null);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
