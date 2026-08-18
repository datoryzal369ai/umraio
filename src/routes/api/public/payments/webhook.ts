import { createFileRoute } from "@tanstack/react-router";

import type { PaddleSubscriptionEvent } from "@/lib/billing/paddle-billing-state.core";
import type { PaddleEnv } from "@/lib/paddle.server";

/**
 * UMRAIO® — Paddle webhook (Step 3H.2).
 *
 * Public by design (Paddle sends no session). Security comes from verifying the
 * Paddle signature on EVERY request. Entitlement is only ever activated here,
 * never from the browser and never because a checkout was opened.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function firstItem(data: any): any | null {
  const items = data?.items;
  return Array.isArray(items) && items.length > 0 ? items[0] : null;
}

function priceExternalId(data: any): string | null {
  const item = firstItem(data);
  return item?.price?.importMeta?.externalId ?? null;
}

function periodEnd(data: any): string | null {
  return data?.currentBillingPeriod?.endsAt ?? null;
}

export function toSubscriptionEvent(
  eventType: string,
  eventId: string,
  data: any,
  env: PaddleEnv,
  occurredAt: string,
): PaddleSubscriptionEvent | null {
  const base = {
    eventId,
    environment: env,
    subscriptionId: (data?.id ?? data?.subscriptionId) as string,
    customerId: (data?.customerId ?? null) as string | null,
    priceExternalId: priceExternalId(data),
    status: (data?.status ?? null) as string | null,
    currentPeriodEnd: periodEnd(data),
    scheduledCancel: data?.scheduledChange?.action === "cancel",
    occurredAt,
  };
  if (!base.subscriptionId) return null;

  switch (eventType) {
    case "subscription.created":
      return { ...base, type: "created" };
    case "subscription.updated":
      return { ...base, type: "updated" };
    case "subscription.canceled":
      return { ...base, type: "canceled" };
    case "transaction.payment_failed":
      return { ...base, type: "payment_failed" };
    default:
      return null;
  }
}

async function handleWebhook(request: Request, env: PaddleEnv) {
  const { verifyWebhook } = await import("@/lib/paddle.server");
  const event = await verifyWebhook(request, env);

  const data = event.data as any;
  const subscriptionEvent = toSubscriptionEvent(
    event.eventType as string,
    (event as any).eventId ?? (event as any).notificationId ?? `${event.eventType}:${data?.id}`,
    data,
    env,
    (event as any).occurredAt ?? new Date().toISOString(),
  );

  if (!subscriptionEvent) {
    console.log("[paddle] unhandled event", event.eventType);
    return;
  }

  const agencyId =
    (data?.customData?.agencyId as string | undefined) ??
    (data?.customData?.agency_id as string | undefined) ??
    null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { applyVerifiedSubscriptionEvent } = await import("@/lib/billing/paddle-billing.server");
  const outcome = await applyVerifiedSubscriptionEvent(
    supabaseAdmin as any,
    subscriptionEvent,
    agencyId,
  );
  console.log("[paddle] event applied", event.eventType, outcome);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") === "live" ? "live" : "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (error) {
          console.error("[paddle] webhook error", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
