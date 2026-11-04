"use client";

import { useEffect } from "react";

import { MISSION, useMission } from "@/features/mission/store";

import { nextScriptStep } from "./script";

/**
 * Lleva la misión según el guion: espera la pausa para que el público lea y recién entonces
 * despacha la acción. Si se pausa, se detiene en el próximo paso (la animación en curso termina).
 */
export function PresentationDirector() {
  const presenting = useMission((state) => state.presenting);
  const paused = useMission((state) => state.paused);
  const phase = useMission((state) => state.phase);
  const campaign = useMission((state) => state.campaign);
  const selected = useMission((state) => state.selected);
  const last = useMission((state) => state.last);
  const begin = useMission((state) => state.begin);
  const select = useMission((state) => state.select);
  const confirm = useMission((state) => state.confirm);
  const next = useMission((state) => state.next);

  useEffect(() => {
    if (!presenting || paused) return;
    const step = nextScriptStep(MISSION, {
      phase,
      campaign,
      selected,
      hadEvent: (last?.events.length ?? 0) > 0,
    });
    if (!step) return;
    const timer = window.setTimeout(() => {
      const now = performance.now();
      const { action } = step;
      if (action.type === "begin") begin(now);
      else if (action.type === "select") select(action.key);
      else if (action.type === "confirm") confirm(now);
      else next(now);
    }, step.wait);
    return () => window.clearTimeout(timer);
  }, [presenting, paused, phase, campaign, selected, last, begin, select, confirm, next]);

  return null;
}
