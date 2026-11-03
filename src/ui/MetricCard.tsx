import { cx } from "./cx";
import styles from "./MetricCard.module.css";

type MetricCardProps = {
  label: string;
  value: string;
  /** Avance de 0 a 1; sin él no se dibuja el medidor. */
  progress?: number;
  /** Tono del medidor: dorado o rojo cuando el valor preocupa. */
  tone?: "ok" | "warn" | "bad";
  className?: string;
};

export function MetricCard({ label, value, progress, tone = "ok", className }: MetricCardProps) {
  return (
    <div className={cx(styles.metric, className)}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {progress !== undefined && (
        <div
          className={cx(styles.meter, styles[tone])}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <i style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
