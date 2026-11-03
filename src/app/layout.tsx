import type { Metadata } from "next";
import { Hanken_Grotesk, Noto_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { parseTheme, THEME_COOKIE, themeInitScript } from "@/features/theme/theme";

import "./globals.css";

// Tipografías del sistema de diseño de la UPSA: Hanken Grotesk para la interfaz, Noto Serif para
// los títulos.
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Noto_Serif({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  // Con modo elegido, el servidor ya lo pinta; sin él, el script sigue al sistema.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value) ?? "light";

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${sans.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
