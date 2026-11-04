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
