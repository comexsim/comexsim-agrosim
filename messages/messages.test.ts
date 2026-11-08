import { describe, expect, it } from "vitest";

import en from "./en.json";
import es from "./es.json";

/** Rutas de todas las hojas del árbol de mensajes, para comparar idiomas. */
function leafPaths(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object" || Array.isArray(node)) return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    leafPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("mensajes de la interfaz", () => {
  it("es y en tienen exactamente las mismas claves", () => {
    expect(leafPaths(en).sort()).toEqual(leafPaths(es).sort());
  });

  it("ningún texto queda vacío", () => {
    const empty = [es, en].flatMap((tree) =>
      leafPaths(tree).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], tree);
        return typeof value === "string" && value.trim() === "";
      }),
    );
    expect(empty).toEqual([]);
  });
});

describe("textos de la misión", () => {
  it("cada decisión del banco tiene título, enunciado y aprendizaje en ambos idiomas", async () => {
    const { AGRO_001 } = await import("@/data/agro-001");
    for (const tree of [es, en]) {
      for (const decision of AGRO_001.decisions) {
        const texts = (tree.decisions as Record<string, Record<string, string>>)[decision.id];
        expect(texts?.title, decision.id).toBeTruthy();
        expect(texts?.prompt, decision.id).toBeTruthy();
        expect(texts?.learn, decision.id).toBeTruthy();
      }
    }
  });
});

describe("redacción de las opciones", () => {
  it("la opción recomendada no es casi siempre la más larga (no se adivina por el largo)", async () => {
    const { AGRO_001 } = await import("@/data/agro-001");
    for (const tree of [es, en]) {
      const texts = tree.decisions as Record<string, Record<string, string>>;
      let longest = 0;
      let total = 0;
      for (const decision of AGRO_001.decisions) {
        if (decision.kind !== "choice") continue;
        const own = texts[decision.id] ?? {};
        const best = decision.options.find((option) => option.quality === "best")?.key ?? "a";
        const lengths = decision.options.map((option) => (own[option.key] ?? "").length);
        total += 1;
        if ((own[best] ?? "").length === Math.max(...lengths)) longest += 1;
      }
      expect(longest / total).toBeLessThanOrEqual(0.25);
    }
  });
});
