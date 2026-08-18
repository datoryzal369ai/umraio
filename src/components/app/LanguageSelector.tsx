import { LOCALE_FULL_LABEL, LOCALE_LABEL, useLocale, type Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const LOCALES: readonly Locale[] = ["bm", "en"];

/** Compact BM | EN switch for the public site header and settings. */
export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-border/60 bg-surface/60 p-0.5 backdrop-blur",
        className,
      )}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={LOCALE_FULL_LABEL[code]}
            className={cn(
              "min-w-9 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LOCALE_LABEL[code]}
          </button>
        );
      })}
    </div>
  );
}
