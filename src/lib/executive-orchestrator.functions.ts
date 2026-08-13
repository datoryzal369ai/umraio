import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Thin RPC wrapper for the AI Autonomous Business Executive™ orchestration
 * cycle. All logic lives in `executive-orchestrator.server.ts`.
 */
export const runExecutiveCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .maybeSingle();
    const agencyId = profile?.agency_id as string | undefined;
    if (!agencyId) throw new Error("No agency found for this account");

    const { runExecutiveOrchestration } = await import("./executive-orchestrator.server");
    return await runExecutiveOrchestration(supabase, agencyId, userId);
  });
