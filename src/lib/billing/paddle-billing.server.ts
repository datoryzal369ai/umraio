import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applySubscriptionEvent,
  isDuplicateEvent,
  readBillingState,
  resolvePaidPlan,
  type PaddleSubscriptionEvent,
} from "./paddle-billing-state.core";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * UMRAIO® — server-authoritative Paddle → entitlement writer (Step 3H.2).
 *
 * Only VERIFIED provider events reach this module. It is the single place
 * where a paid entitlement can be granted or removed.
 */

export type ApplyOutcome =
  | { applied: false; reason: "duplicate" | "unmapped" | "no_agency" }
  | { applied: true; agencyId: string; effectivePlan: string; founding: boolean };

async function findAgencyId(
  supabase: Db,
  event: PaddleSubscriptionEvent,
  agencyIdFromCheckout: string | null,
): Promise<string | null> {
  if (agencyIdFromCheckout) return agencyIdFromCheckout;
  const { data } = await supabase
    .from("agency_entitlements")
    .select("agency_id, overrides")
    .contains("overrides", { billing: { subscription_id: event.subscriptionId } })
    .maybeSingle();
  return (data?.agency_id as string | undefined) ?? null;
}

export async function applyVerifiedSubscriptionEvent(
  supabase: Db,
  event: PaddleSubscriptionEvent,
  agencyIdFromCheckout: string | null,
): Promise<ApplyOutcome> {
  const agencyId = await findAgencyId(supabase, event, agencyIdFromCheckout);
  if (!agencyId) return { applied: false, reason: "no_agency" };

  const { data: row } = await supabase
    .from("agency_entitlements")
    .select("effective_plan, overrides")
    .eq("agency_id", agencyId)
    .maybeSingle();

  const overrides = (row?.overrides ?? {}) as Record<string, unknown>;
  const currentState = readBillingState(overrides);

  if (isDuplicateEvent(currentState, event.eventId)) {
    return { applied: false, reason: "duplicate" };
  }

  const { state, effects } = applySubscriptionEvent(currentState, event);
  if (effects.ignored && !effects.effectivePlan) {
    // Persist the event id so a retry of an unmappable event is not reprocessed.
    await supabase
      .from("agency_entitlements")
      .upsert(
        { agency_id: agencyId, overrides: { ...overrides, billing: state } },
        { onConflict: "agency_id" },
      );
    return { applied: false, reason: "unmapped" };
  }

  const resolved = resolvePaidPlan(state, new Date(event.occurredAt));
  const effectivePlan = resolved.plan ?? "trial";

  await supabase.from("agency_entitlements").upsert(
    {
      agency_id: agencyId,
      effective_plan: effectivePlan,
      source: "paddle_subscription",
      overrides: { ...overrides, billing: state, founding: resolved.founding },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agency_id" },
  );

  if (effects.notify) {
    await supabase.from("activity_log").insert({
      agency_id: agencyId,
      actor: "system",
      action: `billing.${effects.notify}`,
      entity: "subscription",
      entity_id: event.subscriptionId,
      meta: {
        plan: effectivePlan,
        founding: resolved.founding,
        status: state.status,
        environment: state.environment,
        current_period_end: state.current_period_end,
        usage_period_reset: effects.resetUsagePeriod,
      },
    });
  }

  return { applied: true, agencyId, effectivePlan, founding: resolved.founding };
}
