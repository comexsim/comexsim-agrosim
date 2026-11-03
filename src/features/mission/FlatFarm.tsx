"use client";

import { useTranslations } from "next-intl";

import { phaseAt } from "@/engine/growth";

import styles from "./Hud.module.css";

/**
 * Respaldo 2D sin GPU (AGENTS §0): vista cenital de la finca con el lote coloreado según la fase
 * del cultivo. Mantiene la lectura del recorrido aunque no haya 3D.
 */
export function FlatFarm({ day, harvested }: { day: number; harvested: boolean }) {
  const t = useTranslations("scene");
  const phase = harvested ? "bare" : phaseAt(day);
  return (
    <div className={styles.flat}>
      <svg viewBox="0 0 400 240" role="img" aria-label={t("label")}>
        <rect width="400" height="240" className={styles.flatGrass} />
        <rect x="20" y="200" width="370" height="12" className={styles.flatRoad} />
        <rect
          x="110"
          y="40"
          width="190"
          height="140"
          rx="4"
          className={styles.flatField}
          data-phase={phase}
        />
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="116"
            x2="294"
            y1={50 + i * 11}
            y2={50 + i * 11}
            className={styles.flatRow}
          />
        ))}
        <rect x="30" y="70" width="50" height="40" className={styles.flatBuilding} />
        <circle cx="330" cy="90" r="12" className={styles.flatSilo} />
        <circle cx="356" cy="90" r="12" className={styles.flatSilo} />
        <text x="205" y="30" textAnchor="middle" className={styles.flatLabel}>
          {t("field")} · {t(`phase.${phase}`)}
        </text>
        <text x="55" y="128" textAnchor="middle" className={styles.flatLabel}>
          {t("yard")}
        </text>
        <text x="343" y="122" textAnchor="middle" className={styles.flatLabel}>
          {t("acopio")}
        </text>
      </svg>
      <p>{t("fallback")}</p>
    </div>
  );
}
