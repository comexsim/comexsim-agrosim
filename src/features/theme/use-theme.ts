"use client";

import { useSyncExternalStore } from "react";

import { parseTheme, THEME_COOKIE, type Theme } from "./theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  return parseTheme(document.documentElement.dataset.theme) ?? "light";
}

/** Modo actual, leído del `data-theme` de `<html>` (lo pone el servidor o el script inicial). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
