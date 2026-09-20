import type { i18n as I18n } from "i18next";

/**
 * The instance the provider currently renders with.
 *
 * Code that runs outside React cannot use useTranslation() but still produces
 * text a person reads: the global tRPC error toast is the main one. It reads
 * the active instance from here. Before the provider mounts, and on the
 * server, `translate` falls back to returning the key, which is the English
 * source text, so nothing ever renders blank.
 */
let active: I18n | null = null;

export function setActiveI18n(instance: I18n | null): void {
  active = instance;
}

export function translate(
  key: string,
  options?: Record<string, unknown>,
): string {
  if (!active) return key;
  return active.t(key, options as never) as unknown as string;
}
