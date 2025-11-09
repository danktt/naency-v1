"use client";

import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const flagMap: Record<string, string> = {
  en: "🇺🇸",
  pt: "🇧🇷",
};

const languages = [
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
];

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLang =
    languages.find((language) => language.code === i18n.language) ??
    languages[0];

  return (
    <Select
      value={currentLang.code}
      onValueChange={(value) => {
        if (value !== i18n.language) {
          i18n.changeLanguage(value).catch((error) => {
            console.error("Failed to change language", error);
          });
        }
      }}
    >
      <SelectTrigger className={className} aria-label="Language">
        <SelectValue
          placeholder={
            <span className="inline-flex items-center gap-1">
              <span className="text-base">{flagMap[currentLang.code]}</span>
              <span>{currentLang.label}</span>
            </span>
          }
        >
          <span className="inline-flex items-center gap-1">
            <span className="text-base">{flagMap[currentLang.code]}</span>
            <span>{currentLang.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <span className="inline-flex items-center gap-2">
              <span className="text-base">{flagMap[language.code]}</span>
              <span>{language.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
