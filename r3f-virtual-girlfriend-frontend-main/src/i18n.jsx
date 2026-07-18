import { createContext, useContext, useState, useCallback } from "react";

/**
 * Leichtgewichtige, dependency-freie i18n für die statischen UI-Texte.
 * (Die eigentlichen Beratungstexte generiert die KI ohnehin sprachabhängig.)
 * Sprache: localStorage `nurireisen_lang` > Browser > "de".
 */
const CATALOG = {
  de: {
    "input.placeholder": "Schreib eine Nachricht...",
    "btn.send": "Senden",
    "btn.advisor": "Mit Berater sprechen",
    "status.thinking": "{name} denkt...",
    "welcome": "Hi! Ich bin Lara, deine unverbindliche Reiseberatung. Wonach suchst du?",
    "error.generic": "Ups, da ist etwas schiefgelaufen. Bitte versuch es nochmal.",
    "advisor.request": "Ich möchte mit einem Berater sprechen.",
    "hotel.request": "Jetzt anfragen",
    "hotel.back": "← Zurück",
    "hotel.days": "Tage",
    "hotel.amenities": "Ausstattung",
    "hotel.reco": "Unsere Empfehlungen",
    "lead.title": "Unverbindliche Anfrage",
    "lead.subtitle": "Hinterlass deine Kontaktdaten — ein Berater meldet sich mit passenden Angeboten.",
    "lead.subtitleHotel": "Anfrage für {hotel} — ein Berater meldet sich mit den besten Angeboten.",
    "lead.name": "Name",
    "lead.email": "E-Mail",
    "lead.phone": "Telefon (optional)",
    "lead.note": "Nachricht (optional)",
    "lead.privacy": "Deine Daten nutzen wir nur für die Beratung — kein Spam, kein Kaufzwang.",
    "lead.cancel": "Abbrechen",
    "lead.submit": "Anfrage senden",
    "lead.needContact": "Bitte E-Mail oder Telefon angeben.",
  },
  en: {
    "input.placeholder": "Type a message...",
    "btn.send": "Send",
    "btn.advisor": "Talk to an advisor",
    "status.thinking": "{name} is thinking...",
    "welcome": "Hi! I'm Lara, your no-obligation travel advisor. What are you looking for?",
    "error.generic": "Oops, something went wrong. Please try again.",
    "advisor.request": "I'd like to talk to an advisor.",
    "hotel.request": "Request now",
    "hotel.back": "← Back",
    "hotel.days": "days",
    "hotel.amenities": "Amenities",
    "hotel.reco": "Our recommendations",
    "lead.title": "No-obligation inquiry",
    "lead.subtitle": "Leave your contact details — an advisor will get back to you with matching offers.",
    "lead.subtitleHotel": "Inquiry for {hotel} — an advisor will get back to you with the best offers.",
    "lead.name": "Name",
    "lead.email": "Email",
    "lead.phone": "Phone (optional)",
    "lead.note": "Message (optional)",
    "lead.privacy": "We only use your data to advise you — no spam, no pressure.",
    "lead.cancel": "Cancel",
    "lead.submit": "Send inquiry",
    "lead.needContact": "Please provide an email or phone number.",
  },
};

export const LOCALES = Object.keys(CATALOG);

const detect = () => {
  try {
    const saved = localStorage.getItem("nurireisen_lang");
    if (saved && CATALOG[saved]) return saved;
    const nav = (navigator.language || "de").slice(0, 2).toLowerCase();
    return CATALOG[nav] ? nav : "de";
  } catch {
    return "de";
  }
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(detect);

  const setLang = useCallback((l) => {
    if (!CATALOG[l]) return;
    try {
      localStorage.setItem("nurireisen_lang", l);
    } catch {}
    setLangState(l);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = (CATALOG[lang] && CATALOG[lang][key]) ?? CATALOG.de[key] ?? key;
      if (vars) {
        for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
      }
      return s;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () =>
  useContext(I18nContext) || { lang: "de", setLang: () => {}, t: (k) => k };
