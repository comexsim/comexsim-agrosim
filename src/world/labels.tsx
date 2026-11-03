"use client";

// Copiado del kit de escena de @comexsim/ui 0.9.0-rc.5 (ADR-001 de este repo).
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { OrthographicCamera, SRGBColorSpace, type Sprite } from "three";

import { useWorld } from "./context";
import type { GroupProps } from "./primitives";

export type TagTone = "mine" | "alert" | "plain";

function drawChip(text: string, fill: string, ink: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;
  const font = "700 40px 'Hanken Grotesk', 'Segoe UI', sans-serif";
  context.font = font;
  const width = Math.ceil(context.measureText(text).width) + 44;
  canvas.width = width;
  canvas.height = 64;
  context.font = font;
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(0, 0, width, 64, 32);
  context.fill();
  context.fillStyle = ink;
  context.textBaseline = "middle";
  context.fillText(text, 22, 34);
  return { canvas, aspect: width / 64 };
}

/**
 * Etiqueta que mira a la cámara y mide lo mismo a cualquier acercamiento: verde para lo del
 * estudiante, dorada para un evento.
 */
export function WorldTag({
  text,
  tone = "plain",
  size = 0.032,
  ...props
}: GroupProps & { text: string; tone?: TagTone; size?: number }) {
  const { palette } = useWorld();
  const fill = tone === "mine" ? palette.mine : tone === "alert" ? palette.alert : palette.bg;
  const ink =
    tone === "plain" ? palette.fg : palette.night && tone === "mine" ? palette.dark : palette.bg;
  const chip = useMemo(() => drawChip(text, fill, ink), [text, fill, ink]);
  const sprite = useRef<Sprite>(null);
  // Con la cámara ortográfica, `sizeAttenuation` no actúa: se escala cada cuadro según cuánto mundo
  // entra en la pantalla, para que la etiqueta mida siempre `size` del alto visible.
  useFrame(({ camera }) => {
    const current = sprite.current;
    if (!current || !chip || !(camera instanceof OrthographicCamera)) return;
    const visible = (camera.top - camera.bottom) / camera.zoom;
    current.scale.set(size * visible * chip.aspect, size * visible, 1);
  });
  if (!chip) return null;
  return (
    <group {...props}>
      <sprite ref={sprite} scale={[size * chip.aspect, size, 1]} renderOrder={10}>
        <spriteMaterial depthTest={false} transparent sizeAttenuation={false}>
          <canvasTexture
            key={chip.canvas.width + text + fill}
            attach="map"
            args={[chip.canvas]}
            colorSpace={SRGBColorSpace}
          />
        </spriteMaterial>
      </sprite>
    </group>
  );
}
