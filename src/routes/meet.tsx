import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { MeetExecutive } from "@/components/marketing/MeetExecutive";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/meet")({
  head: () => ({
    meta: [
      { title: "Meet Your AI Business Executive™ | UMRAIO®" },
      {
        name: "description",
        content:
          "Tell UMRAIO about your Umrah agency and let its AI Autonomous Business Executive™ identify where automation can improve your sales workflow — before you subscribe.",
      },
      { property: "og:title", content: "Meet Your AI Business Executive™ | UMRAIO®" },
      {
        property: "og:description",
        content:
          "See how an autonomous AI business executive can work inside your Umrah agency — a guided business diagnosis, not a generic chatbot.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://umraio.com/meet" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Meet Your AI Business Executive™ | UMRAIO®" },
      {
        name: "twitter:description",
        content:
          "A guided business demonstration with UMRAIO's AI Autonomous Business Executive™ for Umrah agencies.",
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
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" aria-hidden />
              Back
            </Link>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-10">
          <section className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Meet Your <span className="text-gradient-brand">AI Business Executive</span>
              <sup className="ml-0.5 align-super text-[0.5em] leading-none">™</sup>
            </h1>
            <p className="mt-4 text-balance text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
              See how an autonomous AI business executive can work inside your Umrah agency. Tell
              UMRAIO how your agency operates, and its AI Business Executive will identify where
              automation can improve your sales workflow.
            </p>
          </section>

          <div className="mt-10">
            <MeetExecutive />
          </div>
        </main>
      </div>
    </div>
  );
}
