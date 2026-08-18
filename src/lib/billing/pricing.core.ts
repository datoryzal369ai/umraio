/**
 * UMRAIO® — CANONICAL PRICING SOURCE OF TRUTH (Step 3G.1).
 *
 * This module is the ONLY place where commercial plan names, prices, CTAs and
 * founding status are defined. No other client or server module may hard-code a
 * commercial figure. It is browser-safe (pure data, no server imports) so the
 * public homepage, settings and RAIŌ prompt layer all read the same values.
 *
 * IMPORTANT: no payment provider exists yet. Nothing here implies a charge.
 */

export type CanonicalPlanId = "basic" | "pro" | "premium" | "enterprise";

export type PlanCta = "choose_plan" | "talk_to_team";

export const PLAN_CTA_LABEL: Record<PlanCta, string> = {
  choose_plan: "Choose a plan",
  talk_to_team: "Talk to our team",
};

export type CanonicalPlan = {
  id: CanonicalPlanId;
  /** Short positioning line shown under the plan title. */
  subtitle: string;
  /** Exact CTA button label for this plan. */
  ctaLabel: string;
  /** Optional emphasis badges (e.g. MOST POPULAR / FOUNDING MEMBER). */
  badges: readonly string[];
  /** Visual hero plan on the pricing grid. */
  recommended: boolean;
  /** Display name, e.g. "Pro — Founding". */
  name: string;
  /** Base plan name without founding suffix. */
  baseName: string;
  /** Monthly price in MYR, or null for custom/contact-sales pricing. */
  priceMyrMonthly: number | null;
  /** Reference (non-founding) price where a founding price applies. */
  referencePriceMyrMonthly: number | null;
  /** Founding is a status on the Pro plan, never a separate commercial tier. */
  founding: boolean;
  billingInterval: "month" | "custom";
  publicVisible: boolean;
  cta: PlanCta;
  description: string;
  features: readonly string[];
  /** Included seats, informational only. */
  seats: number | null;
};

export const CANONICAL_PLANS: readonly CanonicalPlan[] = [
  {
    id: "basic",
    subtitle: "Untuk agency yang baru mula",
    ctaLabel: "Pilih Basic",
    badges: [],
    recommended: false,
    name: "Basic",
    baseName: "Basic",
    priceMyrMonthly: 199,
    referencePriceMyrMonthly: null,
    founding: false,
    billingInterval: "month",
    publicVisible: true,
    cta: "choose_plan",
    description: "For small Umrah agencies starting with autonomous WhatsApp enquiry handling.",
    features: [
      "1 WhatsApp Number",
      "1,500 AI Replies / month",
      "300 AI Worker Tasks / month",
      "3 Seats",
      "Knowledge Base (50 articles)",
      "AI Follow-up (assisted)",
      "Basic Analytics",
    ],
    seats: 3,
  },
  {
    id: "pro",
    subtitle: "FOUNDING MEMBER · EARLY ACCESS",
    ctaLabel: "Pilih Pro Founding",
    badges: ["★ MOST POPULAR", "FOUNDING MEMBER", "EARLY ACCESS"],
    recommended: true,
    name: "Pro — Founding",
    baseName: "Pro",
    priceMyrMonthly: 299,
    referencePriceMyrMonthly: 499,
    founding: true,
    billingInterval: "month",
    publicVisible: true,
    cta: "choose_plan",
    description: "For growing agencies that want governed autonomous execution and follow-ups.",
    features: [
      "2 WhatsApp Numbers",
      "5,000 AI Replies / month",
      "1,000 AI Worker Tasks / month",
      "10 Seats",
      "Autonomous follow-ups & task engine",
      "Quotations and conversion tracking",
      "Knowledge Base (250 articles)",
      "Full Analytics",
      "Priority Support",
    ],
    seats: 10,
  },
  {
    id: "premium",
    subtitle: "Untuk agency yang mahu scale",
    ctaLabel: "Pilih Premium",
    badges: [],
    recommended: false,
    name: "Premium",
    baseName: "Premium",
    priceMyrMonthly: 799,
    referencePriceMyrMonthly: null,
    founding: false,
    billingInterval: "month",
    publicVisible: true,
    cta: "choose_plan",
    description: "For established agencies running high enquiry volume across multiple numbers.",
    features: [
      "5 WhatsApp Numbers",
      "20,000 AI Replies / month",
      "4,000 AI Worker Tasks / month",
      "30 Seats",
      "Advanced Analytics",
      "Knowledge Base (1,000 articles)",
      "API Access",
      "Dedicated Support",
    ],
    seats: 30,
  },
  {
    id: "enterprise",
    subtitle: "Untuk Agency Group / Multi-Branch",
    ctaLabel: "Hubungi Kami",
    badges: [],
    recommended: false,
    name: "Enterprise",
    baseName: "Enterprise",
    priceMyrMonthly: null,
    referencePriceMyrMonthly: null,
    founding: false,
    billingInterval: "custom",
    publicVisible: true,
    cta: "talk_to_team",
    description: "Custom scope, integrations and governance for larger operators and groups.",
    features: [
      "Custom WhatsApp Numbers",
      "Custom AI usage limits",
      "Custom AI Worker capacity",
      "Custom seats & multi-branch capability",
      "API & Integrations",
      "Dedicated onboarding",
      "Custom governance requirements",
      "Priority support & SLA",
    ],
    seats: null,
  },
] as const;

export function getPlan(id: CanonicalPlanId): CanonicalPlan {
  const plan = CANONICAL_PLANS.find((item) => item.id === id);
  if (!plan) throw new Error(`Unknown canonical plan: ${id}`);
  return plan;
}

export function publicPlans(): CanonicalPlan[] {
  return CANONICAL_PLANS.filter((plan) => plan.publicVisible);
}

/** "RM199/month" or "Custom" — the only approved price formatting. */
export function formatPlanPrice(plan: CanonicalPlan): string {
  if (plan.priceMyrMonthly === null) return "Custom";
  return `RM${plan.priceMyrMonthly}/month`;
}

/** "Founding price · Reference RM499" — exact approved wording. */
export function foundingNote(plan: CanonicalPlan): string | null {
  if (!plan.founding || plan.referencePriceMyrMonthly === null) return null;
  return `Founding price · Reference RM${plan.referencePriceMyrMonthly}`;
}

/** "Jimat RM200/bulan" — savings vs the reference price, or null. */
export function foundingSavings(plan: CanonicalPlan): number | null {
  if (!plan.founding || plan.referencePriceMyrMonthly === null || plan.priceMyrMonthly === null) {
    return null;
  }
  const diff = plan.referencePriceMyrMonthly - plan.priceMyrMonthly;
  return diff > 0 ? diff : null;
}

/* ------------------------------------------------------------------ *
 * Legacy compatibility — existing tenant entitlement codes.
 * These are NOT commercial tiers and are never displayed as plans.
 * ------------------------------------------------------------------ */

export type LegacyPlanCode = "founding" | "trial" | "growth" | "scale";

export type LegacyMapping = {
  /** Closest canonical plan for presentation purposes only. */
  canonical: CanonicalPlanId;
  /** Whether the legacy code carries founding entitlement. */
  founding: boolean;
  note: string;
};

export const LEGACY_PLAN_MAP: Record<LegacyPlanCode, LegacyMapping> = {
  founding: { canonical: "pro", founding: true, note: "Founding entitlement on the Pro plan." },
  trial: { canonical: "basic", founding: false, note: "Trial compatibility." },
  growth: { canonical: "pro", founding: false, note: "Legacy Growth compatibility." },
  scale: { canonical: "premium", founding: false, note: "Legacy Scale compatibility." },
};

export function isLegacyPlanCode(value: unknown): value is LegacyPlanCode {
  return typeof value === "string" && value in LEGACY_PLAN_MAP;
}

export function isCanonicalPlanId(value: unknown): value is CanonicalPlanId {
  return (
    typeof value === "string" && CANONICAL_PLANS.some((plan) => plan.id === (value as CanonicalPlanId))
  );
}

/**
 * Resolve any stored plan code (canonical or legacy) to the canonical plan used
 * for DISPLAY only. Never used to change a tenant's entitlement.
 */
export function resolveDisplayPlan(code: string | null | undefined): CanonicalPlan {
  if (isCanonicalPlanId(code)) return getPlan(code);
  if (isLegacyPlanCode(code)) return getPlan(LEGACY_PLAN_MAP[code].canonical);
  return getPlan("basic");
}

/* ------------------------------------------------------------------ *
 * RAIŌ pricing knowledge — generated from the canonical table so the
 * model can never invent a figure.
 * ------------------------------------------------------------------ */

export function pricingFactSheet(): string {
  const lines = publicPlans().map((plan) => {
    if (plan.priceMyrMonthly === null) {
      return `- ${plan.name}: custom pricing, confirmed by the team (no figure exists).`;
    }
    const ref = plan.referencePriceMyrMonthly
      ? ` (founding price; reference price RM${plan.referencePriceMyrMonthly}/month)`
      : "";
    return `- ${plan.name}: RM${plan.priceMyrMonthly}/month${ref}.`;
  });
  return lines.join("\n");
}
