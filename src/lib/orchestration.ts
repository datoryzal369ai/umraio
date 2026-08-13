import { supabase } from "@/integrations/supabase/client";

/** Client-side read model for executive orchestration cycles (audit log). */

export type ExecutiveActionResult =
  | "executed"
  | "rejected"
  | "failed"
  | "approval_required"
  | "capability_unavailable"
  | "duplicate_skipped"
  | "escalated"
  | "orchestration_limit_reached";

export type ExecutiveDecision = {
  at: string;
  lead_id: string | null;
  subject: string;
  decision: string;
  why: string;
  action: string | null;
  worker: string | null;
  result: ExecutiveActionResult;
  detail: string;
};

export type ExecutiveCycle = {
  correlationId: string;
  startedAt: string;
  finishedAt: string;
  opportunitiesConsidered: number;
  actionsAttempted: number;
  actionsExecuted: number;
  limitReached: boolean;
  decisions: ExecutiveDecision[];
};

export const RESULT_LABEL: Record<ExecutiveActionResult, string> = {
  executed: "Executed",
  escalated: "Escalated",
  rejected: "Rejected",
  failed: "Failed",
  approval_required: "Waiting for approval",
  capability_unavailable: "Capability unavailable",
  duplicate_skipped: "Skipped (duplicate)",
  orchestration_limit_reached: "Cycle limit reached",
};

export const RESULT_TONE: Record<ExecutiveActionResult, string> = {
  executed: "bg-success/15 text-success",
  escalated: "bg-chart-4/15 text-chart-4",
  rejected: "bg-muted text-muted-foreground",
  failed: "bg-destructive/15 text-destructive",
  approval_required: "bg-chart-4/15 text-chart-4",
  capability_unavailable: "bg-muted text-muted-foreground",
  duplicate_skipped: "bg-muted text-muted-foreground",
  orchestration_limit_reached: "bg-muted text-muted-foreground",
};

export async function fetchLastExecutiveCycle(): Promise<ExecutiveCycle | null> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("meta, created_at")
    .eq("entity", "executive_cycle")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const meta = (data ?? [])[0]?.meta as ExecutiveCycle | undefined;
  if (!meta || !Array.isArray(meta.decisions)) return null;
  return meta;
}
