"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { ArrowLeftIcon, SproutIcon } from "@/ui/icons";

import styles from "./AppBar.module.css";
import { LocaleSwitch } from "./LocaleSwitch";

/** Barra superior: la marca de SIMA, lo que la pantalla quiera mostrar y los ajustes. */
export function AppBar({ children, exit }: { children?: ReactNode; exit?: boolean }) {
  const t = useTranslations();
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        {exit ? (
          <Link
            href="/"
            className={styles.exit}
            aria-label={t("appBar.exit")}
            title={t("appBar.exit")}
          >
            <ArrowLeftIcon />
          </Link>
        ) : null}
        <span className={styles.mark}>
          <SproutIcon />
        </span>
        <span className={styles.names}>
          <small>{t("brand.suite")}</small>
          <b>{t("brand.name")}</b>
        </span>
      </div>
      <div className={styles.middle}>{children}</div>
      <div className={styles.actions}>
        <LocaleSwitch />
        <ThemeToggle />
      </div>
    </header>
  );
}
