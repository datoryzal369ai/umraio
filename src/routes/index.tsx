import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BotMessageSquare, CalendarClock, Sparkles, Users } from "lucide-react";

import wordmarkAsset from "@/assets/umraio-wordmark-clear.png.asset.json";

import { BrandArchitecture } from "@/components/brand/BrandArchitecture";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const faqs = [
  {
    q: "What is UMRAIO®?",
    a: "UMRAIO® is an Autonomous AI Business Executive built for Umrah agencies. It answers enquiries, qualifies prospects, recommends packages and follows up so your team can focus on closing bookings.",
  },
  {
    q: "Who is UMRAIO® for?",
    a: "Licensed Umrah and travel agencies that handle enquiries over WhatsApp and want to convert more of them into bookings.",
  },
  {
    q: "How does UMRAIO® work with WhatsApp?",
    a: "You connect your WhatsApp Business number in settings. UMRAIO® then replies to incoming messages in Bahasa Malaysia or English, using your agency's packages and knowledge base.",
  },
  {
    q: "Can UMRAIO® capture and follow up with leads?",
    a: "Yes. Every conversation is captured as a lead with budget, pax, travel window and intent, then scored and placed in your CRM pipeline with scheduled follow-ups.",
  },
  {
    q: "Does UMRAIO® replace human sales consultants?",
    a: "No. UMRAIO® handles first response, qualification and follow-up around the clock, and hands over to your consultants whenever a human touch is needed.",
  },
  {
    q: "What powers UMRAIO®?",
    a: "RÉNAI.CORE™ provides the autonomous intelligence layer that powers UMRAIO®. UMRAVERSE® provides the Umrah ecosystem, knowledge, business and customer context. UMRAIO® is the autonomous AI business executive built for modern Umrah agencies.",
  },
];


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UMRAIO® | Autonomous AI Business Executive for Umrah Agencies" },
      {
        name: "description",
        content:
          "UMRAIO® is the Autonomous AI Business Executive built for licensed Umrah agencies. Automate WhatsApp conversations, generate leads, create marketing campaigns, increase bookings and grow your business with intelligent AI executives.",
      },
      {
        property: "og:title",
        content: "UMRAIO® | Autonomous AI Business Executive for Umrah Agencies",
      },
      {
        property: "og:description",
        content:
          "UMRAIO® is the Autonomous AI Business Executive built for licensed Umrah agencies. Automate WhatsApp conversations, generate leads, create marketing campaigns and increase bookings.",
      },
      { property: "og:url", content: "https://umraio.com/" },
      { property: "og:type", content: "website" },
      {
        name: "twitter:title",
        content: "UMRAIO® | Autonomous AI Business Executive for Umrah Agencies",
      },
      {
        name: "twitter:description",
        content:
          "Autonomous AI Business Executive for licensed Umrah agencies — WhatsApp automation, lead generation, marketing and bookings.",
      },
      { property: "og:image", content: `https://umraio.com${wordmarkAsset.url}` },
      { name: "twitter:image", content: `https://umraio.com${wordmarkAsset.url}` },
    ],
    links: [{ rel: "canonical", href: "https://umraio.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Index,
});

const capabilities = [
  {
    icon: BotMessageSquare,
    title: "Answers enquiries",
    body: "Replies to WhatsApp messages instantly, in Bahasa Malaysia or English, with your agency's tone.",
  },
  {
    icon: Users,
    title: "Qualifies prospects",
    body: "Captures budget, pax, travel window and intent — then scores every lead automatically.",
  },
  {
    icon: Sparkles,
    title: "Recommends packages",
    body: "Matches enquiries to your live package catalogue with pricing, hotels and departure dates.",
  },
  {
    icon: CalendarClock,
    title: "Follows up",
    body: "Runs structured follow-up sequences so no prospect goes cold while your team sleeps.",
  },
];

const trust = [
  { label: "Always working", value: "24/7" },
  { label: "More leads", value: "3×" },
  { label: "Time saved", value: "85%" },
  { label: "AI-powered", value: "100%" },
];

function Index() {
  const { user, loading } = useAuth();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-aurora">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-particles opacity-70" />

      <div className="relative">
        <header className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-8 sm:px-10 sm:py-10">
          <BrandLogo showTagline />
          <nav className="flex items-center gap-2 sm:gap-3">
            {loading ? null : user ? (
              <Button asChild size="sm" className="rounded-full">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden rounded-full sm:inline-flex"
                >
                  <Link to="/auth" search={{ mode: "login", redirect: undefined }}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-full shadow-elevated">
                  <Link to="/auth" search={{ mode: "register", redirect: undefined }}>
                    Start Free Trial
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-6 pb-28 sm:px-10">
          <section className="flex flex-col items-center pt-14 text-center sm:pt-24">
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/60 px-4 py-1.5 text-[10px] font-light uppercase tracking-[0.28em] text-muted-foreground shadow-[0_0_24px_-12px_var(--color-primary)] backdrop-blur sm:text-[11px]">
              <Sparkles className="size-3.5 text-primary" />
              <span className="whitespace-nowrap">
                Powered by{" "}
                <span className="font-medium text-primary">
                  RÉNAI.CORE
                  <sup className="ml-0.5 align-super text-[0.62em] leading-none tracking-normal">™</sup>
                </span>
              </span>
            </span>



            <div
              className="animate-rise relative mt-12 w-full max-w-3xl"
              style={{ animationDelay: "60ms" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
                style={{
                  background:
                    "radial-gradient(50% 60% at 50% 50%, rgba(0,215,255,0.22), transparent 70%)",
                }}
              />
              <img
                src={wordmarkAsset.url}
                alt="UMRAIO® — Autonomous AI Business Executive"
                className="mx-auto w-full max-w-2xl object-contain"
              />
            </div>
            <p
              className="animate-rise mt-4 text-[10px] font-light uppercase tracking-[0.42em] text-primary/90 sm:text-xs"
              style={{ animationDelay: "120ms" }}
            >
              Autonomous AI Business Executive
            </p>

            <h1
              className="animate-rise mt-12 max-w-4xl text-balance text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "180ms" }}
            >
              Your Autonomous AI Business Executive for{" "}
              <span className="text-gradient-brand">Modern Umrah Agencies</span>
            </h1>
            <p
              className="animate-rise mt-7 max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg"
              style={{ animationDelay: "240ms" }}
            >
              Acquire more leads. Convert more bookings. Automate marketing. Reply to WhatsApp
              instantly. Scale your agency with autonomous AI workers.
            </p>

            <div
              className="animate-rise mt-11 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
              style={{ animationDelay: "300ms" }}
            >
              <Button
                asChild
                size="lg"
                className="h-13 w-full rounded-2xl bg-primary px-8 text-base font-semibold text-background shadow-elevated transition-transform duration-300 hover:-translate-y-0.5 hover:bg-primary sm:w-auto"
              >
                <Link to="/auth" search={{ mode: "register", redirect: undefined }}>
                  Start Free Trial
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="btn-glass h-13 w-full rounded-2xl px-8 text-base font-medium sm:w-auto"
              >
                <Link to="/auth" search={{ mode: "login", redirect: undefined }}>
                  Book Live Demo
                </Link>
              </Button>
            </div>

            <dl
              className="animate-rise panel mt-16 grid w-full grid-cols-2 gap-px overflow-hidden p-0 sm:grid-cols-4"
              style={{ animationDelay: "360ms" }}
            >
              {trust.map((item) => (
                <div key={item.label} className="px-6 py-8">
                  <dt className="text-3xl font-extrabold text-primary sm:text-4xl">{item.value}</dt>
                  <dd className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-24" aria-labelledby="automates-heading">
            <h2
              id="automates-heading"
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
            >
              What UMRAIO<sup className="align-super text-[0.55em] leading-none">®</sup> Automates
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((item, i) => (
                <article
                  key={item.title}
                  className="animate-rise panel panel-hover p-8"
                  style={{ animationDelay: `${420 + i * 70}ms` }}
                >
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-primary/10">
                    <item.icon className="size-5 text-primary" />
                  </span>
                  <h3 className="mt-6 text-base font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2.5 text-sm font-light leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-24" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Frequently Asked Questions
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-4">
              {faqs.map((item) => (
                <article key={item.q} className="panel p-6 text-left">
                  <h3 className="text-base font-semibold tracking-tight">{item.q}</h3>
                  <p className="mt-2.5 text-sm font-light leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </article>
              ))}
            </div>
          </section>

        </main>

        <BrandArchitecture />


      </div>

    </div>
  );
}


