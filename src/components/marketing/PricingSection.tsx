import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { publicPlans, type CanonicalPlan } from "@/lib/billing/pricing.core";
import {
  PRICING_SECTION_COPY,
  localizedReferencePrice,
  localizedSavings,
  planCopy,
} from "@/lib/billing/pricing.i18n";
import { useLocale, type Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

function PriceBlock({ plan, locale }: { plan: CanonicalPlan; locale: Locale }) {
  const copy = PRICING_SECTION_COPY[locale];

  if (plan.priceMyrMonthly === null) {
    return (
      <div className="mt-5">
        <p className="font-display text-4xl font-bold tracking-tight">{copy.custom}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.customNote}</p>
      </div>
    );
  }

  const savings = localizedSavings(plan, locale);
  const reference = localizedReferencePrice(plan, locale);

  return (
    <div className="mt-5">
      {reference ? <p className="text-sm text-muted-foreground line-through">{reference}</p> : null}
      <p className="font-display text-4xl font-bold leading-none tracking-tight">
        RM{plan.priceMyrMonthly}
        <span className="ml-1 text-base font-medium text-muted-foreground">{copy.perMonth}</span>
      </p>
      {savings ? (
        <p className="mt-2 inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {savings}
        </p>
      ) : null}
    </div>
  );
}

export function PricingSection() {
  const { locale } = useLocale();
  const copy = PRICING_SECTION_COPY[locale];
  const plans = publicPlans();

  return (
    <section className="mt-24" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          {copy.eyebrow}
        </p>
        <h2
          id="pricing-heading"
          className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {copy.heading}
        </h2>
        <p className="mt-4 text-sm font-light leading-relaxed text-muted-foreground">{copy.intro}</p>
      </div>

      <div className="mt-12 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const hero = plan.recommended;
          const text = planCopy(plan, locale);
          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border p-6 text-left backdrop-blur-xl transition-transform",
                hero
                  ? "border-primary/60 bg-gradient-to-b from-primary/12 via-surface/70 to-surface/40 shadow-elevated lg:-translate-y-3 lg:scale-[1.03]"
                  : "border-border/60 bg-surface/50",
              )}
            >
              {hero ? (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-elevated">
                  <Sparkles className="size-3" aria-hidden />
                  {copy.mostPopular}
                </span>
              ) : null}

              <h3
                className={cn(
                  "text-sm font-semibold uppercase tracking-[0.2em]",
                  hero ? "text-primary" : "text-foreground",
                )}
              >
                {plan.baseName}
              </h3>
              <p
                className={cn(
                  "mt-2 text-xs leading-relaxed",
                  hero
                    ? "font-semibold uppercase tracking-[0.14em] text-primary/90"
                    : "text-muted-foreground",
                )}
              >
                {text.subtitle}
              </p>

              <PriceBlock plan={plan} locale={locale} />

              <div className="mt-6 h-px w-full bg-border/60" />

              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {text.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="leading-relaxed text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                className={cn("mt-7 w-full rounded-xl", hero && "shadow-elevated")}
                variant={hero ? "default" : "outline"}
              >
                {plan.cta === "talk_to_team" ? (
                  <Link to="/meet" hash="book-demo">
                    {text.ctaLabel}
                  </Link>
                ) : (
                  <Link to="/auth" search={{ mode: "register", redirect: undefined }}>
                    {text.ctaLabel}
                  </Link>
                )}
              </Button>
            </article>
          );
        })}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        {copy.noPaymentNote}
      </p>
    </section>
  );
}
