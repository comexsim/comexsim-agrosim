import { describe, expect, it } from "vitest";

import { formatDecimal, formatInteger, formatMoney, formatNumber, formatUsd } from "./format";

describe("formatUsd", () => {
  it("agrupa miles según el idioma", () => {
    expect(formatUsd("92000", "es")).toBe("USD 92.000");
    expect(formatUsd("92000", "en")).toBe("USD 92,000");
    expect(formatUsd("1250000", "es")).toBe("USD 1.250.000");
  });

  it("no agrega separador a montos de menos de mil", () => {
    expect(formatUsd("850", "es")).toBe("USD 850");
  });

  it("rechaza montos que no son enteros positivos", () => {
    expect(() => formatUsd("92.5", "es")).toThrow();
    expect(() => formatUsd("-10", "es")).toThrow();
  });
});

describe("formatDecimal", () => {
  it("usa coma decimal en español y punto en inglés", () => {
    expect(formatDecimal("37.3", "es")).toBe("37,3");
    expect(formatDecimal("37.3", "en")).toBe("37.3");
  });

  it("agrupa miles y respeta los enteros", () => {
    expect(formatDecimal("1250.5", "es")).toBe("1.250,5");
    expect(formatDecimal("76", "es")).toBe("76");
  });

  it("rechaza textos que no son cantidades", () => {
    expect(() => formatDecimal("abc", "es")).toThrow();
  });
});

describe("formatInteger", () => {
  it("agrupa miles según el idioma", () => {
    expect(formatInteger(18000, "es")).toBe("18.000");
    expect(formatInteger(18000, "en")).toBe("18,000");
  });

  it("rechaza decimales y negativos", () => {
    expect(() => formatInteger(1.5, "es")).toThrow();
    expect(() => formatInteger(-1, "es")).toThrow();
  });
});

describe("montos con signo y números", () => {
  it("formatea montos negativos y positivos", () => {
    expect(formatMoney("-1200", "es")).toBe("−USD 1.200");
    expect(formatMoney("50670", "en")).toBe("USD 50,670");
  });

  it("formatea con decimales fijos según el idioma", () => {
    expect(formatNumber(2.36, "es", 2)).toBe("2,36");
    expect(formatNumber(4000, "es")).toBe("4.000");
    expect(formatNumber(291.06, "en", 1)).toBe("291.1");
  });
});
