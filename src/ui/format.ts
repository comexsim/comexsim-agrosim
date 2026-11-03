type Locale = "es" | "en";

const THOUSANDS: Record<Locale, string> = { es: ".", en: "," };
const DECIMAL: Record<Locale, string> = { es: ",", en: "." };

function groupThousands(digits: string, locale: Locale): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS[locale]);
}

/**
 * Formatea un monto entero en dólares sin pasar por `number`, para no perder
 * exactitud: "92000" → "USD 92.000" (es) o "USD 92,000" (en).
 */
export function formatUsd(amount: string, locale: Locale): string {
  if (!/^\d+$/.test(amount)) throw new Error(`Monto inválido: ${amount}`);
  return `USD ${groupThousands(amount, locale)}`;
}

/** Cantidad decimal escrita como texto ("37.3") con los separadores del idioma. */
export function formatDecimal(value: string, locale: Locale): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error(`Cantidad inválida: ${value}`);
  const [, whole = "", fraction] = match;
  const grouped = groupThousands(whole, locale);
  return fraction ? `${grouped}${DECIMAL[locale]}${fraction}` : grouped;
}

/** Entero con separador de miles del idioma: 18000 → "18.000" (es). */
export function formatInteger(value: number, locale: Locale): string {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Entero inválido: ${value}`);
  return groupThousands(String(value), locale);
}

/** Monto entero con signo: "-1200" → "−USD 1.200" (es). */
export function formatMoney(amount: string, locale: Locale): string {
  const negative = amount.startsWith("-");
  return `${negative ? "−" : ""}${formatUsd(negative ? amount.slice(1) : amount, locale)}`;
}

/** Número con decimales fijos y los separadores del idioma: 2.36 → "2,36" (es). */
export function formatNumber(value: number, locale: Locale, digits = 0): string {
  const fixed = Math.abs(value).toFixed(digits);
  return `${value < 0 ? "−" : ""}${formatDecimal(fixed, locale)}`;
}
