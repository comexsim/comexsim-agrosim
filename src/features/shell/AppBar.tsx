"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { ArrowLeftIcon } from "@/ui/icons";

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
        <Image
          className={styles.logoLight}
          src="/brand/upsa/logo.svg"
          alt={t("brand.university")}
          width={96}
          height={40}
          unoptimized
          priority
        />
        <Image
          className={styles.logoDark}
          src="/brand/upsa/logo-dark.svg"
          alt={t("brand.university")}
          width={96}
          height={40}
          unoptimized
          priority
        />
        <span className={styles.divider} />
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
