import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyStripeSignature } from "@/lib/stripe.server";
import {
  STRIPE_PLAN_MAP,
  planFromStripePriceId,
  selectStripePlan,
  stripePriceIdFor,
  verifyStripePrice,
} from "@/lib/billing/stripe-mapping.core";
import { normalizeStripeEvent } from "@/lib/billing/stripe-billing.server";
import {
  applySubscriptionEvent,
  resolvePaidPlan,
  type PaddleSubscriptionEvent,
} from "@/lib/billing/paddle-billing-state.core";

const ENV = {
  STRIPE_PRICE_BASIC_MYR_MONTHLY: "price_basic",
  STRIPE_PRICE_PRO_FOUNDING_MYR_MONTHLY: "price_pro",
  STRIPE_PRICE_PREMIUM_MYR_MONTHLY: "price_premium",
};

describe("canonical plan → Stripe price mapping", () => {
  it("uses canonical MYR amounts from pricing.core", () => {
    expect(STRIPE_PLAN_MAP.basic.amountMyr).toBe(199);
    expect(STRIPE_PLAN_MAP.pro.amountMyr).toBe(299);
    expect(STRIPE_PLAN_MAP.premium.amountMyr).toBe(799);
    expect(STRIPE_PLAN_MAP.pro.founding).toBe(true);
    expect(STRIPE_PLAN_MAP.pro.amountMinorUnits).toBe(29_900);
  });

  it("rejects enterprise and unknown plans from the client", () => {
    expect(selectStripePlan("enterprise")).toEqual({ ok: false, reason: "not_self_serve" });
    expect(selectStripePlan("price_123")).toEqual({ ok: false, reason: "unknown_plan" });
    expect(selectStripePlan({ plan: "pro", amount: 1 })).toEqual({
      ok: false,
      reason: "unknown_plan",
    });
  });

  it("resolves price IDs only from server env", () => {
    expect(stripePriceIdFor(STRIPE_PLAN_MAP.pro, ENV)).toBe("price_pro");
    expect(stripePriceIdFor(STRIPE_PLAN_MAP.pro, {})).toBeNull();
    expect(planFromStripePriceId("price_premium", ENV)?.plan).toBe("premium");
    expect(planFromStripePriceId("price_attacker", ENV)).toBeNull();
  });

  it("refuses a price with the wrong currency or amount", () => {
    const good = { active: true, currency: "myr", unit_amount: 29_900, recurring: { interval: "month" } };
    expect(verifyStripePrice(good, STRIPE_PLAN_MAP.pro)).toEqual({ ok: true });
    expect(verifyStripePrice({ ...good, currency: "usd" }, STRIPE_PLAN_MAP.pro).ok).toBe(false);
    expect(verifyStripePrice({ ...good, unit_amount: 49_900 }, STRIPE_PLAN_MAP.pro)).toEqual({
      ok: false,
      reason: "wrong_amount",
    });
    expect(verifyStripePrice({ ...good, recurring: null }, STRIPE_PLAN_MAP.pro)).toEqual({
      ok: false,
      reason: "not_recurring",
    });
  });
});

describe("Stripe webhook signature", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ id: "evt_1" });
  const now = 1_700_000_000;
  const sign = (ts: number, body: string) =>
    createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

  it("accepts a valid signature", () => {
    const header = `t=${now},v1=${sign(now, payload)}`;
    expect(verifyStripeSignature(payload, header, secret, now)).toEqual({ valid: true });
  });

  it("rejects a forged or missing signature", () => {
    expect(verifyStripeSignature(payload, `t=${now},v1=deadbeef`, secret, now).valid).toBe(false);
    expect(verifyStripeSignature(payload, null, secret, now).valid).toBe(false);
    expect(verifyStripeSignature(payload, "garbage", secret, now).valid).toBe(false);
  });

  it("rejects a replayed old timestamp", () => {
    const old = now - 10_000;
    const header = `t=${old},v1=${sign(old, payload)}`;
    expect(verifyStripeSignature(payload, header, secret, now).reason).toBe(
      "timestamp_out_of_tolerance",
    );
  });

  it("rejects a tampered payload", () => {
    const header = `t=${now},v1=${sign(now, payload)}`;
    expect(verifyStripeSignature('{"id":"evt_hacked"}', header, secret, now).valid).toBe(false);
  });
});

function subscriptionEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    type: "customer.subscription.created",
    created: 1_700_000_000,
    data: {
      object: {
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        cancel_at_period_end: false,
        current_period_end: 1_702_592_000,
        metadata: { agency_id: "agency-1", plan: "pro" },
        items: { data: [{ price: { id: "price_pro" } }] },
        ...overrides,
      },
    },
  };
}

describe("Stripe event normalization + entitlement", () => {
  it("maps a Pro subscription to the founding entitlement", () => {
    const normalized = normalizeStripeEvent(subscriptionEvent(), ENV, "test");
    expect(normalized?.agencyId).toBe("agency-1");
    expect(normalized?.event.priceExternalId).toBe("umraio_pro_monthly");

    const { effects } = applySubscriptionEvent(null, normalized!.event as PaddleSubscriptionEvent);
    expect(effects.effectivePlan).toBe("pro");
    expect(effects.founding).toBe(true);
  });

  it("is idempotent for a duplicate delivery", () => {
    const normalized = normalizeStripeEvent(subscriptionEvent(), ENV, "test")!;
    const first = applySubscriptionEvent(null, normalized.event);
    const second = applySubscriptionEvent(first.state, normalized.event);
    expect(second.effects.ignored).toBe(true);
    expect(second.state.plan).toBe("pro");
  });

  it("grants nothing for an unknown price ID", () => {
    const normalized = normalizeStripeEvent(
      subscriptionEvent({ items: { data: [{ price: { id: "price_attacker" } }] } }),
      ENV,
      "test",
    )!;
    const { effects } = applySubscriptionEvent(null, normalized.event);
    expect(effects.effectivePlan).toBeNull();
    expect(effects.ignored).toBe(true);
  });

  it("keeps access until period end after cancellation", () => {
    const active = applySubscriptionEvent(
      null,
      normalizeStripeEvent(subscriptionEvent(), ENV, "test")!.event,
    );
    const cancelled = applySubscriptionEvent(active.state, {
      ...normalizeStripeEvent(
        { ...subscriptionEvent(), id: "evt_2", type: "customer.subscription.deleted" },
        ENV,
        "test",
      )!.event,
    });
    const beforeEnd = resolvePaidPlan(cancelled.state, new Date("2023-12-01T00:00:00Z"));
    const afterEnd = resolvePaidPlan(cancelled.state, new Date("2030-01-01T00:00:00Z"));
    expect(beforeEnd.plan).toBe("pro");
    expect(afterEnd.plan).toBeNull();
  });

  it("does not destroy access on a failed payment", () => {
    const active = applySubscriptionEvent(
      null,
      normalizeStripeEvent(subscriptionEvent(), ENV, "test")!.event,
    );
    const failed = normalizeStripeEvent(
      {
        id: "evt_3",
        type: "invoice.payment_failed",
        created: 1_700_000_100,
        data: {
          object: {
            subscription: "sub_1",
            customer: "cus_1",
            lines: { data: [{ price: { id: "price_pro" }, period: { end: 1_702_592_000 } }] },
          },
        },
      },
      ENV,
      "test",
    )!;
    const result = applySubscriptionEvent(active.state, failed.event);
    expect(result.effects.effectivePlan).toBe("pro");
    expect(result.state.status).toBe("past_due");
    expect(resolvePaidPlan(result.state, new Date("2023-12-01T00:00:00Z")).plan).toBe("pro");
  });

  it("applies upgrades immediately and downgrades at period end", () => {
    const basic = applySubscriptionEvent(
      null,
      normalizeStripeEvent(
        subscriptionEvent({ items: { data: [{ price: { id: "price_basic" } }] } }),
        ENV,
        "test",
      )!.event,
    );
    const upgraded = applySubscriptionEvent(
      basic.state,
      normalizeStripeEvent(
        { ...subscriptionEvent(), id: "evt_up", type: "customer.subscription.updated" },
        ENV,
        "test",
      )!.event,
    );
    expect(upgraded.effects.effectivePlan).toBe("pro");

    const downgraded = applySubscriptionEvent(upgraded.state, {
      ...normalizeStripeEvent(
        {
          ...subscriptionEvent({ items: { data: [{ price: { id: "price_basic" } }] } }),
          id: "evt_down",
          type: "customer.subscription.updated",
        },
        ENV,
        "test",
      )!.event,
    });
    expect(resolvePaidPlan(downgraded.state, new Date("2023-12-01T00:00:00Z")).plan).toBe("pro");
    expect(resolvePaidPlan(downgraded.state, new Date("2030-01-01T00:00:00Z")).plan).toBe("basic");
  });
});
