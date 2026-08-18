import {
  Brain,
  CheckCircle2,
  Compass,
  Handshake,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useLocale } from "@/lib/i18n/locale";
import { siteCopy } from "@/lib/i18n/site.i18n";

/** Small uppercase eyebrow label, matching the existing showcase style. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-primary/80">{children}</p>
  );
}

/* ── 2. What makes UMRAIO different ─────────────────────────────── */
export function BuiltForUmrah() {
  const t = siteCopy(useLocale().locale).builtForUmrah;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="built-for-umrah-heading">
      <div className="panel mx-auto max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-12">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2
          id="built-for-umrah-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          {t.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-[1.8] text-muted-foreground sm:text-base">
          {t.body1}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm font-light leading-[1.8] text-foreground/85 sm:text-base">
          {t.body2}
        </p>
      </div>
    </section>
  );
}

/* ── 4. Islamic Implementation Layer ────────────────────────────── */
const islamicIcons = [Compass, CheckCircle2, ScrollText, ShieldCheck];

export function IslamicImplementationLayer() {
  const t = siteCopy(useLocale().locale).islamicLayer;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="islamic-layer-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2
          id="islamic-layer-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          {t.heading}
          <sup className="align-super text-[0.45em] leading-none">™</sup>
        </h2>
        <p className="mt-4 text-sm font-light leading-relaxed text-primary/85 sm:text-base">
          {t.lede}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-[1.8] text-muted-foreground">
          {t.body}
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {t.cards.map((card, i) => {
          const Icon = islamicIcons[i] ?? Compass;
          const index = String(i + 1).padStart(2, "0");
          return (
            <article
              key={card.title}
              className="umr-reveal panel panel-hover flex min-w-0 items-start gap-4 p-6 sm:p-7"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
                <Icon className="size-5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">
                  {index}
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                  {card.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] font-light leading-relaxed text-muted-foreground/70">
        {t.note}
      </p>
    </section>
  );
}

/* ── 5. Intelligence loop ───────────────────────────────────────── */
export function IntelligenceLoop() {
  const t = siteCopy(useLocale().locale).loop;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="loop-heading">
      <div className="panel px-6 py-10 text-center sm:px-10 sm:py-12">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2
          id="loop-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-3xl"
        >
          {t.headingLine1}
          <br className="hidden sm:block" /> {t.headingLine2}
        </h2>

        <ol className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {t.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="rounded-full border border-border/70 bg-surface/50 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {step}
              </span>
              {i < t.steps.length - 1 ? (
                <span aria-hidden className="text-primary/50">
                  →
                </span>
              ) : (
                <RefreshCw aria-hidden className="size-3.5 text-primary/60" />
              )}
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-7 max-w-2xl text-sm font-light leading-[1.8] text-muted-foreground">
          {t.body}
        </p>
      </div>
    </section>
  );
}

/* ── 7. Customer trust ──────────────────────────────────────────── */
export function CustomerTrust() {
  const t = siteCopy(useLocale().locale).trust;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="trust-heading">
      <div className="panel mx-auto max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-12">
        <span className="grid size-11 place-items-center rounded-2xl border border-primary/25 bg-primary/10 mx-auto">
          <Handshake className="size-5 text-primary" />
        </span>
        <h2
          id="trust-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-3xl"
        >
          {t.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-[1.8] text-muted-foreground sm:text-base">
          {t.body1}
        </p>
        <p className="mt-4 text-sm font-light leading-relaxed text-foreground/85 sm:text-base">
          {t.body2}
        </p>
      </div>
    </section>
  );
}

/* ── 8 + 9 + 10. Executive, governed autonomy, human + AI ───────── */
export function GovernedAutonomy() {
  const t = siteCopy(useLocale().locale).governed;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="governed-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2
          id="governed-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          {t.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-[1.8] text-muted-foreground">
          {t.lede}
        </p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <article className="panel panel-hover p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <Brain className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">{t.card1Title}</h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            {t.card1Body1}
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            {t.card1Body2}
          </p>
        </article>

        <article className="panel panel-hover p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">{t.card2Title}</h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            {t.card2Body1}
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            {t.card2Body2}
          </p>
          <p className="mt-4 text-sm font-light leading-relaxed text-foreground/85">
            {t.card2Body3}
          </p>
        </article>
      </div>
    </section>
  );
}

/* ── 12. Differentiation ladder ─────────────────────────────────── */
export function DifferentiationLadder() {
  const t = siteCopy(useLocale().locale).ladder;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="ladder-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2
          id="ladder-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          {t.heading}
        </h2>
      </header>

      <ol className="mx-auto mt-10 grid max-w-3xl gap-3">
        {t.rows.map((row, i) => {
          const highlight = i >= t.rows.length - 2;
          return (
            <li
              key={row.tier}
              className={
                highlight
                  ? "panel grid gap-1 border-primary/35 bg-primary/8 p-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5"
                  : "panel grid gap-1 p-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5"
              }
            >
              <p
                className={
                  highlight
                    ? "text-sm font-semibold tracking-tight text-primary"
                    : "text-sm font-semibold tracking-tight text-foreground/85"
                }
              >
                {row.tier}
              </p>
              <p className="text-sm font-light leading-relaxed text-muted-foreground">{row.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ── 13. UMRAVERSE relationship ─────────────────────────────────── */
const STACK_NAMES = [
  "Digital Renaissance Metaverse™",
  "RÉNAIO.CORE™",
  "Islamic Implementation Layer™",
  "UMRAVERSE®",
  "UMRAIO®",
  "Umrah agency",
] as const;

export function EcosystemRelationship() {
  const t = siteCopy(useLocale().locale).ecosystem;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="ecosystem-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2
          id="ecosystem-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          {t.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-[1.8] text-muted-foreground">
          {t.lede}
        </p>
      </header>

      <ol className="mx-auto mt-10 flex max-w-xl flex-col items-stretch">
        {STACK_NAMES.map((name, i) => (
          <li key={name} className="flex flex-col items-center">
            <div className="panel w-full px-5 py-4 text-center">
              <p className="text-sm font-semibold tracking-tight sm:text-base">{name}</p>
              <p className="mt-1 text-[10px] font-light uppercase tracking-[0.24em] text-muted-foreground/80">
                {t.roles[i]}
              </p>
            </div>
            {i < STACK_NAMES.length - 1 ? (
              <span
                aria-hidden
                className="my-3 block h-8 w-px bg-gradient-to-b from-primary/50 to-transparent"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── 15. Closing message ────────────────────────────────────────── */
export function ClosingStatement() {
  const t = siteCopy(useLocale().locale).closing;
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="closing-heading">
      <div className="panel mx-auto max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-12">
        <h2
          id="closing-heading"
          className="text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-3xl"
        >
          {t.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-[1.8] text-muted-foreground sm:text-base">
          {t.body}
        </p>
        <p className="mt-6 text-sm font-light leading-[1.9] text-foreground/85 sm:text-base">
          {t.line1}
          <br />
          {t.line2}
          <br />
          {t.line3}
        </p>
      </div>
    </section>
  );
}
