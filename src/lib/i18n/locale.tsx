/**
 * UMRAIO® — minimal locale preference (Step 3G.2).
 *
 * Presentation only. Controls which language pricing copy is rendered in.
 * Persisted in localStorage so the choice survives navigation and reloads.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "bm" | "en";

export const LOCALE_STORAGE_KEY = "umraio.locale";
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABEL: Record<Locale, string> = {
  bm: "BM",
  en: "EN",
};

export const LOCALE_FULL_LABEL: Record<Locale, string> = {
  bm: "Bahasa Melayu",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return value === "bm" || value === "en";
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Read after hydration so SSR markup and first client render match.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) setLocaleState(stored);
    } catch {
      /* storage unavailable — keep the default */
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* storage unavailable — keep the in-memory choice */
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
