"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { LOCALES, type Locale, writeLocaleCookie } from "@/i18n/locale";

import styles from "./LocaleSwitch.module.css";

export function LocaleSwitch() {
  const t = useTranslations("appBar");
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    writeLocaleCookie(locale);
    startTransition(() => router.refresh());
  }

  return (
    <div className={styles.switch} role="group" aria-label={t("language")} aria-busy={pending}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          className={styles.option}
          aria-pressed={locale === current}
          onClick={() => choose(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
