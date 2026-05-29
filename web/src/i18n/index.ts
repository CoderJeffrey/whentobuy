import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, zh: { translation: zh } },
    fallbackLng: "en",
    supportedLngs: ["en", "zh"],
    // Map any zh-* variant (zh-CN, zh-HK, zh-TW, zh-Hans, …) down to "zh".
    // Everything else falls through to fallbackLng.
    load: "languageOnly",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "ih_lang",
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
