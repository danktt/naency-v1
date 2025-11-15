"use client";

import i18n, { type Resource } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enDashboard from "../../../public/locales/en/dashboard.json";
import enExpenses from "../../../public/locales/en/expenses.json";
import enIncomes from "../../../public/locales/en/incomes.json";
import enProvisions from "../../../public/locales/en/provisions.json";
import enTransfers from "../../../public/locales/en/transfers.json";
import ptDashboard from "../../../public/locales/pt/dashboard.json";
import ptExpenses from "../../../public/locales/pt/expenses.json";
import ptIncomes from "../../../public/locales/pt/incomes.json";
import ptProvisions from "../../../public/locales/pt/provisions.json";
import ptTransfers from "../../../public/locales/pt/transfers.json";

export const defaultNS = "dashboard";
const namespaces = [
  "dashboard",
  "incomes",
  "expenses",
  "transfers",
  "provisions",
];

const resources: Resource = {
  en: {
    [defaultNS]: enDashboard,
    incomes: enIncomes,
    expenses: enExpenses,
    provisions: enProvisions,
    transfers: enTransfers,
  },
  pt: {
    [defaultNS]: ptDashboard,
    incomes: ptIncomes,
    expenses: ptExpenses,
    provisions: ptProvisions,
    transfers: ptTransfers,
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
    .catch(() => {});
}

export { i18n };
