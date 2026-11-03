"use client";

import { useTranslations } from "next-intl";

import { metrics } from "@/engine/campaign";
import { MetricCard } from "@/ui/MetricCard";

import { useAnimatedDay, useFormat } from "./hooks";
import styles from "./Hud.module.css";
import { MISSION, useMission } from "./store";

/** Indicadores vivos de la campaña: presupuesto, día, superficie, rendimiento, condición. */
export function Kpis() {
  const t = useTranslations("appBar");
  const { money, num } = useFormat();
  const campaign = useMission((state) => state.campaign);
  const timeline = useMission((state) => state.timeline);
  const day = useAnimatedDay(timeline);
  const m = metrics(MISSION, campaign);
  const budgetShare = Number(m.budgetLeft) / Number(MISSION.budget);
  const sown = campaign.answers.q07 !== undefined;

  return (
    <div className={styles.kpis}>
      <MetricCard
        label={t("budget")}
        value={money(m.budgetLeft)}
        progress={budgetShare}
        tone={budgetShare < 0.15 ? "bad" : budgetShare < 0.3 ? "warn" : "ok"}
      />
      <MetricCard
        label={t("day")}
        value={t("dayValue", { day: Math.round(day), total: MISSION.durationDays })}
        progress={day / MISSION.durationDays}
      />
      <MetricCard
        className={styles.optional}
        label={t("sown")}
        value={t("sownValue", { ha: sown ? num(m.sownHa, 1) : "0" })}
      />
      <MetricCard
        className={styles.optional}
        label={t("yield")}
        value={t("yieldValue", { value: num(m.yieldTHa, 1) })}
      />
      <MetricCard
        className={styles.optional}
        label={t("condition")}
        value={`${m.condition}/100`}
        progress={m.condition / 100}
        tone={m.condition < 60 ? "bad" : m.condition < 80 ? "warn" : "ok"}
      />
      <MetricCard
        className={styles.optional}
        label={t("production")}
        value={sown ? t("productionValue", { value: num(m.grossT) }) : "—"}
      />
    </div>
  );
}
