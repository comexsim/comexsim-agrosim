import { describe, expect, it } from "vitest";

import { cropLook, phaseAt } from "./growth";

describe("fenología del lote", () => {
  it("no hay plantas antes de la emergencia", () => {
    expect(cropLook(10)).toEqual({ phase: "bare", height: 0, ripeness: 0, bloom: 0 });
  });

  it("recorre las fases en orden a lo largo de la campaña", () => {
    expect([15, 30, 50, 70, 90, 103, 115].map(phaseAt)).toEqual([
      "emergence",
      "vegetative",
      "flowering",
      "pods",
      "filling",
      "maturity",
      "dry",
    ]);
  });

  it("crece hasta el máximo, florece a mitad de ciclo y se seca al final", () => {
    expect(cropLook(80).height).toBeCloseTo(1);
    expect(cropLook(56).bloom).toBeGreaterThan(0.9);
    expect(cropLook(90).ripeness).toBe(0);
    expect(cropLook(118).ripeness).toBe(2);
  });
});
