"use client";

import { useTranslations } from "next-intl";

import { currentDecision, metrics, optionsFor, promptParams } from "@/engine/campaign";
import type { CampaignState, Decision, LogEntry, ResolvedOption } from "@/engine/types";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { AlertIcon, BulbIcon, CheckIcon } from "@/ui/icons";

import { useFormat } from "./hooks";
import styles from "./Hud.module.css";
import { MISSION, useMission } from "./store";

type Values = Record<string, string | number>;

const STAGE_ORDER = ["soil", "sowing", "crop", "harvest", "postharvest", "market"] as const;

/** Montos de las preguntas de resultado, ya formateados para el idioma. */
function useParams() {
  const { money } = useFormat();
  return {
    prompt(decision: Decision, campaign: CampaignState): Values {
      const params = promptParams(MISSION, campaign, decision);
      if (decision.kind !== "result") return params;
      return { revenue: money(String(params.revenue)), costs: money(String(params.costs)) };
    },
    option(decision: Decision, option: ResolvedOption): Values {
      const base =
        decision.kind === "choice" || decision.kind === "calc" ? (decision.params ?? {}) : {};
      const params = { ...base, ...option.params };
      if (decision.kind === "result") return { amount: money(String(option.params.amount)) };
      return params;
    },
  };
}

/**
 * Panel de la decisión: enunciado y opciones mientras se decide; la consecuencia, los eventos y
 * el aprendizaje después de verla en la finca («Aprende de tu decisión»).
 */
export function DecisionPanel() {
  const phase = useMission((state) => state.phase);
  if (phase === "feedback") return <Feedback />;
  if (phase === "decide" || phase === "play") return <Question />;
  return null;
}

function Question() {
  const t = useTranslations();
  const { money } = useFormat();
  const params = useParams();
  const campaign = useMission((state) => state.campaign);
  const phase = useMission((state) => state.phase);
  const selected = useMission((state) => state.selected);
  const last = useMission((state) => state.last);
  const cue = useMission((state) => state.cue);
  const select = useMission((state) => state.select);
  const confirm = useMission((state) => state.confirm);

  // Durante la animación, el panel sigue mostrando la decisión recién confirmada.
  const playing = phase === "play" && last;
  const index = playing
    ? MISSION.decisions.findIndex((d) => d.id === last.decision)
    : campaign.step;
  const decision = playing ? MISSION.decisions[index] : currentDecision(MISSION, campaign);
  if (!decision) return null;
  // Las opciones dependen del estado previo a decidir: mientras se anima ya no se muestran.
  const options = playing ? null : optionsFor(MISSION, campaign, decision);
  const stageIndex = STAGE_ORDER.indexOf(decision.stage) + 1;
  const prefix = `decisions.${decision.id}`;

  return (
    <section className={styles.panel} aria-labelledby="decision-title" id="decision">
      <header className={styles.panelHead}>
        <span className={styles.stageChip}>
          {t("decision.stage", { n: stageIndex, name: t(`stages.${decision.stage}`) })}
        </span>
        <span className={styles.counter}>
          {t("decision.counter", { n: index + 1, total: MISSION.decisions.length })} ·{" "}
          {t("decision.dayChip", { day: decision.day })}
        </span>
      </header>
      <h2 id="decision-title" className={styles.title}>
        {t(`${prefix}.title`)}
      </h2>
      <p className={styles.sceneText}>{t(`${prefix}.scene`, params.prompt(decision, campaign))}</p>
      <p className={styles.prompt}>{t(`${prefix}.prompt`, params.prompt(decision, campaign))}</p>

      {options ? (
        <div role="radiogroup" aria-label={t("decision.select")} className={styles.options}>
          {options.map((option) => {
            const label = t.has(`${prefix}.option`)
              ? t(`${prefix}.option`, params.option(decision, option))
              : t(`${prefix}.${option.key}`, params.option(decision, option));
            const showMoney = decision.kind !== "production" && decision.kind !== "result";
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected === option.key}
                className={styles.option}
                onClick={() => select(option.key)}
              >
                <span className={styles.letter}>{option.key.toUpperCase()}</span>
                <span className={styles.optionText}>{label}</span>
                {showMoney ? (
                  <span className={styles.optionCost}>
                    <small>
                      {decision.kind === "sale" ? t("decision.net") : t("decision.cost")}
                    </small>
                    {decision.kind === "sale" && option.value
                      ? money(option.value)
                      : option.cost === "0"
                        ? t("decision.free")
                        : money(option.cost)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.playing}>
          <p>{t("decision.playing")}</p>
          <div className={styles.playBar}>
            <i style={{ animationDuration: `${cue?.duration ?? 4000}ms` }} />
          </div>
        </div>
      )}

      {options ? (
        <Button block disabled={!selected} onClick={() => confirm(performance.now())}>
          {t("decision.confirm")}
        </Button>
      ) : null}
    </section>
  );
}

function Feedback() {
  const t = useTranslations();
  const { money } = useFormat();
  const campaign = useMission((state) => state.campaign);
  const last = useMission((state) => state.last);
  const next = useMission((state) => state.next);
  if (!last) return null;
  const decision = MISSION.decisions.find((d) => d.id === last.decision);
  if (!decision) return null;
  const prefix = `decisions.${decision.id}`;
  const static_ = decision.kind === "choice" || decision.kind === "calc";
  const consequence = static_ ? t(`${prefix}.f${last.key}`) : t(`${prefix}.f${last.quality}`);
  const events: LogEntry[] = campaign.log.filter(
    (entry) => entry.tone === "event" && last.events.length > 0 && entry.day >= decision.day,
  );
  const finished = campaign.step >= MISSION.decisions.length;
  const left = metrics(MISSION, campaign).budgetLeft;
  const Icon = last.quality === "best" ? CheckIcon : AlertIcon;

  return (
    <section className={styles.panel} aria-live="polite" id="decision">
      <div className={cx(styles.verdict, styles[last.quality])}>
        <Icon />
        <div>
          <b>{t(`decision.quality.${last.quality}`)}</b>
          <span>{t(`${prefix}.title`)}</span>
        </div>
      </div>

      <h3 className={styles.blockTitle}>{t("decision.consequence")}</h3>
      <p className={styles.text}>{consequence}</p>
      <p className={styles.spent}>
        {t("decision.spent")}: <b>{last.cost === "0" ? t("decision.free") : money(last.cost)}</b>
      </p>

      {events.map((event) => (
        <div key={`${event.key}${event.day}`} className={styles.event}>
          <span className={styles.eventChip}>
            {t("decision.event")} · {t("decision.dayChip", { day: event.day })}
          </span>
          <b>{t(`events.${event.key}.title`)}</b>
          <p>{t(`events.${event.key}.text`, event.params ?? {})}</p>
          {event.cost ? <small>{money(event.cost)}</small> : null}
        </div>
      ))}

      {left.startsWith("-") ? (
        <p className={styles.overBudget} role="alert">
          {t("decision.overBudget", { amount: money(left.slice(1)) })}
        </p>
      ) : null}

      <div className={styles.learn}>
        <h3>
          <BulbIcon /> {t("decision.learn")}
        </h3>
        <p>{t(`${prefix}.learn`)}</p>
      </div>

      <Button block onClick={() => next(performance.now())}>
        {finished ? t("decision.finish") : t("decision.continue")}
      </Button>
    </section>
  );
}
