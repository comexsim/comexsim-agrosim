import { describe, expect, it } from "vitest";

import { samplePath } from "@/world/path";

import {
  CLOSEUP,
  FIELD,
  FIELD_PASSES,
  inCloseup,
  passPath,
  PEST_SECTOR,
  plantGrid,
  PASSES,
} from "./layout";

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

describe("parche del primer plano", () => {
  it("queda dentro del lote y del sector de las orugas, con tres hileras de plantas", () => {
    expect(CLOSEUP.x[0]).toBeGreaterThanOrEqual(PEST_SECTOR.x[0]);
    expect(CLOSEUP.x[1]).toBeLessThanOrEqual(PEST_SECTOR.x[1]);
    expect(CLOSEUP.z[0]).toBeGreaterThanOrEqual(PEST_SECTOR.z[0]);
    expect(CLOSEUP.z[1]).toBeLessThanOrEqual(PEST_SECTOR.z[1]);
    const patch = plantGrid().filter((spot) => inCloseup(spot.x, spot.z));
    expect(new Set(patch.map((spot) => spot.row)).size).toBe(3);
    expect(patch.length).toBeLessThanOrEqual(24);
  });
});
