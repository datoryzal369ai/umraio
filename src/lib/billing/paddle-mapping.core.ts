/**
 * UMRAIO® — PADDLE PROVIDER MAPPING (Step 3H.2).
 *
 * Pure, deterministic mapping between the canonical UMRAIO plan IDs and the
 * human-readable Paddle product/price identifiers. No secrets, no network, no
 * client entitlement decisions — the server is the only caller.
 *
 * Rules encoded here:
 * - The client NEVER supplies a price, currency, provider price ID, discount
 *   or entitlement. Only a canonical plan ID crosses the boundary.
 * - `enterprise` is not purchasable self-serve (custom pricing, talk to team).
 * - "Pro Founding" is NOT a fifth plan: it is `pro` + founding = true.
 */

import { isCanonicalPlanId, type CanonicalPlanId } from "./pricing.core";

export type PurchasablePlanId = Extract<CanonicalPlanId, "basic" | "pro" | "premium">;

export type PaddlePlanMapping = {
  plan: PurchasablePlanId;
  /** Human-readable Paddle product external_id (stable across sandbox/live). */
  productExternalId: string;
  /** Human-readable Paddle price external_id (stable across sandbox/live). */
  priceExternalId: string;
  /** Founding status is a property of the Pro plan, never a separate tier. */
  founding: boolean;
};

export const PADDLE_PLAN_MAP: Readonly<Record<PurchasablePlanId, PaddlePlanMapping>> = {
  basic: {
    plan: "basic",
    productExternalId: "umraio_basic",
    priceExternalId: "umraio_basic_monthly",
    founding: false,
  },
  pro: {
    plan: "pro",
    productExternalId: "umraio_pro",
    priceExternalId: "umraio_pro_monthly",
    founding: true,
  },
  premium: {
    plan: "premium",
    productExternalId: "umraio_premium",
    priceExternalId: "umraio_premium_monthly",
    founding: false,
  },
};

export function isPurchasablePlan(value: unknown): value is PurchasablePlanId {
  return typeof value === "string" && value in PADDLE_PLAN_MAP;
}

/**
 * Validate a client-supplied plan selection. Anything that is not one of the
 * three self-serve canonical plan IDs is rejected — including `enterprise`,
 * legacy codes, and any attempt to smuggle a price or provider ID.
 */
export type PlanSelection =
  | { ok: true; mapping: PaddlePlanMapping }
  | { ok: false; reason: "unknown_plan" | "not_self_serve" };

export function selectPlan(value: unknown): PlanSelection {
  if (isPurchasablePlan(value)) return { ok: true, mapping: PADDLE_PLAN_MAP[value] };
  if (isCanonicalPlanId(value)) return { ok: false, reason: "not_self_serve" };
  return { ok: false, reason: "unknown_plan" };
}

/** Reverse mapping used by the webhook: Paddle price external_id → plan. */
export function planFromPriceExternalId(priceExternalId: unknown): PaddlePlanMapping | null {
  if (typeof priceExternalId !== "string") return null;
  return (
    Object.values(PADDLE_PLAN_MAP).find((item) => item.priceExternalId === priceExternalId) ?? null
  );
}

/** Ordering used to decide upgrade (immediate) vs downgrade (period end). */
const PLAN_RANK: Record<PurchasablePlanId | "none", number> = {
  none: 0,
  basic: 1,
  pro: 2,
  premium: 3,
};

export function planRank(plan: string | null | undefined): number {
  if (plan && plan in PLAN_RANK) return PLAN_RANK[plan as PurchasablePlanId];
  return 0;
}

export type PlanChangeKind = "activation" | "upgrade" | "downgrade" | "same";

export function classifyPlanChange(
  currentPaidPlan: string | null | undefined,
  nextPlan: PurchasablePlanId,
): PlanChangeKind {
  const current = planRank(currentPaidPlan);
  const next = planRank(nextPlan);
  if (current === 0) return "activation";
  if (next > current) return "upgrade";
  if (next < current) return "downgrade";
  return "same";
}

/** Paddle statuses that keep the agency on their paid entitlement. */
export const ACTIVE_PADDLE_STATUSES = ["active", "trialing", "past_due"] as const;

export function isPaidStatus(status: string | null | undefined): boolean {
  return (
    typeof status === "string" &&
    (ACTIVE_PADDLE_STATUSES as readonly string[]).includes(status)
  );
}
