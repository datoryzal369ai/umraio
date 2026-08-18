/**
 * UMRAIO® — STRIPE PROVIDER MAPPING (Step 3H.2B).
 *
 * Pure and deterministic. Maps canonical UMRAIO plan IDs to the server-side
 * Stripe price configuration. The browser only ever sends a canonical plan ID
 * (`basic` | `pro` | `premium`); price IDs, amounts and currency are resolved
 * exclusively here, on the server.
 *
 * Canonical MYR pricing stays in `pricing.core.ts` — this module reads it and
 * never restates a figure.
 */

import { CANONICAL_PLANS, isCanonicalPlanId } from "./pricing.core";
import {
  classifyPlanChange,
  isPurchasablePlan,
  planRank,
  type PurchasablePlanId,
} from "./paddle-mapping.core";

export { classifyPlanChange, isPurchasablePlan, planRank };
export type { PurchasablePlanId };

export const BILLING_CURRENCY = "myr" as const;

export type StripePlanMapping = {
  plan: PurchasablePlanId;
  /** Provider-neutral logical price key persisted in billing state. */
  priceExternalId: string;
  /** Name of the server env var holding the Stripe price ID. */
  priceEnvVar: string;
  /** Founding is a status on Pro, never a separate tier. */
  founding: boolean;
  /** Canonical monthly amount in MYR (from pricing.core.ts). */
  amountMyr: number;
  /** Canonical amount in the smallest unit (sen) for provider verification. */
  amountMinorUnits: number;
};

function canonicalAmount(plan: PurchasablePlanId): number {
  const entry = CANONICAL_PLANS.find((item) => item.id === plan);
  if (!entry || entry.priceMyrMonthly === null) {
    throw new Error(`Canonical price missing for plan ${plan}`);
  }
  return entry.priceMyrMonthly;
}

function build(
  plan: PurchasablePlanId,
  priceExternalId: string,
  priceEnvVar: string,
  founding: boolean,
): StripePlanMapping {
  const amountMyr = canonicalAmount(plan);
  return {
    plan,
    priceExternalId,
    priceEnvVar,
    founding,
    amountMyr,
    amountMinorUnits: Math.round(amountMyr * 100),
  };
}

export const STRIPE_PLAN_MAP: Readonly<Record<PurchasablePlanId, StripePlanMapping>> = {
  basic: build("basic", "umraio_basic_monthly", "STRIPE_PRICE_BASIC_MYR_MONTHLY", false),
  // RM299 founding is the ACTUAL charged price. RM499 is a reference figure
  // only and must never be billed to a founding customer.
  pro: build("pro", "umraio_pro_monthly", "STRIPE_PRICE_PRO_FOUNDING_MYR_MONTHLY", true),
  premium: build("premium", "umraio_premium_monthly", "STRIPE_PRICE_PREMIUM_MYR_MONTHLY", false),
};

export type PlanSelection =
  | { ok: true; mapping: StripePlanMapping }
  | { ok: false; reason: "unknown_plan" | "not_self_serve" };

/**
 * Validate a client-supplied plan selection. Anything that is not one of the
 * three self-serve canonical plan IDs is rejected — including `enterprise`,
 * legacy codes, and any attempt to smuggle a price, amount or Stripe price ID.
 */
export function selectStripePlan(value: unknown): PlanSelection {
  if (isPurchasablePlan(value)) return { ok: true, mapping: STRIPE_PLAN_MAP[value] };
  if (isCanonicalPlanId(value)) return { ok: false, reason: "not_self_serve" };
  return { ok: false, reason: "unknown_plan" };
}

/** Resolve the configured Stripe price ID for a plan (server env only). */
export function stripePriceIdFor(
  mapping: StripePlanMapping,
  env: Record<string, string | undefined>,
): string | null {
  const value = env[mapping.priceEnvVar];
  return value && value.startsWith("price_") ? value : null;
}

/** Reverse mapping used by the webhook: Stripe price ID → canonical plan. */
export function planFromStripePriceId(
  stripePriceId: string | null | undefined,
  env: Record<string, string | undefined>,
): StripePlanMapping | null {
  if (!stripePriceId) return null;
  return (
    Object.values(STRIPE_PLAN_MAP).find(
      (mapping) => stripePriceIdFor(mapping, env) === stripePriceId,
    ) ?? null
  );
}

export type PriceVerification =
  | { ok: true }
  | {
      ok: false;
      reason: "wrong_currency" | "wrong_amount" | "not_recurring" | "wrong_interval" | "inactive";
    };

/**
 * Verify a Stripe price object actually matches the canonical UMRAIO offer
 * before it can be charged. Guards against a mis-configured price ID silently
 * charging the wrong amount or currency.
 */
export function verifyStripePrice(
  price: {
    active?: boolean;
    currency?: string;
    unit_amount?: number | null;
    recurring?: { interval?: string; interval_count?: number } | null;
  },
  mapping: StripePlanMapping,
): PriceVerification {
  if (price.active === false) return { ok: false, reason: "inactive" };
  if ((price.currency ?? "").toLowerCase() !== BILLING_CURRENCY) {
    return { ok: false, reason: "wrong_currency" };
  }
  if (!price.recurring) return { ok: false, reason: "not_recurring" };
  if (price.recurring.interval !== "month" || (price.recurring.interval_count ?? 1) !== 1) {
    return { ok: false, reason: "wrong_interval" };
  }
  if (price.unit_amount !== mapping.amountMinorUnits) return { ok: false, reason: "wrong_amount" };
  return { ok: true };
}
