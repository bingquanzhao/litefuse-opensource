import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";
import { useSession } from "next-auth/react";
import {
  DEFAULT_LOCALE,
  isAppLocale,
  serializeLocaleCookie,
  type AppLocale,
} from "@/src/features/i18n/config";
import { createI18nInstance } from "@/src/features/i18n/instance";
import { setActiveI18n } from "@/src/features/i18n/activeInstance";

/** Resolved on the server for the first render, see getI18nAppProps. */
export type I18nAppProps = {
  locale: AppLocale;
  enabledLocales: AppLocale[];
};

type LocaleContextValue = {
  locale: AppLocale;
  /** Locales exposed by this deployment (LITEFUSE_I18N_LOCALES). */
  enabledLocales: AppLocale[];
  /** True when a language switcher makes sense. */
  isMultiLocale: boolean;
  /** Switch the UI language and persist it in the device cookie. */
  setLocale: (locale: AppLocale) => void;
};

const fallbackContext: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  enabledLocales: [DEFAULT_LOCALE],
  isMultiLocale: false,
  setLocale: () => {},
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const defaultInitial: I18nAppProps = {
  locale: DEFAULT_LOCALE,
  enabledLocales: [DEFAULT_LOCALE],
};

export function I18nProvider({
  initial = defaultInitial,
  children,
}: {
  /** Missing (e.g. in tests) means English only. */
  initial?: I18nAppProps;
  children: ReactNode;
}) {
  // `initial` is read once. On client-side navigations getInitialProps runs
  // again with client-side values, but the provider is mounted above the page
  // and keeps its own state.
  const [i18n] = useState(() => createI18nInstance(initial.locale));
  const [locale, setLocaleState] = useState<AppLocale>(initial.locale);
  const [enabledLocales] = useState<AppLocale[]>(initial.enabledLocales);
  const session = useSession();

  const setLocale = useCallback(
    (next: AppLocale) => {
      if (!enabledLocales.includes(next)) return;
      document.cookie = serializeLocaleCookie(next);
      void i18n.changeLanguage(next);
      setLocaleState(next);
    },
    [enabledLocales, i18n],
  );

  // The account preference wins over the device cookie once the session is
  // known (e.g. first visit from a new device).
  const userLocale = session.data?.user?.locale;
  useEffect(() => {
    if (
      isAppLocale(userLocale) &&
      userLocale !== locale &&
      enabledLocales.includes(userLocale)
    ) {
      setLocale(userLocale);
    }
  }, [userLocale, locale, enabledLocales, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Lets code outside React (the global tRPC error toast) translate.
  useEffect(() => {
    setActiveI18n(i18n);
    return () => setActiveI18n(null);
  }, [i18n]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      enabledLocales,
      isMultiLocale: enabledLocales.length > 1,
      setLocale,
    }),
    [locale, enabledLocales, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext) ?? fallbackContext;
}
