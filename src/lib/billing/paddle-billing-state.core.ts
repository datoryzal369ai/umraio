/**
 * UMRAIO® — PADDLE BILLING STATE MACHINE (Step 3H.2).
 *
 * Pure and deterministic. Given the current stored billing state and a
 * VERIFIED Paddle subscription event, it produces the next billing state plus
 * the side effects the server should perform. It never reads the network, the
 * browser or `agency_settings.plan` (which stays a user preference only).
 *
 * Business rules locked with the operator:
 * - Payment/subscription activation → effective_plan = purchased plan,
 *   founding = true for the Pro founding price, usage period re-anchored,
 *   agency owner notified.
 * - Cancellation → access is kept until `current_period_end`, then the agency
 *   falls back to the free/default entitlement.
 * - Payment failure (`past_due`) → access is kept while Paddle retries.
 * - Upgrade → applies immediately. Downgrade → applies at period end.
 */

import {
  classifyPlanChange,
  isPaidStatus,
  planFromPriceExternalId,
  type PurchasablePlanId,
} from "./paddle-mapping.core";

export type PaddleBillingState = {
  provider: "paddle" | "stripe";
  environment: "sandbox" | "live";
  subscription_id: string;
  customer_id: string | null;
  price_external_id: string | null;
  /** Paid plan currently granted by verified billing. */
  plan: PurchasablePlanId | null;
  founding: boolean;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  pending_downgrade: { plan: PurchasablePlanId; founding: boolean; effective_at: string } | null;
  /** Marks when the usage period was last re-anchored by a billing event. */
  period_anchor: string | null;
  /** Idempotency ledger of verified Paddle event IDs (most recent first). */
  processed_events: string[];
};

export type PaddleSubscriptionEvent = {
  /** Paddle `event_id` — used for idempotency. */
  eventId: string;
  type: "created" | "updated" | "canceled" | "payment_failed";
  environment: "sandbox" | "live";
  subscriptionId: string;
  customerId?: string | null;
  priceExternalId?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  scheduledCancel?: boolean;
  occurredAt: string;
};

export type BillingEffects = {
  /** Plan granted right now (null = no paid entitlement). */
  effectivePlan: PurchasablePlanId | null;
  founding: boolean;
  /** Re-anchor the usage period for a new paid billing period. */
  resetUsagePeriod: boolean;
  /** Owner notification to write to the activity log. */
  notify: null | "activated" | "upgraded" | "downgrade_scheduled" | "cancelled" | "payment_failed";
  /** Duplicate/irrelevant event — nothing was applied. */
  ignored: boolean;
};

const MAX_EVENT_LEDGER = 50;

export function emptyBillingState(
  subscriptionId: string,
  environment: "sandbox" | "live",
): PaddleBillingState {
  return {
    provider: "paddle",
    environment,
    subscription_id: subscriptionId,
    customer_id: null,
    price_external_id: null,
    plan: null,
    founding: false,
    status: "none",
    current_period_end: null,
    cancel_at_period_end: false,
    pending_downgrade: null,
    period_anchor: null,
    processed_events: [],
  };
}

export function isDuplicateEvent(state: PaddleBillingState | null, eventId: string): boolean {
  return Boolean(state?.processed_events?.includes(eventId));
}

function remember(state: PaddleBillingState, eventId: string): string[] {
  return [eventId, ...state.processed_events.filter((id) => id !== eventId)].slice(
    0,
    MAX_EVENT_LEDGER,
  );
}

export type ApplyResult = { state: PaddleBillingState; effects: BillingEffects };

/**
 * Apply a VERIFIED provider event. Callers must have validated the webhook
 * signature first — this function assumes the event is authentic.
 */
export function applySubscriptionEvent(
  current: PaddleBillingState | null,
  event: PaddleSubscriptionEvent,
): ApplyResult {
  const base = current ?? emptyBillingState(event.subscriptionId, event.environment);

  if (isDuplicateEvent(base, event.eventId)) {
    return {
      state: base,
      effects: {
        effectivePlan: base.plan,
        founding: base.founding,
        resetUsagePeriod: false,
        notify: null,
        ignored: true,
      },
    };
  }

  const processed_events = remember(base, event.eventId);
  const mapping = planFromPriceExternalId(event.priceExternalId ?? base.price_external_id);

  // Payment failure: Paddle keeps retrying — never revoke access here.
  if (event.type === "payment_failed") {
    const state: PaddleBillingState = {
      ...base,
      subscription_id: event.subscriptionId,
      environment: event.environment,
      status: "past_due",
      processed_events,
    };
    return {
      state,
      effects: {
        effectivePlan: state.plan,
        founding: state.founding,
        resetUsagePeriod: false,
        notify: "payment_failed",
        ignored: false,
      },
    };
  }

  if (event.type === "canceled") {
    const state: PaddleBillingState = {
      ...base,
      subscription_id: event.subscriptionId,
      environment: event.environment,
      status: "canceled",
      current_period_end: event.currentPeriodEnd ?? base.current_period_end,
      cancel_at_period_end: true,
      pending_downgrade: null,
      processed_events,
    };
    return {
      state,
      effects: {
        // Access is retained until current_period_end (see resolvePaidPlan).
        effectivePlan: state.plan,
        founding: state.founding,
        resetUsagePeriod: false,
        notify: "cancelled",
        ignored: false,
      },
    };
  }

  // created / updated
  if (!mapping) {
    // Unknown price: we cannot map it to a canonical plan, so we refuse to
    // grant anything rather than guess.
    return {
      state: { ...base, processed_events },
      effects: {
        effectivePlan: base.plan,
        founding: base.founding,
        resetUsagePeriod: false,
        notify: null,
        ignored: true,
      },
    };
  }

  const status = event.status ?? "active";
  if (!isPaidStatus(status)) {
    const state: PaddleBillingState = {
      ...base,
      subscription_id: event.subscriptionId,
      environment: event.environment,
      status,
      current_period_end: event.currentPeriodEnd ?? base.current_period_end,
      processed_events,
    };
    return {
      state,
      effects: {
        effectivePlan: state.plan,
        founding: state.founding,
        resetUsagePeriod: false,
        notify: null,
        ignored: false,
      },
    };
  }

  const change = classifyPlanChange(base.plan, mapping.plan);
  const periodEnd = event.currentPeriodEnd ?? base.current_period_end;

  if (change === "downgrade") {
    // Downgrades take effect only at the end of the paid period.
    const state: PaddleBillingState = {
      ...base,
      subscription_id: event.subscriptionId,
      environment: event.environment,
      customer_id: event.customerId ?? base.customer_id,
      price_external_id: event.priceExternalId ?? base.price_external_id,
      status,
      current_period_end: periodEnd,
      cancel_at_period_end: event.scheduledCancel ?? false,
      pending_downgrade: periodEnd
        ? { plan: mapping.plan, founding: mapping.founding, effective_at: periodEnd }
        : null,
      processed_events,
    };
    // Without a period end we cannot schedule; apply immediately instead.
    if (!periodEnd) {
      state.plan = mapping.plan;
      state.founding = mapping.founding;
    }
    return {
      state,
      effects: {
        effectivePlan: state.plan,
        founding: state.founding,
        resetUsagePeriod: false,
        notify: "downgrade_scheduled",
        ignored: false,
      },
    };
  }

  const state: PaddleBillingState = {
    ...base,
    subscription_id: event.subscriptionId,
    environment: event.environment,
    customer_id: event.customerId ?? base.customer_id,
    price_external_id: event.priceExternalId ?? base.price_external_id,
    plan: mapping.plan,
    founding: mapping.founding,
    status,
    current_period_end: periodEnd,
    cancel_at_period_end: event.scheduledCancel ?? false,
    pending_downgrade: null,
    period_anchor:
      change === "activation" || change === "upgrade" ? event.occurredAt : base.period_anchor,
    processed_events,
  };

  return {
    state,
    effects: {
      effectivePlan: state.plan,
      founding: state.founding,
      resetUsagePeriod: change === "activation" || change === "upgrade",
      notify: change === "activation" ? "activated" : change === "upgrade" ? "upgraded" : null,
      ignored: false,
    },
  };
}

/**
 * Resolve what the agency is entitled to RIGHT NOW from stored billing state.
 * Handles cancellation grace and scheduled downgrades without any extra event.
 */
export function resolvePaidPlan(
  state: PaddleBillingState | null | undefined,
  now: Date = new Date(),
): { plan: PurchasablePlanId | null; founding: boolean } {
  if (!state || !state.plan) return { plan: null, founding: false };

  const periodEnd = state.current_period_end ? new Date(state.current_period_end) : null;
  const periodOver = periodEnd ? now.getTime() >= periodEnd.getTime() : false;

  if (state.status === "canceled") {
    if (!periodEnd || periodOver) return { plan: null, founding: false };
    return { plan: state.plan, founding: state.founding };
  }

  if (state.pending_downgrade) {
    const at = new Date(state.pending_downgrade.effective_at);
    if (now.getTime() >= at.getTime()) {
      return { plan: state.pending_downgrade.plan, founding: state.pending_downgrade.founding };
    }
  }

  if (!isPaidStatus(state.status)) return { plan: null, founding: false };

  return { plan: state.plan, founding: state.founding };
}

/** Safe reader for the JSON blob stored on `agency_entitlements.overrides`. */
export function readBillingState(overrides: unknown): PaddleBillingState | null {
  if (!overrides || typeof overrides !== "object") return null;
  const billing = (overrides as Record<string, unknown>)["billing"];
  if (!billing || typeof billing !== "object") return null;
  const candidate = billing as Partial<PaddleBillingState>;
  if (
    (candidate.provider !== "paddle" && candidate.provider !== "stripe") ||
    typeof candidate.subscription_id !== "string"
  ) {
    return null;
  }
  return {
    ...emptyBillingState(candidate.subscription_id, candidate.environment ?? "sandbox"),
    provider: candidate.provider,
    ...candidate,
    processed_events: Array.isArray(candidate.processed_events) ? candidate.processed_events : [],
  } as PaddleBillingState;
}
