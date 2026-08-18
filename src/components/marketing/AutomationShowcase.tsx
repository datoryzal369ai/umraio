import {
  BotMessageSquare,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DollarSign,
  Flag,
  Gauge,
  MessageCircle,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

import { useLocale } from "@/lib/i18n/locale";
import { siteCopy } from "@/lib/i18n/site.i18n";
import { cn } from "@/lib/utils";

type ShowcaseCopy = ReturnType<typeof siteCopy>["showcase"];

/** Tiny uppercase system metadata label. */
function SysLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.22em] text-primary/90",
        className,
      )}
    >
      {children}
    </span>
  );
}

function ModuleHead({
  index,
  icon: Icon,
  title,
  body,
}: {
  index: string;
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
        <Icon className="size-5 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">
          {index}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
        <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function ModuleShell({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
}) {
  return (
    <article
      className={cn(
        "umr-reveal panel panel-hover relative flex flex-col overflow-hidden p-6 sm:p-8",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </article>
  );
}

/* 01 — Answers enquiries */
function AnswersEnquiries({ t }: { t: ShowcaseCopy }) {
  const m = t.modules.enquiries;
  return (
    <ModuleShell delay={0} className="lg:col-span-7">
      <ModuleHead index="01" icon={BotMessageSquare} title={m.title} body={m.body} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <SysLabel>
          <Sparkles className="size-3" />
          {m.realtime}
        </SysLabel>
        <SysLabel>{m.latency}</SysLabel>
      </div>

      <div className="chat-canvas mt-5 rounded-2xl border border-border/70 p-4 sm:p-5">
        <div className="flex justify-start">
          <div className="umr-reveal max-w-[85%] rounded-2xl rounded-tl-md border border-border/70 bg-surface/80 px-4 py-3 text-sm leading-relaxed">
            Assalamualaikum, ada pakej Makkah bulan Disember?
            <span className="mt-1 block text-[10px] text-muted-foreground/70">10:24 AM</span>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <div
            className="umr-reveal max-w-[88%] rounded-2xl rounded-tr-md border border-primary/25 bg-primary/12 px-4 py-3 text-sm leading-relaxed"
            style={{ animationDelay: "420ms" }}
          >
            Waalaikumsalam. Ya, ada beberapa pilihan pakej Disember. Boleh saya tahu berapa orang
            yang akan berangkat?
            <span className="mt-1 block text-[10px] text-primary/70">10:24 AM ✓✓</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/80 px-3 py-2">
            <i className="umr-dot" />
            <i className="umr-dot" style={{ animationDelay: "160ms" }} />
            <i className="umr-dot" style={{ animationDelay: "320ms" }} />
          </span>
          <span className="text-xs font-light text-muted-foreground">{m.typing}</span>
        </div>
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
        {t.illustrative}
      </p>
    </ModuleShell>
  );
}

/* 02 — Qualifies prospects */
function QualifiesProspects({ t }: { t: ShowcaseCopy }) {
  const m = t.modules.qualify;
  const qualifiers = [
    { icon: CalendarClock, label: m.travelWindow, value: "Dec 2026" },
    { icon: Users, label: m.pax, value: "4" },
    { icon: DollarSign, label: m.budget, value: "RM18,000" },
    { icon: Gauge, label: m.intent, value: m.intentValue },
  ];
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <ModuleShell delay={90} className="lg:col-span-5">
      <ModuleHead index="02" icon={Users} title={m.title} body={m.body} />

      <div className="mt-6">
        <SysLabel>{m.label}</SysLabel>
      </div>

      <div className="mt-5 grid gap-5 rounded-2xl border border-border/70 bg-surface/40 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <dl className="min-w-0 space-y-3">
          {qualifiers.map((q) => (
            <div key={q.label} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-primary/8">
                <q.icon className="size-3.5 text-primary" />
              </span>
              <div className="min-w-0">
                <dt className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
                  {q.label}
                </dt>
                <dd className="truncate text-sm font-semibold tracking-tight">{q.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="flex flex-col items-center">
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              className="umr-score"
              style={{ ["--umr-dash" as string]: `${c * 0.08}`, strokeDashoffset: c }}
            />
          </svg>
          <div className="-mt-[4.7rem] text-center">
            <p className="text-3xl font-extrabold tracking-tight">92</p>
            <p className="text-[10px] text-muted-foreground/70">/100</p>
          </div>
          <p className="mt-9 text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">
            {m.leadScore}
          </p>
          <span className="mt-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            {m.qualified}
          </span>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {m.checks.map((text) => (
          <li key={text} className="flex items-center gap-2 text-xs font-light text-muted-foreground">
            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
            {text}
          </li>
        ))}
      </ul>
    </ModuleShell>
  );
}

/* 03 — Recommends packages */
function RecommendsPackages({ t }: { t: ShowcaseCopy }) {
  const m = t.modules.packages;
  return (
    <ModuleShell delay={180} className="lg:col-span-5">
      <ModuleHead index="03" icon={Sparkles} title={m.title} body={m.body} />

      <div className="mt-6">
        <SysLabel>{m.label}</SysLabel>
      </div>

      <div className="mt-5 space-y-3">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-surface/70 to-surface/40 p-5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(0,215,255,0.18),transparent_70%)]"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
                {m.bestMatch}
              </span>
              <h4 className="mt-3 truncate text-base font-semibold tracking-tight">
                Makkah + Madinah Premium
              </h4>
              <p className="text-xs text-muted-foreground">
                {m.days(12)} · {m.premiumHotel}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
                {m.match}
              </p>
              <p className="text-xl font-extrabold text-primary">94%</p>
            </div>
          </div>
          <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-border">
            <span className="umr-bar block h-full rounded-full bg-primary" style={{ ["--umr-w" as string]: "94%" }} />
          </div>
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <p className="text-lg font-extrabold tracking-tight">
              RM 6,890 <span className="text-xs font-light text-muted-foreground">{m.perPax}</span>
            </p>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
                {m.departure}
              </p>
              <p className="text-xs font-medium">18 Dec 2026</p>
            </div>
          </div>
        </div>

        {[
          { n: "Makkah Economy", days: 10, p: "RM 4,890", m: "86%" },
          { n: "Madinah Deluxe", days: 9, p: "RM 5,590", m: "82%" },
        ].map((pkg) => (
          <div
            key={pkg.n}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface/40 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight">{pkg.n}</p>
              <p className="text-[11px] text-muted-foreground">{m.days(pkg.days)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold">
                {pkg.p} <span className="text-[10px] font-light text-muted-foreground">{m.perPax}</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                {m.match} {pkg.m}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
        {t.illustrative}
      </p>
    </ModuleShell>
  );
}

/* 04 — Follows up */
const TIMELINE_ICONS = [MessageCircle, Send, Users, Flag];

function FollowsUp({ t }: { t: ShowcaseCopy }) {
  const m = t.modules.followUp;
  const times = [m.now, m.day(1), m.days(3), m.days(7)];
  return (
    <ModuleShell delay={270} className="lg:col-span-7">
      <ModuleHead index="04" icon={CalendarClock} title={m.title} body={m.body} />

      <div className="mt-6">
        <SysLabel>
          <Clock3 className="size-3" />
          {m.label}
        </SysLabel>
      </div>

      <div className="mt-5 grid flex-1 gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <ol className="relative min-w-0 space-y-3 pl-5">
          <span
            aria-hidden
            className="absolute bottom-3 left-1 top-3 w-px bg-gradient-to-b from-primary/50 via-primary/25 to-transparent"
          />
          {m.steps.map((s, i) => {
            const Icon = TIMELINE_ICONS[i] ?? MessageCircle;
            return (
              <li key={s.title} className="relative flex items-center gap-3">
                <span
                  aria-hidden
                  className="umr-pulse absolute -left-[1.13rem] size-2 rounded-full bg-primary"
                  style={{ animationDelay: `${i * 600}ms` }}
                />
                <span className="w-16 shrink-0 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
                  {times[i]}
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-primary/8">
                  <Icon className="size-3.5 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium tracking-tight">{s.title}</span>
                  <span className="block truncate text-[11px] font-light text-muted-foreground">
                    {s.sub}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-surface/40 px-6 py-6">
          <span className="umr-halo grid size-16 place-items-center rounded-full border border-primary/30 bg-primary/10">
            <BotMessageSquare className="size-7 text-primary" />
          </span>
          <p className="mt-4 text-center text-[9px] uppercase leading-relaxed tracking-[0.24em] text-muted-foreground/70">
            {m.automatedLine1}
            <br />
            {m.automatedLine2}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">24/7</p>
        </div>
      </div>
    </ModuleShell>
  );
}

/** Premium autonomous-workforce showcase for the "What UMRAIO® Automates" section. */
export function AutomationShowcase() {
  const t = siteCopy(useLocale().locale).showcase;

  return (
    <section className="relative mt-14 sm:mt-20" aria-labelledby="automates-heading">
      <span
        aria-hidden
        className="umr-signal pointer-events-none absolute inset-x-0 -top-10 h-64 opacity-60"
      />

      <div aria-hidden className="relative mx-auto flex max-w-md items-center justify-center">
        <span className="umr-divider w-full" />
        <span className="umr-pulse absolute size-1.5 rounded-full bg-primary shadow-[0_0_12px_2px_var(--color-primary)]" />
      </div>

      <header className="relative mx-auto mt-10 max-w-2xl text-center sm:mt-14">
        <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-primary/80">
          {t.eyebrow}
        </p>
        <h2
          id="automates-heading"
          className="mt-5 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl"
        >
          {t.headingLead}{" "}
          <span className="text-primary">
            UMRAIO<sup className="align-super text-[0.5em] leading-none">®</sup>
          </span>{" "}
          {t.headingAutomates}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-[1.75] text-muted-foreground sm:text-base">
          {t.intro}
        </p>
      </header>

      <div className="relative mt-12 grid gap-5 lg:grid-cols-12">
        <AnswersEnquiries t={t} />
        <QualifiesProspects t={t} />
        <RecommendsPackages t={t} />
        <FollowsUp t={t} />
      </div>

      <div className="umr-reveal panel mt-8 px-6 py-10 text-center" style={{ animationDelay: "360ms" }}>
        <p className="mx-auto max-w-2xl text-balance text-base font-light leading-relaxed text-foreground/90 sm:text-lg">
          UMRAIO<sup className="align-super text-[0.55em] leading-none">®</sup> {t.closing}
        </p>
        <ol className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {t.pipeline.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="rounded-full border border-border/70 bg-surface/50 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {step}
              </span>
              {i < t.pipeline.length - 1 ? (
                <span aria-hidden className="text-primary/50">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
