import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";

import { BrandArchitecture } from "@/components/brand/BrandArchitecture";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | UMRAIO" },
      {
        name: "description",
        content:
          "UMRAIO's Terms of Service covering accounts, subscriptions, acceptable use, integrations, intellectual property, liability and termination.",
      },
      { property: "og:title", content: "Terms of Service | UMRAIO" },
      {
        property: "og:description",
        content:
          "The terms that govern use of the UMRAIO platform by Umrah and travel agencies.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://umraio.com/terms" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Terms of Service | UMRAIO" },
      {
        name: "twitter:description",
        content:
          "The terms that govern use of the UMRAIO platform by Umrah and travel agencies.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://umraio.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
              <ScrollText className="size-3.5 text-primary" />
              Legal
            </span>

            <h1 className="animate-rise mt-8 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Terms of <span className="text-gradient-brand">Service</span>
            </h1>
            <p className="animate-rise mt-4 text-balance text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
              Last updated: {lastUpdated}
            </p>
          </section>

          <article className="animate-rise mt-12 space-y-8 sm:mt-16">
            <PolicySection title="Agreement to These Terms">
              <p>
                These Terms of Service (“Terms”) govern access to and use of the UMRAIO® platform,
                websites and related services (the “Service”), operated by Digital Renaissance
                Metaverse. By creating an account, accessing or using the Service, you agree to be
                bound by these Terms on behalf of yourself and the agency you represent.
              </p>
              <p>
                If you do not agree with these Terms, you must not access or use the Service.
              </p>
            </PolicySection>

            <PolicySection title="The Service">
              <p>
                UMRAIO is a software-as-a-service platform designed for licensed Umrah and travel
                agencies. It provides AI-assisted lead management, customer communication, CRM
                pipelines, knowledge management, analytics and workflow automation. The Service is
                intended for business use only and is not a consumer travel booking platform.
              </p>
            </PolicySection>

            <PolicySection title="Accounts and Eligibility">
              <p>
                You must be at least 18 years old and authorised to act on behalf of your agency to
                register an account. You agree to provide accurate registration information and to keep
                it up to date.
              </p>
              <p>
                You are responsible for safeguarding account credentials, for all activity carried out
                under your account, and for the actions of any team members you invite. You must notify
                us promptly of any suspected unauthorised access.
              </p>
            </PolicySection>

            <PolicySection title="Subscriptions, Plans and Billing">
              <p>
                Access to the Service is provided under subscription plans that define usage
                entitlements such as AI message volume, worker capacity and feature access. Fees, plan
                inclusions and billing frequency are presented at the time of purchase or in your
                account settings.
              </p>
              <p>
                Unless stated otherwise, subscriptions renew automatically for successive periods until
                cancelled. Cancellation takes effect at the end of the current billing period. Fees
                already paid are non-refundable except where required by applicable law.
              </p>
              <p>
                We may adjust pricing or plan entitlements with reasonable prior notice. Continued use
                of the Service after the change takes effect constitutes acceptance of the new terms.
              </p>
            </PolicySection>

            <PolicySection title="Acceptable Use">
              <p>When using the Service, you agree not to:</p>
              <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground">
                <li>Send unsolicited, deceptive, unlawful or harassing messages to any recipient.</li>
                <li>Upload or process data you do not have a lawful basis or permission to process.</li>
                <li>
                  Misrepresent religious rulings, pilgrimage requirements, visa outcomes, pricing or
                  service guarantees.
                </li>
                <li>Attempt to reverse engineer, scrape, overload, probe or disrupt the Service.</li>
                <li>
                  Use the Service to build a competing product, or resell access without written
                  agreement.
                </li>
                <li>
                  Violate applicable laws or the policies of connected platforms, including Meta's
                  WhatsApp Business Platform policies.
                </li>
              </ul>
            </PolicySection>

            <PolicySection title="Customer Responsibilities and Content">
              <p>
                You retain ownership of the data your agency enters into or generates through the
                Service, including lead records, conversations, documents and knowledge base content
                (“Customer Data”). You are solely responsible for the accuracy and lawfulness of that
                data and for obtaining any consents required to contact your customers.
              </p>
              <p>
                You grant us a limited licence to host, process and transmit Customer Data strictly as
                needed to operate and support the Service for you.
              </p>
              <p>
                AI-generated output is a productivity aid, not professional, legal or religious advice.
                You are responsible for reviewing AI-generated content before it is relied upon or sent
                to customers, and for the commercial commitments your agency makes.
              </p>
            </PolicySection>

            <PolicySection title="Third-Party Integrations">
              <p>
                The Service can connect to third-party platforms, including Meta's WhatsApp Business
                Platform, authentication providers and analytics services. Use of those integrations is
                subject to the applicable third-party terms, and you are responsible for maintaining the
                accounts, approvals and permissions those platforms require.
              </p>
              <p>
                We are not responsible for outages, policy changes, rate limits, account suspensions or
                data practices of third-party platforms outside our control.
              </p>
            </PolicySection>

            <PolicySection title="Intellectual Property">
              <p>
                UMRAIO®, RÉNAIO.CORE™, the Islamic Implementation Layer™, UMRAVERSE®, and all software,
                models, interfaces, designs, documentation and trademarks associated with the Service
                remain the exclusive property of Digital Renaissance Metaverse and its licensors.
              </p>
              <p>
                Subject to these Terms and payment of applicable fees, we grant you a limited,
                non-exclusive, non-transferable, revocable right to use the Service for your agency's
                internal business purposes. No other rights are granted.
              </p>
            </PolicySection>

            <PolicySection title="Service Availability and Support">
              <p>
                We aim to provide a reliable, continuously available Service, but we do not guarantee
                uninterrupted operation. Maintenance, upgrades, third-party outages or events beyond our
                reasonable control may temporarily affect availability.
              </p>
              <p>
                We may add, modify or discontinue features. Where a change materially reduces core
                functionality, we will use reasonable efforts to give advance notice.
              </p>
            </PolicySection>

            <PolicySection title="Privacy and Data Protection">
              <p>
                Our handling of personal information is described in our{" "}
                <Link
                  to="/privacy-policy"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  Privacy Policy
                </Link>
                . Deletion requests are handled as described on our{" "}
                <Link
                  to="/data-deletion"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  Data Deletion Instructions
                </Link>{" "}
                page. In relation to Customer Data, your agency acts as the controller and UMRAIO acts
                as a processor.
              </p>
            </PolicySection>

            <PolicySection title="Disclaimers">
              <p>
                To the maximum extent permitted by law, the Service is provided “as is” and “as
                available” without warranties of any kind, whether express or implied, including
                warranties of merchantability, fitness for a particular purpose and non-infringement. We
                do not warrant that AI output will be accurate, complete or suitable for any specific
                commercial decision.
              </p>
            </PolicySection>

            <PolicySection title="Limitation of Liability">
              <p>
                To the maximum extent permitted by law, neither Digital Renaissance Metaverse nor its
                affiliates, officers, employees or suppliers shall be liable for any indirect,
                incidental, special, consequential or punitive damages, or for loss of profits, revenue,
                goodwill or data, arising out of or in connection with the Service.
              </p>
              <p>
                Our aggregate liability for all claims relating to the Service shall not exceed the
                total subscription fees paid by you for the twelve (12) months immediately preceding the
                event giving rise to the claim.
              </p>
            </PolicySection>

            <PolicySection title="Indemnity">
              <p>
                You agree to indemnify and hold harmless Digital Renaissance Metaverse against claims,
                damages, liabilities and reasonable legal costs arising from your Customer Data, your
                messaging activity, your breach of these Terms, or your violation of applicable law or
                third-party platform policies.
              </p>
            </PolicySection>

            <PolicySection title="Suspension and Termination">
              <p>
                You may terminate your subscription at any time from your account settings or by
                contacting us. We may suspend or terminate access if you materially breach these Terms,
                use the Service unlawfully, create risk for other users or connected platforms, or fail
                to pay fees when due.
              </p>
              <p>
                Following termination, access to the Service ends and Customer Data is deleted or
                anonymised in accordance with our retention procedures and applicable law. You may
                request an export of your data before termination takes effect.
              </p>
            </PolicySection>

            <PolicySection title="Governing Law">
              <p>
                These Terms are governed by the laws of Malaysia, without regard to conflict-of-law
                principles. The courts of Malaysia shall have exclusive jurisdiction over any dispute
                arising from these Terms, without prejudice to mandatory consumer or data protection
                rights available to you under local law.
              </p>
            </PolicySection>

            <PolicySection title="Changes to These Terms">
              <p>
                We may update these Terms to reflect changes to the Service, our business or legal
                requirements. The revised version will be posted on this page with an updated “Last
                updated” date. Continued use of the Service after the update constitutes acceptance.
              </p>
            </PolicySection>

            <PolicySection title="Contact Information">
              <p>For questions about these Terms, please contact us:</p>
              <p className="mt-2">
                <strong className="text-foreground">Email:</strong>{" "}
                <a
                  href="mailto:legal@umraio.com"
                  className="text-primary underline underline-offset-4 transition-colors hover:text-primary-glow"
                >
                  legal@umraio.com
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
