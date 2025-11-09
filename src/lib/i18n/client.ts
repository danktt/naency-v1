"use client";

import i18n, { Resource } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enDashboard from "../../../public/locales/en/dashboard.json";
import ptDashboard from "../../../public/locales/pt/dashboard.json";

export const defaultNS = "dashboard";

const resources: Resource = {
  en: {
    [defaultNS]: enDashboard,
  },
  pt: {
    [defaultNS]: ptDashboard,
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      supportedLngs: ["en", "pt"],
      defaultNS,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["querystring", "localStorage", "navigator"],
        caches: ["localStorage"],
      },
      react: {
        useSuspense: false,
      },
    })
    .catch((error) => {
      console.error("Failed to initialize i18next", error);
    });
}

export { i18n };

