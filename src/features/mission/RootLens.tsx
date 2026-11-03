"use client";

import { useTranslations } from "next-intl";

import styles from "./Hud.module.css";
import { useMission } from "./store";

/** Raíces con nódulos (fijas, sin azar): las que aparecen según cómo se trató la semilla. */
const NODULES = [
  [54, 74],
  [70, 92],
  [44, 104],
  [88, 70],
  [100, 98],
  [62, 124],
  [116, 84],
  [80, 130],
  [128, 112],
  [36, 136],
  [108, 140],
  [94, 116],
];

/**
 * Lupa sobre las raíces durante la inoculación (q06): los nódulos aparecen de a uno si se
 * inoculó; casi ninguno si no.
 */
export function RootLens() {
  const t = useTranslations("decisions.q06");
  const cue = useMission((state) => state.cue);
  const phase = useMission((state) => state.phase);
  if (cue?.id !== "inoculate" || (phase !== "play" && phase !== "feedback")) return null;
  const good = cue.key === "b";
  const shown = good ? NODULES : NODULES.slice(0, 2);

  return (
    <figure className={styles.lens} aria-label={t("lens")}>
      <svg viewBox="0 0 160 170" role="img" aria-hidden="true">
        <rect x="0" y="0" width="160" height="40" className={styles.lensSky} />
        <rect x="0" y="40" width="160" height="130" className={styles.lensSoil} />
        <path d="M80 6 C78 20 82 30 80 40" className={styles.lensStem} />
        <path d="M80 40 C78 70 84 100 80 160" className={styles.lensRoot} />
        <path d="M80 60 C66 66 52 72 36 92" className={styles.lensRoot} />
        <path d="M80 70 C96 74 112 82 124 104" className={styles.lensRoot} />
        <path d="M80 96 C66 104 52 120 40 140" className={styles.lensRoot} />
        <path d="M81 104 C96 112 110 124 116 148" className={styles.lensRoot} />
        {shown.map(([x, y], i) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="5"
            className={styles.lensNodule}
            style={{ animationDelay: `${400 + i * 220}ms` }}
          />
        ))}
      </svg>
      <figcaption>
        <b>{t("lens")}</b>
        <span>{good ? t("nodules") : t("fewNodules")}</span>
      </figcaption>
    </figure>
  );
}
