import { beforeEach, describe, expect, it } from "vitest";

import { cueProgress } from "@/features/farm/visual";

import { parseSpeed } from "./speed";
import { stationFor, useMission } from "./store";

describe("velocidad elegida", () => {
  beforeEach(() => {
    useMission.getState().restart();
    useMission.setState({ speed: "normal" });
  });

  it("lee solo valores conocidos y por defecto usa la normal", () => {
    expect(parseSpeed("fast")).toBe("fast");
    expect(parseSpeed("turbo")).toBe("normal");
    expect(parseSpeed(null)).toBe("normal");
  });

  it("la animación usa los tramos de la velocidad elegida", () => {
    const store = useMission.getState;
    store().begin(0);
    store().select("b");
    store().confirm(100);
    const normal = store().cue;
    expect(normal?.speed).toBe("normal");
    expect(normal?.segments?.length).toBeGreaterThan(1);
  });

  it("cambiar la velocidad a mitad de la animación sigue desde el mismo avance", () => {
    const store = useMission.getState;
    store().begin(0);
    store().select("b");
    store().confirm(0);
    const before = store().cue;
    if (!before) throw new Error("sin animación");
    const progress = cueProgress(before, 3000);
    store().setSpeed("fast", 3000);
    const after = store().cue;
    if (!after) throw new Error("sin animación");
    expect(after.speed).toBe("fast");
    expect(cueProgress(after, 3000)).toBeCloseTo(progress);
    expect(after.duration).not.toBe(before.duration);
  });

  it("la cámara sigue a la máquina a paso real y mira el lote en tiempo acelerado o en rápida", () => {
    const store = useMission.getState;
    store().begin(0);
    store().select("b");
    store().confirm(0);
    const { phase, campaign, last, cue } = store();
    expect(stationFor(phase, campaign, last, cue, false)).toBe("follow");
    expect(stationFor(phase, campaign, last, cue, true)).not.toBe("follow");
    store().setSpeed("fast", 10);
    const fast = store();
    expect(stationFor(fast.phase, fast.campaign, fast.last, fast.cue, false)).not.toBe("follow");
  });
});
