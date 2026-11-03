import type { ComponentPropsWithoutRef } from "react";

import { cx } from "./cx";
import styles from "./IconButton.module.css";

/** Botón de solo ícono: exige `aria-label` porque no tiene texto visible. */
type IconButtonProps = ComponentPropsWithoutRef<"button"> & { "aria-label": string };

export function IconButton({ className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.iconButton, className)}
      title={props["aria-label"]}
      {...props}
    />
  );
}
