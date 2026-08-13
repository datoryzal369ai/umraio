import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ScrollText, UserCheck, PackageCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  REVIEW_STATUS_LABEL,
  SEVERITY_TONE,
  fetchExpertReviews,
  fetchIslamicPolicies,
  fetchPackageReviewStatus,
  fetchPolicyDecisions,
} from "@/lib/islamic-governance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings/governance")({
  head: () => ({
    meta: [
      { title: "Islamic Implementation Layer — UMRAIO" },
      {
        name: "description",
        content:
          "Review the governance policies, halal baseline statuses and expert-review requests that constrain UMRAIO's autonomous actions.",
      },
      { property: "og:title", content: "Islamic Implementation Layer — UMRAIO" },
      {
        property: "og:description",
        content: "Governed AI: policy register, audit trail and qualified human oversight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GovernancePage,
});

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 rounded-lg border border-border p-2 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function GovernancePage() {
  const policies = useQuery({ queryKey: ["islamic-policies"], queryFn: fetchIslamicPolicies });
  const decisions = useQuery({ queryKey: ["islamic-decisions"], queryFn: () => fetchPolicyDecisions() });
  const reviews = useQuery({ queryKey: ["islamic-reviews"], queryFn: () => fetchExpertReviews() });
  const packages = useQuery({ queryKey: ["package-review-status"], queryFn: fetchPackageReviewStatus });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <h1 className="text-lg font-semibold text-foreground">Islamic Implementation Layer™</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A governed architectural layer that constrains what the Autonomous AI Business Executive™
          may claim or do. UMRAIO is <strong className="text-foreground">not</strong> a mufti,
          Islamic scholar, fatwa body or Shariah authority, and it never issues religious rulings.
          Matters that require religious judgement are routed to qualified humans for review.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Policies are managed by the platform and are read-only here. Every policy decision is
          written to the audit trail with its policy code, version, source and authority.
        </p>
      </div>

      <Section
        icon={ScrollText}
        title="Active policy register"
        description="Deterministic rules evaluated before a governed action executes."
      >
        {policies.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !policies.data?.length ? (
          <p className="text-sm text-muted-foreground">No active policies.</p>
        ) : (
          <ul className="space-y-3">
            {policies.data.map((p) => (
              <li key={p.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.code} v{p.version}
                  </span>
                  <Badge variant="outline" className={cn(SEVERITY_TONE[p.severity])}>
                    {p.severity.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline">{p.scope.replace("_", " ")}</Badge>
                  {p.requires_human_review ? (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                      Qualified human review
                    </Badge>
                  ) : null}
                  <Badge variant="outline">{p.agency_id ? "Agency" : "Platform"}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{p.principle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.rule_text}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Source: {p.source} · Authority: {p.authority} · In force since{" "}
                  {new Date(p.effective_from).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        icon={PackageCheck}
        title="Halal baseline status"
        description="Unknown status means review pending — never halal, never haram."
      >
        {packages.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !packages.data?.length ? (
          <p className="text-sm text-muted-foreground">No packages yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {packages.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate text-sm text-foreground">{p.name}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    p.halal_review_status === "REVIEWED"
                      ? "border-primary/40 text-primary"
                      : p.halal_review_status === "REJECTED"
                        ? "border-destructive/40 text-destructive"
                        : "border-amber-500/40 text-amber-400",
                  )}
                >
                  {REVIEW_STATUS_LABEL[p.halal_review_status] ?? p.halal_review_status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        icon={UserCheck}
        title="Expert review requests"
        description="Religious questions routed to a qualified human. No reviewer is assigned automatically."
      >
        {reviews.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !reviews.data?.length ? (
          <p className="text-sm text-muted-foreground">No review requests raised.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.data.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{r.title}</span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                    {String((r.meta as { review_status?: string })?.review_status ?? "PENDING")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Raised {new Date(r.created_at).toLocaleString()} · Reviewer: unassigned
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        icon={ShieldCheck}
        title="Policy decision audit"
        description="Every governed check, allowed or blocked, with its policy reference."
      >
        {decisions.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !decisions.data?.length ? (
          <p className="text-sm text-muted-foreground">No policy decisions recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {decisions.data.map((d) => {
              const meta = d.meta as {
                policy_outcome?: string;
                policy_code?: string;
                policy_version?: number;
                authority?: string;
              };
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 text-foreground">{d.action}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {meta.policy_code ? (
                      <span className="font-mono">
                        {meta.policy_code} v{meta.policy_version ?? 1}
                      </span>
                    ) : null}
                    <Badge variant="outline">{meta.policy_outcome ?? "—"}</Badge>
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
