"use client";

import { useTranslations } from "next-intl";

import { SPEEDS } from "@/features/farm/cues";

import styles from "./Hud.module.css";
import { useMission } from "./store";

/** Selector de la velocidad de las animaciones: normal (paso real) o rápida. */
export function SpeedSwitch() {
  const t = useTranslations("decision.speed");
  const speed = useMission((state) => state.speed);
  const setSpeed = useMission((state) => state.setSpeed);
  return (
    <div className={styles.speedRow}>
      <span>{t("label")}</span>
      <div className={styles.speedSwitch} role="group" aria-label={t("label")}>
        {SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === speed}
            onClick={() => setSpeed(option, performance.now())}
          >
            {t(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
