/**
 * UMRAIO® — shared dictionary helper for product-wide BM/EN copy (Step 3G.4).
 *
 * Every localized surface declares one typed dictionary via `createDict`
 * and reads it through `useCopy`. There is exactly ONE locale context
 * (`@/lib/i18n/locale`) and one storage key — this helper is a thin
 * accessor on top of it, not a second localization system.
 */
import { useLocale, type Locale } from "@/lib/i18n/locale";

export type Dict<T> = Record<Locale, T>;

/** Identity helper that pins BM/EN shape parity at the type level. */
export function createDict<T extends object>(dict: Dict<T>): Dict<T> {
  return dict;
}

/** Returns the copy object for the active locale. */
export function useCopy<T extends object>(dict: Dict<T>): T {
  const { locale } = useLocale();
  return dict[locale];
}

/** Non-hook accessor for callbacks/helpers that already know the locale. */
export function copyFor<T extends object>(dict: Dict<T>, locale: Locale): T {
  return dict[locale];
}
