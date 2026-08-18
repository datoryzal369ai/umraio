import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PLAN_CTA_LABEL,
  formatPlanPrice,
  foundingNote,
  publicPlans,
} from "@/lib/billing/pricing.core";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const plans = publicPlans();

  return (
    <section className="mt-24" aria-labelledby="pricing-heading">
      <h2
        id="pricing-heading"
        className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
      >
        Simple, honest pricing
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-light leading-relaxed text-muted-foreground">
        Monthly pricing in Malaysian Ringgit. Subscription activation is confirmed with our team —
        no payment is taken on this page.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const note = foundingNote(plan);
          return (
            <article
              key={plan.id}
              className={cn(
                "panel flex flex-col p-6 text-left",
                plan.founding && "border-primary/50 shadow-elevated",
              )}
            >
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {plan.name}
              </h3>
              <p className="mt-3 font-display text-2xl font-bold tracking-tight">
                {formatPlanPrice(plan)}
              </p>
              {note ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {note}
                  <span className="ml-1 line-through">
                    RM{plan.referencePriceMyrMonthly}/month
                  </span>
                </p>
              ) : null}
              <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
                {plan.description}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 rounded-xl"
                variant={plan.founding ? "default" : "outline"}
              >
                {plan.cta === "start_free_trial" ? (
                  <Link to="/auth" search={{ mode: "register", redirect: undefined }}>
                    {PLAN_CTA_LABEL[plan.cta]}
                  </Link>
                ) : (
                  <Link to="/meet" hash="book-demo">
                    {PLAN_CTA_LABEL[plan.cta]}
                  </Link>
                )}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
