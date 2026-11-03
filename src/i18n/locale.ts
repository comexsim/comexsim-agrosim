/** Idiomas de la interfaz; español por defecto. */
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

/** Cookie con el idioma elegido por el usuario. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function parseLocale(value: string | undefined): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Guarda el idioma elegido; el servidor lo lee en la siguiente petición. */
export function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
