import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cx } from "./cx";
import styles from "./Panel.module.css";

type PanelProps = ComponentPropsWithoutRef<"section"> & { padded?: boolean };

/** Superficie elevada sobre la escena: base de todos los paneles del HUD. */
export function Panel({ padded = true, className, ...props }: PanelProps) {
  return <section className={cx(styles.panel, padded && styles.padded, className)} {...props} />;
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.title}>{children}</h2>;
}
