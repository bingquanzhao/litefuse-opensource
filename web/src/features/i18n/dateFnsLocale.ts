import { setDefaultOptions } from "date-fns";
import { zhCN } from "date-fns/locale";
import { type Locale } from "date-fns";

import { type AppLocale } from "@/src/features/i18n/config";

/**
 * date-fns formats with en-US unless a locale is passed, so `format` and
 * `formatDistanceToNow` would print "Sep 14" and "3 hours ago" in a Chinese
 * UI. Rather than thread a locale through every call site, the provider sets
 * the library default whenever the UI language changes.
 *
 * `undefined` means date-fns' own default (en-US).
 */
const DATE_FNS_LOCALES: Partial<Record<AppLocale, Locale>> = {
  "zh-CN": zhCN,
};

export function applyDateFnsLocale(locale: AppLocale): void {
  setDefaultOptions({ locale: DATE_FNS_LOCALES[locale] });
}
