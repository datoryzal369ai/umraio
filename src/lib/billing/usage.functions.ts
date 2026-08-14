import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Usage & entitlement visibility for the signed-in agency.
 * Plan limits are resolved server-side; the browser never decides them.
 */
export const getUsageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .maybeSingle();

    const agencyId = profile?.agency_id as string | undefined;
    if (!agencyId) throw new Error("No agency found for this account.");

    const { getUsageSummary } = await import("./usage.server");
    return getUsageSummary(supabase, agencyId);
  });
