import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

export const supportedLanguages = [
  { code: "en", labelKey: "common.english" },
  { code: "es", labelKey: "common.spanish" },
  { code: "fr", labelKey: "common.french" },
] as const;

export type LanguageCode = (typeof supportedLanguages)[number]["code"];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "es", "fr"],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      lookupQuerystring: "lng",
      lookupLocalStorage: "travel-safe-language",
      caches: ["localStorage"],
      convertDetectedLanguage: (language) => language.split("-")[0].toLowerCase(),
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export function setLanguage(code: LanguageCode) {
  void i18n.changeLanguage(code);
  document.documentElement.lang = code;
}

export default i18n;
