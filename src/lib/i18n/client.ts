"use client";

import i18n, { type Resource } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enDashboard from "../../../public/locales/en/dashboard.json";
import enExpenses from "../../../public/locales/en/expenses.json";
import enIncomes from "../../../public/locales/en/incomes.json";
import ptDashboard from "../../../public/locales/pt/dashboard.json";
import ptExpenses from "../../../public/locales/pt/expenses.json";
import ptIncomes from "../../../public/locales/pt/incomes.json";

export const defaultNS = "dashboard";
const namespaces = ["dashboard", "incomes", "expenses"];

const resources: Resource = {
  en: {
    [defaultNS]: enDashboard,
    incomes: enIncomes,
    expenses: enExpenses,
  },
  pt: {
    [defaultNS]: ptDashboard,
    incomes: ptIncomes,
    expenses: ptExpenses,
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      ns: namespaces,
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
