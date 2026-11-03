"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/ui/Button";

import { useFormat } from "./hooks";
import styles from "./Overlay.module.css";
import { MISSION, useMission } from "./store";

/** Tarjeta de la misión antes de empezar, sobre la finca vista desde el aire. */
export function Briefing() {
  const t = useTranslations("briefing");
  const { money } = useFormat();
  const begin = useMission((state) => state.begin);
  const facts = [
    { label: t("area"), value: t("areaValue") },
    { label: t("budget"), value: money(MISSION.budget) },
    { label: t("duration"), value: t("durationValue") },
    { label: t("price"), value: t("priceValue") },
    { label: t("potential"), value: t("potentialValue") },
    { label: t("regional"), value: t("regionalValue") },
  ];

  return (
    <section className={styles.briefing} aria-labelledby="briefing-title">
      <span className={styles.eyebrow}>{t("eyebrow")}</span>
      <h1 id="briefing-title">{t("title")}</h1>
      <p className={styles.lead}>{t("body")}</p>
      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      <h2>{t("howTitle")}</h2>
      <ol className={styles.how}>
        <li>{t("how1")}</li>
        <li>{t("how2")}</li>
        <li>{t("how3")}</li>
      </ol>
      <p className={styles.disclaimer}>{t("disclaimer")}</p>
      <Button block onClick={() => begin(performance.now())}>
        {t("start")}
      </Button>
    </section>
  );
}
