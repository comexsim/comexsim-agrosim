"use client";

import { useTranslations } from "next-intl";

import { IconButton } from "@/ui/IconButton";
import { MoonIcon, SunIcon } from "@/ui/icons";

import { oppositeTheme } from "./theme";
import { setTheme, useTheme } from "./use-theme";

export function ThemeToggle() {
  const t = useTranslations("appBar");
  const theme = useTheme();
  const next = oppositeTheme(theme);
  return (
    <IconButton
      aria-label={next === "dark" ? t("themeToDark") : t("themeToLight")}
      onClick={() => setTheme(next)}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
