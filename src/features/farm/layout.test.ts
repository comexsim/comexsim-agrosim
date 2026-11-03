import { describe, expect, it } from "vitest";

import { samplePath } from "@/world/path";

import { FIELD, FIELD_PASSES, passPath, plantGrid, PASSES } from "./layout";

describe("trazado del lote", () => {
  const grid = plantGrid();

  it("llena el lote con hileras dentro de sus bordes", () => {
    expect(grid.length).toBeGreaterThan(3000);
    for (const spot of grid) {
      expect(Math.abs(spot.x)).toBeLessThan(FIELD.width / 2);
      expect(Math.abs(spot.z)).toBeLessThan(FIELD.depth / 2);
    }
  });

  it("el orden de siembra recorre [0, 1) sin repetir", () => {
    const orders = grid.map((spot) => spot.order);
    expect(Math.min(...orders)).toBe(0);
    expect(Math.max(...orders)).toBeLessThan(1);
  });

  it("lo que la máquina ya recorrió coincide con lo sembrado (primera pasada hacia +X)", () => {
    const machine = samplePath(FIELD_PASSES, 0.5 / PASSES);
    const behind = grid.filter((spot) => spot.order < 0.5 / PASSES);
    expect(behind.every((spot) => spot.x <= machine.position[0] + 8)).toBe(true);
  });

  it("el zigzag alterna el sentido de cada pasada", () => {
    const path = passPath([0, 10], [0, 4], 2, 0);
    expect(path).toEqual([
      [0, 0, 1],
      [10, 0, 1],
      [10, 0, 3],
      [0, 0, 3],
    ]);
  });
});
