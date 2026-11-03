export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Cookie con el modo elegido; la lee el servidor para pintar sin parpadeo. */
export const THEME_COOKIE = "agrosim-theme";

export function parseTheme(value: string | undefined): Theme | null {
  return THEMES.find((theme) => theme === value) ?? null;
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/**
 * Corre antes del primer pintado: si el usuario aún no eligió un modo, sigue al
 * sistema operativo. Así el servidor puede pintar un modo por defecto sin parpadeo.
 */
export const themeInitScript = `(function(){try{if(!document.cookie.match(/(?:^|; )${THEME_COOKIE}=/)&&window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
