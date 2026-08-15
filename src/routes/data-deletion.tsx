import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";

import { BrandArchitecture } from "@/components/brand/BrandArchitecture";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Data Deletion Instructions | UMRAIO" },
      {
        name: "description",
        content:
          "How to request deletion of your UMRAIO account and associated personal data, including data received through authorized Meta and WhatsApp integrations.",
      },
      { property: "og:title", content: "Data Deletion Instructions | UMRAIO" },
      {
        property: "og:description",
        content:
          "Step-by-step instructions to request deletion of your UMRAIO account and associated personal data.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://umraio.com/data-deletion" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Data Deletion Instructions | UMRAIO" },
      {
        name: "twitter:description",
        content:
          "Step-by-step instructions to request deletion of your UMRAIO account and associated personal data.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://umraio.com/data-deletion" }],
  }),
  component: DataDeletionPage,
});

function DataDeletionPage() {
  const lastUpdated = "15 August 2026";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-aurora">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-particles opacity-70" />

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

        <main className="mx-auto w-full max-w-4xl px-5 pb-20 sm:px-10">
          <section className="mx-auto max-w-3xl text-center">
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/60 px-4 py-1.5 text-[10px] font-light uppercase tracking-[0.28em] text-muted-foreground shadow-[0_0_24px_-12px_var(--color-primary)] backdrop-blur sm:text-[11px]">
              <Trash2 className="size-3.5 text-primary" />
              Legal
            </span>

            <h1 className="animate-rise mt-8 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Data <span className="text-gradient-brand">Deletion</span> Instructions
            </h1>
            <p className="animate-rise mt-4 text-balance text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
              Last updated: {lastUpdated}
            </p>
          </section>

          <article className="animate-rise mt-12 space-y-8 sm:mt-16">
            <PolicySection title="Overview">
              <p>
                UMRAIO® is a software-as-a-service platform used by licensed Umrah and travel agencies
                to manage enquiries, customer conversations and sales operations. This page explains how
                to request deletion of a UMRAIO account and the personal data associated with it,
                including data received through authorised Meta integrations such as the WhatsApp
                Business Platform.
              </p>
            </PolicySection>

            <PolicySection title="How to Request Deletion">
              <p>
                To request deletion, send an email to{" "}
                <a
                  href="mailto:privacy@umraio.com?subject=Data%20Deletion%20Request"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  privacy@umraio.com
                </a>{" "}
                with the subject line <strong className="text-foreground">“Data Deletion Request”</strong>{" "}
                and include the following:
              </p>
              <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground">
                <li>The email address registered with your UMRAIO account.</li>
                <li>Your agency or business name, if applicable.</li>
                <li>
                  The WhatsApp business phone number connected to UMRAIO, if your request relates to
                  WhatsApp data.
                </li>
                <li>
                  Whether you want your entire account deleted, or only specific records (for example a
                  single customer contact or conversation).
                </li>
              </ul>
              <p>
                Agency administrators can also delete individual leads, conversations, notes and
                knowledge base records directly inside the UMRAIO application at any time, without
                contacting us.
              </p>
            </PolicySection>

            <PolicySection title="Verification">
              <p>
                To protect your account, we verify every deletion request before acting on it. We will
                confirm that the request comes from the registered account owner or an authorised
                administrator, normally by replying to the registered email address. We may ask for
                additional information where the identity of the requester is unclear.
              </p>
              <p>
                Requests we cannot verify will not be processed, and we will inform you of the reason.
              </p>
            </PolicySection>

            <PolicySection title="What Gets Deleted">
              <p>Once a request is verified, we delete or irreversibly anonymise:</p>
              <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground">
                <li>Account and profile information, including user and team records.</li>
                <li>Agency business information and configuration settings.</li>
                <li>Lead, customer contact and CRM records stored in your workspace.</li>
                <li>
                  Conversation history and message content, including messages exchanged through
                  connected WhatsApp Business numbers.
                </li>
                <li>Knowledge base content, uploaded documents and AI task history.</li>
                <li>Stored integration credentials, which are revoked and removed.</li>
              </ul>
            </PolicySection>

            <PolicySection title="Timeframe">
              <p>
                We acknowledge deletion requests within 5 business days and complete verified deletions
                within 30 days. Residual copies held in encrypted backups are removed on our standard
                backup rotation cycle, normally within 90 days, and are not used for any other purpose
                in the meantime.
              </p>
            </PolicySection>

            <PolicySection title="Information We May Retain">
              <p>
                UMRAIO will process eligible deletion requests in accordance with applicable law and its
                data-retention obligations. We may retain a limited set of records where retention is
                legally required or necessary, for example:
              </p>
              <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground">
                <li>Invoices, payment and tax records required by financial regulations.</li>
                <li>Security, fraud-prevention and abuse-related logs.</li>
                <li>Records needed to establish, exercise or defend legal claims.</li>
              </ul>
              <p>
                Retained records are limited to what is strictly necessary, access-restricted, and
                deleted once the applicable retention period ends.
              </p>
            </PolicySection>

            <PolicySection title="If You Are a Customer of an Agency">
              <p>
                If you were contacted by an agency that uses UMRAIO and you wish to have your details
                removed, please contact that agency directly, as it controls the customer data it has
                entered. If you are unable to reach the agency, email us at{" "}
                <a
                  href="mailto:privacy@umraio.com"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  privacy@umraio.com
                </a>{" "}
                and we will forward your request to the responsible agency and assist where we are
                permitted to do so.
              </p>
            </PolicySection>

            <PolicySection title="Contact Information">
              <p>For any question about deletion requests, please contact us:</p>
              <p className="mt-2">
                <strong className="text-foreground">Email:</strong>{" "}
                <a
                  href="mailto:privacy@umraio.com"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  privacy@umraio.com
                </a>
              </p>
              <p className="mt-1">
                <strong className="text-foreground">Website:</strong>{" "}
                <a
                  href="https://umraio.com"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  https://umraio.com
                </a>
              </p>
              <p className="mt-1">
                See also our{" "}
                <Link
                  to="/privacy-policy"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  to="/terms"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </PolicySection>
          </article>
        </main>

        <BrandArchitecture />
      </div>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-6 sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-3 text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}
