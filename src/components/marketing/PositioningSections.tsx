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

/** Small uppercase eyebrow label, matching the existing showcase style. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-primary/80">{children}</p>
  );
}

/* ── 2. What makes UMRAIO different ─────────────────────────────── */
export function BuiltForUmrah() {
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="built-for-umrah-heading">
      <div className="panel mx-auto max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-12">
        <Eyebrow>What makes UMRAIO® different</Eyebrow>
        <h2
          id="built-for-umrah-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          Built for Umrah — not generic business automation.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-[1.8] text-muted-foreground sm:text-base">
          UMRAIO® is designed around the realities of Umrah agencies: enquiries, qualification,
          package discovery, sales conversations, follow-up, customer trust and operational
          execution.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm font-light leading-[1.8] text-foreground/85 sm:text-base">
          Unlike generic AI automation, UMRAIO combines business intelligence with Umrah-specific
          context and governed Islamic implementation.
        </p>
      </div>
    </section>
  );
}

/* ── 4. Islamic Implementation Layer ────────────────────────────── */
const islamicCards = [
  {
    index: "01",
    icon: Compass,
    title: "Shariah-aware context",
    body: "Relevant Islamic principles and domain considerations can inform applicable customer, product and business workflows.",
  },
  {
    index: "02",
    icon: CheckCircle2,
    title: "Halal baseline",
    body: "A structured baseline for relevant Umrah products, services, offers and operational processes.",
  },
  {
    index: "03",
    icon: ScrollText,
    title: "Islamic business implementation",
    body: "Translate relevant principles and ethical requirements into practical workflows, policies and responsible business practices.",
  },
  {
    index: "04",
    icon: ShieldCheck,
    title: "Governed AI execution",
    body: "AI actions operate within defined business rules, agency policies, human oversight and escalation controls.",
  },
];

export function IslamicImplementationLayer() {
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="islamic-layer-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>Architecture layer</Eyebrow>
        <h2
          id="islamic-layer-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          Islamic Implementation Layer
          <sup className="align-super text-[0.45em] leading-none">™</sup>
        </h2>
        <p className="mt-4 text-sm font-light leading-relaxed text-primary/85 sm:text-base">
          From Islamic principles to responsible Umrah operations.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-[1.8] text-muted-foreground">
          UMRAIO® is designed to support relevant Islamic principles, halal considerations, ethical
          business practices and governance requirements within Umrah-related workflows.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {islamicCards.map((card, i) => (
          <article
            key={card.index}
            className="umr-reveal panel panel-hover flex min-w-0 items-start gap-4 p-6 sm:p-7"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
              <card.icon className="size-5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">
                {card.index}
              </p>
              <h3 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">
                {card.title}
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                {card.body}
              </p>
            </div>
          </article>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] font-light leading-relaxed text-muted-foreground/70">
        Relevant Shariah and sensitive domain matters remain subject to appropriate governance and
        expert oversight.
      </p>
    </section>
  );
}

/* ── 5. Intelligence loop ───────────────────────────────────────── */
const loopSteps = ["Understand", "Reason", "Recommend", "Execute", "Follow up", "Learn"];

export function IntelligenceLoop() {
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="loop-heading">
      <div className="panel px-6 py-10 text-center sm:px-10 sm:py-12">
        <Eyebrow>The UMRAIO® intelligence loop</Eyebrow>
        <h2
          id="loop-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-3xl"
        >
          Intelligence determines what can be done.
          <br className="hidden sm:block" /> Governance determines how it should be done.
        </h2>

        <ol className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {loopSteps.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="rounded-full border border-border/70 bg-surface/50 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {step}
              </span>
              {i < loopSteps.length - 1 ? (
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
          Islamic Implementation adds principles and governance context to the operational
          intelligence layer.
        </p>
      </div>
    </section>
  );
}

/* ── 7. Customer trust ──────────────────────────────────────────── */
export function CustomerTrust() {
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
          Umrah is not an ordinary transaction.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-[1.8] text-muted-foreground sm:text-base">
          Umrah customers are making decisions involving trust, faith, family, finances and travel.
          That requires more than generic automation.
        </p>
        <p className="mt-4 text-sm font-light leading-relaxed text-foreground/85 sm:text-base">
          UMRAIO® is designed to operate within that context.
        </p>
      </div>
    </section>
  );
}

/* ── 8 + 9 + 10. Executive, governed autonomy, human + AI ───────── */
export function GovernedAutonomy() {
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="governed-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>Autonomy with oversight</Eyebrow>
        <h2
          id="governed-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          Governed autonomy
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-[1.8] text-muted-foreground">
          An autonomous business executive that understands your agency, your customers, your
          packages and your sales workflow.
        </p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <article className="panel panel-hover p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <Brain className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">
            Autonomous does not mean uncontrolled
          </h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            UMRAIO® is designed to operate within defined agency rules, knowledge boundaries,
            approval controls, escalation paths and human oversight.
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            For Islamic and sensitive domain matters, appropriate human and qualified expert
            oversight remains essential.
          </p>
        </article>

        <article className="panel panel-hover p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">Human + AI</h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            UMRAIO® does not replace agency owners, sales consultants, operations teams or qualified
            Islamic scholars.
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            UMRAIO handles repetitive intelligence and execution so humans can focus on judgement,
            relationships, exceptions and high-value decisions.
          </p>
          <p className="mt-4 text-sm font-light leading-relaxed text-foreground/85">
            From first enquiry to follow-up, UMRAIO® helps your team move faster without removing
            human judgement where it matters.
          </p>
        </article>
      </div>
    </section>
  );
}

/* ── 12. Differentiation ladder ─────────────────────────────────── */
const ladder = [
  { tier: "Generic CRM", body: "Stores information." },
  { tier: "AI chatbot", body: "Answers questions." },
  { tier: "AI assistant", body: "Helps humans." },
  { tier: "AI agent", body: "Executes tasks." },
  { tier: "Vertical AI", body: "Understands a domain." },
  {
    tier: "UMRAIO®",
    body: "Understands Umrah context, reasons, recommends, executes and follows up.",
    highlight: true,
  },
  {
    tier: "UMRAIO® with Islamic Implementation",
    body: "Adds relevant Islamic principles, halal baseline, ethical governance and responsible implementation context.",
    highlight: true,
  },
];

export function DifferentiationLadder() {
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="ladder-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>Where UMRAIO® sits</Eyebrow>
        <h2
          id="ladder-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          From storing data to executing business
        </h2>
      </header>

      <ol className="mx-auto mt-10 grid max-w-3xl gap-3">
        {ladder.map((row) => (
          <li
            key={row.tier}
            className={
              row.highlight
                ? "panel grid gap-1 border-primary/35 bg-primary/8 p-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5"
                : "panel grid gap-1 p-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5"
            }
          >
            <p
              className={
                row.highlight
                  ? "text-sm font-semibold tracking-tight text-primary"
                  : "text-sm font-semibold tracking-tight text-foreground/85"
              }
            >
              {row.tier}
            </p>
            <p className="text-sm font-light leading-relaxed text-muted-foreground">{row.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── 13. UMRAVERSE relationship ─────────────────────────────────── */
const stack = [
  { name: "Digital Renaissance Metaverse™", role: "Ecosystem architect" },
  { name: "RÉNAI.CORE™", role: "Autonomous intelligence core" },
  {
    name: "Islamic Implementation Layer™",
    role: "Principles • Halal • Ethics • Governance • Implementation",
  },
  { name: "UMRAVERSE®", role: "Umrah digital ecosystem" },
  { name: "UMRAIO®", role: "Autonomous AI business executive" },
  { name: "Umrah agency", role: "Business outcomes" },
];


export function EcosystemRelationship() {
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="ecosystem-heading">
      <header className="mx-auto max-w-2xl text-center">
        <Eyebrow>Architecture</Eyebrow>
        <h2
          id="ecosystem-heading"
          className="mt-5 text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        >
          How UMRAIO® fits the ecosystem
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm font-light leading-[1.8] text-muted-foreground">
          UMRAVERSE® is the ecosystem and domain intelligence layer. UMRAIO® is the autonomous
          business executive operating within that ecosystem.
        </p>
      </header>

      <ol className="mx-auto mt-10 flex max-w-xl flex-col items-stretch">
        {stack.map((layer, i) => (
          <li key={layer.name} className="flex flex-col items-center">
            <div className="panel w-full px-5 py-4 text-center">
              <p className="text-sm font-semibold tracking-tight sm:text-base">{layer.name}</p>
              <p className="mt-1 text-[10px] font-light uppercase tracking-[0.24em] text-muted-foreground/80">
                {layer.role}
              </p>
            </div>
            {i < stack.length - 1 ? (
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
  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="closing-heading">
      <div className="panel mx-auto max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-12">
        <h2
          id="closing-heading"
          className="text-balance text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-3xl"
        >
          AI for Umrah is no longer just about answering questions.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-[1.8] text-muted-foreground sm:text-base">
          UMRAIO® brings autonomous intelligence into the real business workflow — from enquiry to
          conversion and follow-up.
        </p>
        <p className="mt-6 text-sm font-light leading-[1.9] text-foreground/85 sm:text-base">
          Built for Umrah.
          <br />
          Powered by autonomous intelligence.
          <br />
          Designed with responsible Islamic implementation.
        </p>
      </div>
    </section>
  );
}
