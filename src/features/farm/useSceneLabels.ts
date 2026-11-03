"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { FarmLabels } from "./FarmScene";

/** Textos que la escena dibuja en el mundo (letreros y avisos), ya traducidos. */
export function useSceneLabels(): FarmLabels {
  const t = useTranslations("scene");
  return useMemo(
    () => ({
      scene: t("label"),
      yard: t("yard"),
      field: t("field"),
      acopio: t("acopio"),
      plant: t("plant"),
      noAnalysis: t("noAnalysis"),
      noSeed: t("noSeed"),
      threshold: t("threshold"),
      moisture: t("moisture"),
      rain: t("rain"),
    }),
    [t],
  );
}
