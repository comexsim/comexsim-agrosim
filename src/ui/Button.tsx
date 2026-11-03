import type { ComponentPropsWithoutRef } from "react";

import styles from "./Button.module.css";
import { cx } from "./cx";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary";
  block?: boolean;
};

/** Clases del botón, para enlaces que deben verse como botón. */
export function buttonClass(variant: "primary" | "secondary" = "primary", block = false): string {
  return cx(styles.button, styles[variant], block && styles.block);
}

export function Button({
  variant = "primary",
  block,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant, block), className)} {...props} />;
}
