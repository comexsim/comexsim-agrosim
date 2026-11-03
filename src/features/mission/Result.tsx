"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { buildReport, improvedDecisions } from "@/engine/report";
import { Button, buttonClass } from "@/ui/Button";
import { cx } from "@/ui/cx";

import { useFormat } from "./hooks";
import styles from "./Overlay.module.css";
import { MISSION, useMission } from "./store";

/**
 * Informe de campaña: el campo se transforma en el tablero de resultados. Muestra la economía,
 * el puntaje por dimensión, dónde se perdió y la comparación con el intento anterior.
 */
export function Result() {
  const t = useTranslations();
  const { money, num } = useFormat();
  const campaign = useMission((state) => state.campaign);
  const attempts = useMission((state) => state.attempts);
  const restart = useMission((state) => state.restart);
  const report = buildReport(MISSION, campaign);
  const current = attempts.at(-1);
  const previous = attempts.at(-2);
  const improved = previous && current ? improvedDecisions(previous, current) : [];

  const revenue = Number(report.revenue);
  const costs = Number(report.costs);
  const profit = Number(report.profit);
  const scale = Math.max(revenue, costs, Math.abs(profit), 1);
  const bars = [
    { key: "revenue", value: revenue, label: t("result.revenue"), text: money(report.revenue) },
    { key: "costs", value: costs, label: t("result.costs"), text: money(report.costs) },
    { key: "profit", value: profit, label: t("result.profit"), text: money(report.profit) },
  ];

  return (
    <section className={styles.result} aria-labelledby="result-title">
      <header className={styles.resultHead}>
        <div>
          <span className={styles.eyebrow}>{t("result.eyebrow")}</span>
          <h1 id="result-title">{t("result.title")}</h1>
          <p className={styles.lead}>{t("result.text")}</p>
        </div>
        <div className={cx(styles.score, styles[report.grade])}>
          <small>{t("result.score")}</small>
          <b>{t("result.scoreValue", { score: report.score })}</b>
          <span>{t(`result.grade.${report.grade}`)}</span>
        </div>
      </header>

      <dl className={styles.kpis}>
        <div>
          <dt>{t("result.production")}</dt>
          <dd>{t("result.productionValue", { value: num(report.commercialT, 1) })}</dd>
        </div>
        <div>
          <dt>{t("result.yield")}</dt>
          <dd>{t("result.yieldValue", { value: num(report.yieldTHa, 1) })}</dd>
        </div>
        <div>
          <dt>{t("result.costs")}</dt>
          <dd>{money(report.costs)}</dd>
        </div>
        <div className={profit >= 0 ? styles.positive : styles.negative}>
          <dt>{t("result.profit")}</dt>
          <dd>{money(report.profit)}</dd>
        </div>
        <div>
          <dt>{t("result.costPerHa")}</dt>
          <dd>{money(report.costPerHa)}</dd>
        </div>
        <div>
          <dt>{t("result.margin")}</dt>
          <dd>{t("result.marginValue", { value: num(report.margin, 1) })}</dd>
        </div>
      </dl>

      <div className={styles.columns}>
        <article className={styles.card}>
          <h2>{t("result.economics")}</h2>
          <div className={styles.bars}>
            {bars.map((bar) => (
              <div key={bar.key} className={styles.bar} data-kind={bar.key}>
                <span className={styles.barValue}>{bar.text}</span>
                <i
                  style={{ height: `${(Math.abs(bar.value) / scale) * 100}%` }}
                  data-negative={bar.value < 0}
                />
                <span className={styles.barLabel}>{bar.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h2>{t("result.dimensions")}</h2>
          <ul className={styles.dimensions}>
            {report.dimensions.map((dimension) => (
              <li key={dimension.id}>
                <span>{t(`stageLong.${dimension.id}`)}</span>
                <b>
                  {num(dimension.score, dimension.score % 1 === 0 ? 0 : 1)}/{dimension.max}
                </b>
                <div className={styles.track}>
                  <i style={{ width: `${(dimension.score / dimension.max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <h2>{t("result.breakdown")}</h2>
          <table className={styles.table}>
            <tbody>
              {report.breakdown.map((line) => (
                <tr key={line.concept}>
                  <td>{t(`costs.${line.concept}`)}</td>
                  <td>{money(line.amount)}</td>
                </tr>
              ))}
              <tr className={styles.total}>
                <td>{t("result.costs")}</td>
                <td>{money(report.costs)}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className={styles.card}>
          <h2>{t("result.mistakes")}</h2>
          {report.mistakes.length === 0 ? (
            <p className={styles.muted}>{t("result.noMistakes")}</p>
          ) : (
            <ul className={styles.mistakes}>
              {report.mistakes.map((mistake) => (
                <li key={mistake.decision} data-quality={mistake.quality}>
                  <span>
                    {t("result.mistakeLine", {
                      day: mistake.day,
                      title: t(`decisions.${mistake.decision}.title`),
                    })}
                  </span>
                  <small>{t(`decision.quality.${mistake.quality}`)}</small>
                </li>
              ))}
            </ul>
          )}
        </article>

        {previous && current ? (
          <article className={styles.card}>
            <h2>{t("result.compare")}</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th />
                  <th>{t("result.previous")}</th>
                  <th>{t("result.current")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t("result.score")}</td>
                  <td>{previous.score}</td>
                  <td>{current.score}</td>
                </tr>
                <tr>
                  <td>{t("result.yield")}</td>
                  <td>{num(previous.yieldTHa, 1)}</td>
                  <td>{num(current.yieldTHa, 1)}</td>
                </tr>
                <tr>
                  <td>{t("result.production")}</td>
                  <td>{num(previous.commercialT, 1)}</td>
                  <td>{num(current.commercialT, 1)}</td>
                </tr>
                <tr>
                  <td>{t("result.costs")}</td>
                  <td>{money(previous.costs)}</td>
                  <td>{money(current.costs)}</td>
                </tr>
                <tr>
                  <td>{t("result.profit")}</td>
                  <td>{money(previous.profit)}</td>
                  <td>{money(current.profit)}</td>
                </tr>
              </tbody>
            </table>
            <p className={styles.improved}>{t("result.improved", { count: improved.length })}</p>
          </article>
        ) : null}

        <article className={styles.card}>
          <h2>{t("result.competencies")}</h2>
          <ul className={styles.competencies}>
            {(["c1", "c2", "c3", "c4", "c5"] as const).map((key) => (
              <li key={key}>{t(`result.${key}`)}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className={styles.actions}>
        <Button onClick={restart}>{t("result.retry")}</Button>
        <Link href="/" className={buttonClass("secondary")}>
          {t("result.hub")}
        </Link>
      </div>
      <p className={styles.disclaimer}>{t("result.disclaimer")}</p>
    </section>
  );
}
