"use client";

import { useTranslations } from "next-intl";

import { cx } from "@/ui/cx";

import { useFormat } from "./hooks";
import styles from "./Hud.module.css";
import { useMission } from "./store";

/** Bitácora de la campaña: decisiones y eventos con su día y su gasto, lo último primero. */
export function Logbook() {
  const t = useTranslations();
  const { money } = useFormat();
  const log = useMission((state) => state.campaign.log);
  const entries = [...log].reverse();

  return (
    <section className={styles.log} aria-label={t("log.title")}>
      <h2 className={styles.logTitle}>{t("log.title")}</h2>
      <ol className={styles.logList}>
        {entries.map((entry, i) => (
          <li
            key={`${entry.day}-${entry.key}-${entries.length - i}`}
            className={cx(styles.logItem, entry.tone === "event" && styles.logEvent)}
            data-quality={entry.quality}
          >
            <span className={styles.logDay}>{t("log.dayLabel", { day: entry.day })}</span>
            <span className={styles.logText}>
              {entry.decision
                ? t(`decisions.${entry.decision}.title`)
                : entry.tone === "event"
                  ? t(`events.${entry.key}.title`)
                  : t(`log.${entry.key}`)}
            </span>
            {entry.cost && entry.cost !== "0" ? (
              <span className={styles.logCost}>{money(entry.cost)}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
