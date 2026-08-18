import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import raioAsset from "@/assets/raio-executive.png.asset.json";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MeetExecutive } from "@/components/marketing/MeetExecutive";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/meet")({
  head: () => ({
    meta: [
      { title: "Meet Your Autonomous AI Business Executive™ | UMRAIO®" },
      {
        name: "description",
        content:
          "Tell RAIŌ how your Umrah agency works. UMRAIO's Autonomous AI Business Executive™ will identify where automation can improve your sales workflow — before you subscribe.",
      },
      { property: "og:title", content: "Meet Your Autonomous AI Business Executive™ | UMRAIO®" },
      {
        property: "og:description",
        content:
          "Meet RAIŌ — UMRAIO's Autonomous AI Business Executive™ for Umrah agencies. A guided business diagnosis, not a generic chatbot.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://umraio.com/meet" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Meet Your Autonomous AI Business Executive™ | UMRAIO®" },
      {
        name: "twitter:description",
        content:
          "A guided business demonstration with RAIŌ — UMRAIO's Autonomous AI Business Executive™ for Umrah agencies.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://umraio.com/meet" }],
  }),

  component: MeetPage,
});

function MeetPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-aurora">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />

      <div className="relative">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-10 sm:py-8">
          <BrandLogo />
          <Button asChild variant="ghost" className="h-11 rounded-full px-4">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" aria-hidden />
              Back
            </Link>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-10">
          <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
            <div className="text-center lg:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">
                Meet your AI Executive
              </p>
              <h1 className="mt-3 text-balance text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                Autonomous AI
                <br />
                <span className="text-gradient-brand">Business Executive</span>
                <sup className="ml-0.5 align-super text-[0.4em] leading-none">™</sup>
              </h1>
              <p className="mt-4 text-balance text-base font-light text-muted-foreground sm:text-lg">
                Your intelligent AI executive for modern Umrah agencies.
              </p>
              <p className="mt-4 text-balance text-sm font-light leading-relaxed text-muted-foreground">
                Tell RAIŌ how your agency works. RAIŌ will understand your workflow, identify
                opportunities and show you where UMRAIO can help your agency sell, follow up and
                grow.
              </p>
            </div>

            <div className="order-first flex flex-col items-center lg:order-none">
              <img
                src={raioAsset.url}
                alt="RAIŌ — UMRAIO's Autonomous AI Business Executive™"
                className="w-full max-w-[280px] object-contain drop-shadow-[0_24px_60px_hsl(var(--primary)/0.25)] sm:max-w-[360px]"
                width={1159}
                height={1332}
              />
              <p className="mt-2 font-display text-lg font-bold tracking-[0.2em]">RAIŌ</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                The Autonomous AI Business Executive™
              </p>
            </div>
          </section>

          <div className="mt-10">
            <MeetExecutive />
          </div>
        </main>

      </div>
    </div>
  );
}
