import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * UMRAIO® — server-side checkout preparation (Step 3H.2).
 *
 * The browser sends ONLY a canonical plan ID. The server validates it, maps it
 * to the provider price, and returns the provider price ID required by the
 * Paddle checkout SDK. No price, currency, discount or entitlement ever comes
 * from the client, and opening a checkout grants nothing — entitlement is only
 * activated by a signature-verified webhook.
 */

export type CheckoutPreparation =
  | {
      status: "ready";
      plan: string;
      founding: boolean;
      environment: "sandbox" | "live";
      paddlePriceId: string;
      agencyId: string;
    }
  | { status: "not_self_serve"; plan: "enterprise" }
  | { status: "unavailable"; reason: string };

export const prepareCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plan: string }) => ({ plan: String(data?.plan ?? "") }))
  .handler(async ({ data, context }): Promise<CheckoutPreparation> => {
    const { supabase, userId } = context;

    const { selectPlan } = await import("./paddle-mapping.core");
    const selection = selectPlan(data.plan);
    if (!selection.ok) {
      if (selection.reason === "not_self_serve") {
        return { status: "not_self_serve", plan: "enterprise" };
      }
      throw new Error("Unknown plan.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .maybeSingle();
    const agencyId = profile?.agency_id as string | undefined;
    if (!agencyId) throw new Error("No agency found for this account.");

    // Record the request (never a grant) so the team can see intent.
    const { recordRequestedPlan } = await import("./entitlements.server");
    await recordRequestedPlan(supabase, agencyId, selection.mapping.plan);

    const clientToken = process.env["VITE_PAYMENTS_CLIENT_TOKEN"];
    const environment: "sandbox" | "live" =
      clientToken && !clientToken.startsWith("test_") ? "live" : "sandbox";

    try {
      const { gatewayFetch } = await import("@/lib/paddle.server");
      const response = await gatewayFetch(
        environment,
        `/prices?external_id=${encodeURIComponent(selection.mapping.priceExternalId)}`,
      );
      if (!response.ok) {
        const body = await response.text();
        console.error(`[checkout] price lookup failed [${response.status}]: ${body}`);
        return { status: "unavailable", reason: "price_lookup_failed" };
      }
      const result = (await response.json()) as { data?: Array<{ id: string }> };
      const paddlePriceId = result.data?.[0]?.id;
      if (!paddlePriceId) {
        return { status: "unavailable", reason: "price_not_configured" };
      }

      return {
        status: "ready",
        plan: selection.mapping.plan,
        founding: selection.mapping.founding,
        environment,
        paddlePriceId,
        agencyId,
      };
    } catch (error) {
      console.error("[checkout] provider unavailable", error);
      return { status: "unavailable", reason: "provider_unavailable" };
    }
  });
