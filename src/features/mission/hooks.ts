"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { cueAccelerated, cueBoundaries, type ActiveCue } from "@/features/farm/visual";
import type { Locale } from "@/i18n/locale";
import { formatMoney, formatNumber } from "@/ui/format";

import { dayAt, type Timeline } from "./store";

/** Formatos del idioma activo para montos y cantidades. */
export function useFormat() {
  const locale = useLocale() as Locale;
  return {
    locale,
    money: (amount: string) => formatMoney(amount, locale),
    num: (value: number, digits = 0) => formatNumber(value, locale, digits),
  };
}

/** Día de campaña que se ve en pantalla: avanza cuadro a cuadro mientras corre el tiempo. */
export function useAnimatedDay(timeline: Timeline): number {
  const [day, setDay] = useState(timeline.to);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const now = performance.now();
      setDay(dayAt(timeline, now));
      if (now < timeline.startedAt + timeline.duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timeline]);
  return day;
}

/**
 * Si la animación en curso está en tiempo acelerado; cambia justo en los bordes de los tramos.
 * Ninguna animación empieza acelerada, así que solo los temporizadores cambian el valor.
 */
export function useAccelerated(cue: ActiveCue | null): boolean {
  const [mark, setMark] = useState<{ cue: ActiveCue | null; accelerated: boolean }>({
    cue: null,
    accelerated: false,
  });
  useEffect(() => {
    if (!cue) return;
    const now = performance.now();
    const timers = [...cueBoundaries(cue), cue.startedAt + cue.duration]
      .filter((at) => at > now)
      .map((at) =>
        window.setTimeout(
          () => setMark({ cue, accelerated: cueAccelerated(cue, performance.now()) }),
          at - now + 1,
        ),
      );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [cue]);
  return !!cue && mark.cue === cue && mark.accelerated;
}
