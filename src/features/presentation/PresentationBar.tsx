"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { MISSION, useMission } from "@/features/mission/store";
import { Button, buttonClass } from "@/ui/Button";

import styles from "./PresentationBar.module.css";
import { captionKey } from "./script";

/** Narración del Modo Presentación, con su avance y los controles del presentador. */
export function PresentationBar() {
  const t = useTranslations("presentation");
  const presenting = useMission((state) => state.presenting);
  const paused = useMission((state) => state.paused);
  const phase = useMission((state) => state.phase);
  const campaign = useMission((state) => state.campaign);
  const toggle = useMission((state) => state.togglePause);
  if (!presenting) return null;
  const progress = campaign.step / MISSION.decisions.length;

  return (
    <aside className={styles.bar} data-phase={phase} aria-live="polite">
      <div className={styles.head}>
        <span className={styles.badge} data-paused={paused}>
          {paused ? t("paused") : t("badge")}
        </span>
        <div className={styles.controls}>
          {phase === "result" ? null : (
            <Button variant="secondary" onClick={toggle}>
              {paused ? t("resume") : t("pause")}
            </Button>
          )}
          <Link href="/" className={buttonClass("secondary")}>
            {t("exit")}
          </Link>
        </div>
      </div>
      <p className={styles.caption}>{t(`captions.${captionKey(MISSION, { phase, campaign })}`)}</p>
      <span
        className={styles.progress}
        role="progressbar"
        aria-label={t("progress")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <i style={{ width: `${progress * 100}%` }} />
      </span>
    </aside>
  );
}
