"use client";

import { useWorld } from "@/world/context";
import { Box, Cylinder, type GroupProps } from "@/world/primitives";

/** Construcciones de la finca, el acopio y la planta aceitera, con primitivas. */

/** Galpón con techo a dos aguas, abierto al frente (+X). */
export function Shed({
  width = 24,
  depth = 16,
  height = 7,
  ...props
}: GroupProps & { width?: number; depth?: number; height?: number }) {
  const { palette } = useWorld();
  const slope = Math.atan2(3, depth / 2);
  const rafter = Math.hypot(3, depth / 2) + 0.6;
  return (
    <group {...props}>
      <Box size={[width, height, 0.4]} at={[0, 0, -depth / 2]} color={palette.wall} />
      <Box size={[width, height, 0.4]} at={[0, 0, depth / 2]} color={palette.wall} />
      <Box size={[0.4, height, depth]} at={[-width / 2, 0, 0]} color={palette.wall2} />
      <Box
        size={[width + 1, 0.3, rafter]}
        at={[0, height + 1.4, -depth / 4]}
        rotation={[slope, 0, 0]}
        color={palette.roofMetal}
        metal={0.3}
        rough={0.5}
      />
      <Box
        size={[width + 1, 0.3, rafter]}
        at={[0, height + 1.4, depth / 4]}
        rotation={[-slope, 0, 0]}
        color={palette.roofMetal}
        metal={0.3}
        rough={0.5}
      />
      <Box
        size={[width - 1, 0.05, depth - 1]}
        at={[0, 0.02, 0]}
        color={palette.gravel}
        shadow={false}
      />
    </group>
  );
}

export function House(props: GroupProps) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[10, 4, 8]} color={palette.wall} />
      <Box size={[11, 1.2, 9]} at={[0, 4, 0]} color={palette.roof} />
      <Box size={[1.4, 1.2, 0.1]} at={[2, 1.8, 4.02]} color={palette.window} glow />
      <Box size={[1.4, 1.2, 0.1]} at={[-2, 1.8, 4.02]} color={palette.window} glow />
    </group>
  );
}

/** Silo con techo cónico; `fill` (0–1) pinta la franja de nivel de grano. */
export function Silo({
  radius = 4,
  height = 12,
  fill = 0,
  ...props
}: GroupProps & { radius?: number; height?: number; fill?: number }) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Cylinder
        radius={radius}
        height={height}
        color={palette.steel}
        metal={0.12}
        rough={0.45}
        segments={20}
      />
      <Cylinder
        radius={radius + 0.2}
        top={0.5}
        height={radius * 0.7}
        at={[0, height, 0]}
        color={palette.roofMetal}
        metal={0.12}
        rough={0.45}
        segments={20}
      />
      {fill > 0 ? (
        <Cylinder
          radius={radius + 0.05}
          height={Math.max(height * fill, 0.1)}
          color={palette.grain}
          rough={0.8}
          segments={20}
        />
      ) : null}
      {Array.from({ length: 4 }, (_, i) => (
        <Cylinder
          key={i}
          radius={radius + 0.12}
          height={0.18}
          at={[0, (height / 4) * (i + 0.5), 0]}
          color={palette.roofMetal}
          segments={20}
        />
      ))}
    </group>
  );
}

/** Pila de bolsas en tarimas: una caja por cada 20 bolsas, en filas de cinco. */
export function BagStack({ bags, color, ...props }: GroupProps & { bags: number; color: string }) {
  const stacks = Math.ceil(bags / 20);
  return (
    <group {...props}>
      {Array.from({ length: stacks }, (_, i) => (
        <Box
          key={i}
          size={[1.8, 1.4, 1.8]}
          at={[(i % 5) * 2.1, 0, Math.floor(i / 5) * 2.1]}
          color={color}
          rough={0.95}
        />
      ))}
    </group>
  );
}

/** Secadora de grano: torre con quemador y conductos. */
export function Dryer(props: GroupProps) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[4, 18, 4]} color={palette.steel} metal={0.4} rough={0.5} />
      <Box size={[5, 1.2, 5]} at={[0, 18, 0]} color={palette.roofMetal} />
      <Box size={[3, 4, 3]} at={[3.5, 0, 0]} color={palette.contractor} />
      <Cylinder
        radius={0.35}
        height={14}
        at={[-2.6, 4, 0]}
        color={palette.steel}
        rotation={[0, 0, 0.35]}
      />
    </group>
  );
}

/** Balanza camionera con su caseta. */
export function Scale(props: GroupProps) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[18, 0.35, 4]} color={palette.asphalt} />
      <Box size={[4, 3.2, 3.6]} at={[0, 0, -4.6]} color={palette.wall} />
      <Box size={[4.4, 0.4, 4]} at={[0, 3.2, -4.6]} color={palette.roof} />
      <Box size={[1.6, 1, 0.08]} at={[0, 1.5, -2.76]} color={palette.window} glow />
    </group>
  );
}

/** Planta aceitera: nave de molienda, tanques de aceite, chimenea y silos de recepción. */
export function OilPlant(props: GroupProps) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Box size={[34, 14, 20]} color={palette.wall} />
      <Box size={[35, 1, 21]} at={[0, 14, 0]} color={palette.roofMetal} metal={0.3} />
      <Box size={[12, 8, 14]} at={[-20, 0, 2]} color={palette.wall2} />
      <Cylinder radius={1.4} height={26} at={[10, 0, -6]} color={palette.wall2} />
      <Cylinder radius={1.6} height={1.2} at={[10, 26, -6]} color={palette.truck} />
      {[-12, -4, 4].map((x) => (
        <Cylinder
          key={x}
          radius={3.2}
          height={7}
          at={[x, 0, 18]}
          color={palette.paint}
          metal={0.3}
          rough={0.4}
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Box
          key={i}
          size={[3, 1.6, 0.1]}
          at={[-13 + i * 5.2, 7, 10.02]}
          color={palette.window}
          glow
        />
      ))}
    </group>
  );
}

/** Estaca de muestreo con banderín. */
export function SampleFlag({ color, ...props }: GroupProps & { color: string }) {
  const { palette } = useWorld();
  return (
    <group {...props}>
      <Cylinder radius={0.1} height={3} color={palette.wall} segments={6} />
      <Box size={[1.2, 0.7, 0.06]} at={[0.6, 2.2, 0]} color={color} shadow={false} />
    </group>
  );
}
