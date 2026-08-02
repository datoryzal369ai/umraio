import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BotMessageSquare, CalendarClock, Sparkles, Users } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UMRAIO — AI Sales Executive for Umrah Agencies" },
      {
        name: "description",
        content:
          "UMRAIO answers WhatsApp enquiries, qualifies prospects, recommends packages and follows up automatically for Malaysian Umrah agencies.",
      },
      { property: "og:title", content: "UMRAIO — AI Sales Executive for Umrah Agencies" },
      {
        property: "og:description",
        content:
          "Answer enquiries, qualify prospects and close more Umrah bookings with an AI sales executive.",
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

function Index() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-aurora">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <BrandLogo showTagline />
        <nav className="flex items-center gap-2">
          {loading ? null : user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "login", redirect: undefined }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "register", redirect: undefined }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24">
        <section className="pt-14 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Powered by Digital Renaissance Metaverse
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            The <span className="text-gradient-brand">AI Sales Executive</span> for Umrah agencies
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Not a chatbot. A trained sales executive that works every enquiry, qualifies every
            prospect and follows up until the booking is confirmed.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "register", redirect: undefined }}>
                Create your agency account
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "login", redirect: undefined }}>
                Sign in
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item) => (
            <article key={item.title} className="panel p-6">
              <item.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
