import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UsagePanel } from "@/components/settings/UsagePanel";
import {
  PLAN_CTA_LABEL,
  formatPlanPrice,
  foundingNote,
  publicPlans,
  resolveDisplayPlan,
} from "@/lib/billing/pricing.core";
import { fetchAgency, fetchSettings, updateSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/settings/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription & Plan — UMRAIO" },
      {
        name: "description",
        content:
          "Review your UMRAIO plan, seats and renewal date, and switch between Trial, Growth and Scale.",
      },
      { property: "og:title", content: "Subscription & Plan — UMRAIO" },
      { property: "og:description", content: "Plan, seats, usage and renewal for your agency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const queryClient = useQueryClient();
  const { data: agency } = useQuery({ queryKey: ["agency"], queryFn: fetchAgency });
  const { data: settings, isLoading } = useQuery({
    queryKey: ["agency-settings", agency?.id],
    queryFn: () => fetchSettings(agency!.id),
    enabled: Boolean(agency?.id),
  });

  const choose = useMutation({
    mutationFn: async (plan: string) => {
      if (!settings) throw new Error("Settings not loaded.");
      const target = publicPlans().find((item) => item.id === plan);
      return updateSettings(settings.id, {
        plan,
        seats: target?.seats ?? settings.seats,
      });
    },
    onSuccess: () => {
      toast.success("Plan selection recorded. No payment has been taken — our team confirms activation.");
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !settings) return <Skeleton className="h-[420px] rounded-2xl" />;

  const current = resolveDisplayPlan(settings.plan);

  return (
    <div className="space-y-6">
      <UsagePanel />

      <section className="panel space-y-4 p-5">

        <header className="flex items-start gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-2.5">
            <CreditCard className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">Current plan</h2>
            <p className="text-xs text-muted-foreground">Your active subscription and usage.</p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
            <p className="mt-1 font-display text-lg font-bold">{current.name}</p>
            <Badge variant="secondary" className="mt-2 capitalize">
              {settings.plan_status}
            </Badge>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Seats</p>
            <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold">
              <Users className="size-4 text-primary" />
              {settings.seats}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Renews</p>
            <p className="mt-1 font-display text-lg font-bold">
              {settings.renews_at ? new Date(settings.renews_at).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <header className="flex items-start gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-2.5">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">Available plans</h2>
            <p className="text-xs text-muted-foreground">
              Scale your Autonomous AI Business Executive as your agency grows. Selecting a plan
              records your preference — usage limits stay governed by your confirmed entitlement.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const active = plan.value === settings.plan;
            return (
              <div
                key={plan.value}
                className={cn(
                  "flex flex-col rounded-2xl border p-5",
                  active ? "border-primary bg-primary/10" : "border-border bg-surface",
                )}
              >
                <p className="font-display text-lg font-bold">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.price}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5"
                  variant={active ? "outline" : "default"}
                  disabled={active || choose.isPending}
                  onClick={() => choose.mutate(plan.value)}
                >
                  {active ? "Current plan" : `Switch to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
