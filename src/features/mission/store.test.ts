import { beforeEach, describe, expect, it } from "vitest";

import { parseAttempts } from "./attempts";
import { dayAt, stationFor, useMission } from "./store";

describe("pantalla de la misión", () => {
  beforeEach(() => useMission.getState().restart());

  it("recorre briefing → decidir → animación → consecuencia → siguiente decisión", () => {
    const store = useMission.getState;
    store().begin(0);
    expect(store().phase).toBe("decide");
    store().confirm(10);
    expect(store().phase).toBe("decide");
    store().select("b");
    store().confirm(100);
    expect(store().phase).toBe("play");
    expect(store().cue).toMatchObject({ id: "sampling", decision: "q01", quality: "best" });
    store().reveal();
    expect(store().phase).toBe("feedback");
    store().next(9000);
    expect(store().phase).toBe("decide");
    expect(store().selected).toBeNull();
    expect(store().timeline).toMatchObject({ from: 1, to: 3 });
  });

  it("al terminar las 18 decisiones guarda el intento y muestra el informe", () => {
    const store = useMission.getState;
    store().begin(0);
    for (let i = 0; i < 18; i += 1) {
      store().select("b");
      store().confirm(i);
      store().reveal();
      store().next(i);
    }
    expect(store().phase).toBe("result");
    expect(store().attempts.length).toBeGreaterThan(0);
  });

  it("el día avanza con aceleración suave y la cámara sigue a la decisión", () => {
    expect(dayAt({ from: 10, to: 20, startedAt: 0, duration: 100 }, 50)).toBe(15);
    expect(dayAt({ from: 10, to: 20, startedAt: 0, duration: 100 }, 500)).toBe(20);
    const { campaign } = useMission.getState();
    expect(stationFor("briefing", campaign, null)).toBe("farm");
    expect(stationFor("decide", campaign, null)).toBe("field");
  });

  it("el Modo Presentación usa su semilla, no cuenta como intento y al salir vuelve a empezar", () => {
    const store = useMission.getState;
    store().startPresentation();
    store().hydrate();
    const before = store().attempts.length;
    expect(store().presenting).toBe(true);
    expect(store().campaign.seed).toBe(0);
    store().begin(0);
    for (let i = 0; i < 18; i += 1) {
      store().select("b");
      store().confirm(i);
      store().reveal();
      store().next(i);
    }
    expect(store().phase).toBe("result");
    expect(store().attempts).toHaveLength(before);
    store().stopPresentation();
    expect(store().presenting).toBe(false);
    expect(store().phase).toBe("briefing");
  });

  it("ignora un historial de intentos dañado", () => {
    expect(parseAttempts("no es json")).toEqual([]);
    expect(parseAttempts('[{"score":80,"profit":"100","best":[]},{"x":1}]')).toHaveLength(1);
  });
});
