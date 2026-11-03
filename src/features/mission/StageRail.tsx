"use client";

import { useTranslations } from "next-intl";

import type { Quality, StageId } from "@/engine/types";
import { cx } from "@/ui/cx";
import { CheckIcon } from "@/ui/icons";

import styles from "./Hud.module.css";
import { MISSION, useMission } from "./store";

const STAGES: readonly StageId[] = ["soil", "sowing", "crop", "harvest", "postharvest", "market"];

/** Las seis etapas con un punto por decisión, coloreado según cómo se resolvió. */
export function StageRail() {
  const t = useTranslations();
  const campaign = useMission((state) => state.campaign);
  const current = MISSION.decisions[campaign.step]?.stage;
  const done = Object.keys(campaign.answers).length;

  return (
    <nav className={styles.rail} aria-label={t("rail.title")}>
      <h2 className={styles.railTitle}>{t("rail.title")}</h2>
      <ol>
        {STAGES.map((stage, index) => {
          const decisions = MISSION.decisions.filter((d) => d.stage === stage);
          const finished = decisions.every((d) => campaign.answers[d.id]);
          return (
            <li
              key={stage}
              className={cx(
                styles.stageItem,
                stage === current && styles.current,
                finished && styles.finished,
              )}
              aria-current={stage === current ? "step" : undefined}
            >
              <span className={styles.stageIndex}>{finished ? <CheckIcon /> : index + 1}</span>
              <span className={styles.stageName}>
                <b>{t(`stages.${stage}`)}</b>
                <small>{t(`stageLong.${stage}`)}</small>
                <span className={styles.dots}>
                  {decisions.map((d) => (
                    <i
                      key={d.id}
                      data-quality={campaign.answers[d.id]?.quality satisfies Quality | undefined}
                    />
                  ))}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className={styles.railProgress}>
        {t("rail.progress", { done, total: MISSION.decisions.length })}
      </p>
    </nav>
  );
}
