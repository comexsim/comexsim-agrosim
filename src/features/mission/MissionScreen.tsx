"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { metrics } from "@/engine/campaign";
import { useSceneLabels } from "@/features/farm/useSceneLabels";
import { fieldVisual } from "@/features/farm/visual";
import type { SceneSource } from "@/features/farm/clock";
import { PresentationBar } from "@/features/presentation/PresentationBar";
import { PresentationDirector } from "@/features/presentation/PresentationDirector";
import { AppBar } from "@/features/shell/AppBar";

import { Briefing } from "./Briefing";
import { DecisionPanel } from "./DecisionPanel";
import { FlatFarm } from "./FlatFarm";
import { useAnimatedDay } from "./hooks";
import styles from "./Hud.module.css";
import { Kpis } from "./Kpis";
import { Logbook } from "./Logbook";
import { Result } from "./Result";
import { RootLens } from "./RootLens";
import { StageRail } from "./StageRail";
import { dayAt, MISSION, stationFor, useMission } from "./store";

const FarmScene = dynamic(() => import("@/features/farm/FarmScene"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

function SceneLoading() {
  const t = useTranslations("scene");
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} />
      {t("loading")}
    </div>
  );
}

/** Ancho de los paneles en escritorio, para correr el centro de la escena al espacio libre. */
function useInsets() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return wide;
}

/** Pantalla del simulador: la finca 3D al centro y el HUD alrededor. */
export function MissionScreen({ presentation = false }: { presentation?: boolean }) {
  const phase = useMission((state) => state.phase);
  const campaign = useMission((state) => state.campaign);
  const cue = useMission((state) => state.cue);
  const timeline = useMission((state) => state.timeline);
  const trips = useMission((state) => state.trips);
  const last = useMission((state) => state.last);
  const hydrate = useMission((state) => state.hydrate);
  const reveal = useMission((state) => state.reveal);
  const startPresentation = useMission((state) => state.startPresentation);
  const stopPresentation = useMission((state) => state.stopPresentation);
  const labels = useSceneLabels();
  const wide = useInsets();
  const day = useAnimatedDay(timeline);

  useEffect(() => {
    if (presentation) startPresentation();
    hydrate();
    return () => stopPresentation();
  }, [presentation, hydrate, startPresentation, stopPresentation]);

  // La consecuencia aparece cuando termina la animación en la finca.
  useEffect(() => {
    if (phase !== "play" || !cue) return;
    const wait = Math.max(cue.startedAt + cue.duration - performance.now(), 0) + 250;
    const timer = window.setTimeout(reveal, wait);
    return () => window.clearTimeout(timer);
  }, [phase, cue, reveal]);

  const source = useMemo<SceneSource>(
    () => ({
      now: () => performance.now(),
      day: () => dayAt(timeline, performance.now()),
      visual: fieldVisual(campaign, trips, metrics(MISSION, campaign).yieldTHa),
      cue,
    }),
    [campaign, cue, timeline, trips],
  );

  const hud = phase === "decide" || phase === "play" || phase === "feedback";
  const insets = !wide
    ? { bottom: hud ? 320 : 0 }
    : phase === "briefing"
      ? { left: 520 }
      : hud
        ? { left: 260, right: 424, bottom: 110 }
        : { right: 0 };

  return (
    <div className={styles.screen}>
      <AppBar exit>{phase === "briefing" ? null : <Kpis />}</AppBar>
      <div className={styles.stageArea}>
        <div className={styles.sceneLayer}>
          <FarmScene
            source={source}
            station={stationFor(phase, campaign, last, cue)}
            labels={labels}
            insets={insets}
            fallback={<FlatFarm day={day} harvested={campaign.answers.q14 !== undefined} />}
          />
        </div>
        {phase === "briefing" ? <Briefing /> : null}
        {hud ? (
          <>
            <StageRail />
            <DecisionPanel />
            <Logbook />
            <RootLens />
          </>
        ) : null}
        {phase === "result" ? <Result /> : null}
        <PresentationDirector />
        <PresentationBar />
      </div>
    </div>
  );
}
