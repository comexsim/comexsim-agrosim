import { describe, expect, it } from "vitest";

import { FIELD_PASSES } from "./layout";
import { cueSegments, CUE_DURATION, FAST_FACTOR, NORMAL_SEGMENTS, segmentsDuration } from "./cues";
import { cueAccelerated, cueBoundaries, cueProgress, elapsedFor, type ActiveCue } from "./visual";

/** Largo de un recorrido de maqueta. */
function pathLength(points: readonly (readonly number[])[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [ax = 0, , az = 0] = points[i - 1] ?? [];
    const [bx = 0, , bz = 0] = points[i] ?? [];
    total += Math.hypot(bx - ax, bz - az);
  }
  return total;
}

function cue(segments: ActiveCue["segments"], startedAt = 1000): ActiveCue {
  return {
    id: "sow",
    decision: "q07",
    key: "b",
    quality: "best",
    startedAt,
    duration: segmentsDuration(segments ?? []),
    segments,
  };
}

describe("velocidad de las animaciones", () => {
  it("en normal, la sembradora trabaja a paso creíble antes del tiempo acelerado", () => {
    const [live] = cueSegments("sow", "normal");
    const metersPerSecond = (pathLength(FIELD_PASSES) * (live?.to ?? 0)) / ((live?.ms ?? 1) / 1000);
    // Antes recorría unos 120 m de maqueta por segundo; ahora, alrededor de 18.
    expect(metersPerSecond).toBeLessThan(25);
    expect(metersPerSecond).toBeGreaterThan(10);
  });

  it("todos los tramos normales terminan el trabajo y avanzan sin retroceder", () => {
    for (const segments of Object.values(NORMAL_SEGMENTS)) {
      const list = segments ?? [];
      expect(list.at(-1)?.to).toBe(1);
      list.reduce((from, segment) => {
        expect(segment.to).toBeGreaterThanOrEqual(from);
        return segment.to;
      }, 0);
    }
  });

  it("en rápida, el paso es continuo y más corto que su referencia", () => {
    const segments = cueSegments("sow", "fast");
    expect(segments).toHaveLength(1);
    expect(segmentsDuration(segments)).toBe(Math.round((CUE_DURATION.sow ?? 0) * FAST_FACTOR));
  });

  it("los pasos sin tramos propios usan su duración de referencia en normal", () => {
    expect(cueSegments("dryer", "normal")).toEqual([{ ms: CUE_DURATION.dryer, to: 1 }]);
  });

  it("el avance sigue los tramos y marca el tiempo acelerado", () => {
    const active = cue([
      { ms: 8000, to: 0.1 },
      { ms: 2000, to: 1, fast: true },
    ]);
    expect(cueProgress(active, 1000)).toBe(0);
    expect(cueProgress(active, 5000)).toBeCloseTo(0.05);
    expect(cueProgress(active, 10000)).toBeCloseTo(0.55);
    expect(cueProgress(active, 20000)).toBe(1);
    expect(cueAccelerated(active, 5000)).toBe(false);
    expect(cueAccelerated(active, 10000)).toBe(true);
    expect(cueAccelerated(active, 20000)).toBe(false);
    expect(cueBoundaries(active)).toEqual([9000]);
  });

  it("encuentra el instante de un avance para retomar desde donde iba", () => {
    const segments = [
      { ms: 8000, to: 0.1 },
      { ms: 2000, to: 1, fast: true },
    ];
    expect(elapsedFor(segments, 0.05)).toBeCloseTo(4000);
    expect(elapsedFor(segments, 0.55)).toBeCloseTo(9000);
    expect(elapsedFor(segments, 1)).toBeCloseTo(10000);
    expect(elapsedFor([{ ms: 6000, to: 1 }], 0.5)).toBeCloseTo(3000);
  });
});
