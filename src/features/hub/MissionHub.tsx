"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { showcaseSource } from "@/features/farm/showcase";
import { useSceneLabels } from "@/features/farm/useSceneLabels";
import { AppBar } from "@/features/shell/AppBar";
import { buttonClass } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { LockIcon } from "@/ui/icons";

import styles from "./MissionHub.module.css";

// La escena 3D se carga aparte y solo en el navegador (AGENTS §0: carga diferida).
const FarmScene = dynamic(() => import("@/features/farm/FarmScene"), { ssr: false });

const MISSIONS = ["m1", "m2", "m3", "m4"] as const;

/** Portada: la finca en vitrina de fondo y las misiones del laboratorio. */
export function MissionHub() {
  const t = useTranslations();
  const source = useMemo(() => showcaseSource(), []);
  const labels = useSceneLabels();

  return (
    <div className={styles.page}>
      <AppBar />
      <div className={styles.backdrop} aria-hidden="true">
        <FarmScene
          source={source}
          station="farm"
          labels={labels}
          interactive={false}
          insets={{ left: 560 }}
          fallback={<div className={styles.flat} />}
        />
      </div>
      <main className={styles.content}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{t("hub.eyebrow")}</span>
          <h1>{t("hub.title")}</h1>
          <p>{t("hub.subtitle")}</p>
        </section>
        <ul className={styles.grid}>
          {MISSIONS.map((id, index) => {
            const available = index === 0;
            return (
              <li key={id} className={cx(styles.card, available && styles.available)}>
                <div className={styles.cardHead}>
                  <span className={styles.code}>{t(`hub.missions.${id}.code`)}</span>
                  <span className={cx(styles.status, available ? styles.on : styles.off)}>
                    {available ? t("hub.available") : t("hub.soon")}
                  </span>
                </div>
                <h2>{t(`hub.missions.${id}.title`)}</h2>
                <p>{t(`hub.missions.${id}.text`)}</p>
                <dl className={styles.meta}>
                  <div>
                    <dt>{t("hub.duration")}</dt>
                    <dd>{t(`hub.missions.${id}.duration`)}</dd>
                  </div>
                  <div>
                    <dt>{t("hub.level")}</dt>
                    <dd>{t(`hub.missions.${id}.level`)}</dd>
                  </div>
                  <div>
                    <dt>{t("hub.goal")}</dt>
                    <dd>{t(`hub.missions.${id}.goal`)}</dd>
                  </div>
                </dl>
                {available ? (
                  <Link href="/mision/agro-001" className={buttonClass("primary", true)}>
                    {t("hub.play")}
                  </Link>
                ) : (
                  <span className={styles.locked}>
                    <LockIcon /> {t("hub.soon")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className={styles.disclaimer}>{t("hub.disclaimer")}</p>
      </main>
    </div>
  );
}
