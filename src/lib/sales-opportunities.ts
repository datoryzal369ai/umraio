import { supabase } from "@/integrations/supabase/client";
import { fetchLeads, type Lead } from "@/lib/leads";
import {
  OPEN_STAGES,
  buildOpportunity,
  type ConvRow,
  type FollowupRow,
  type SalesOpportunity,
} from "@/lib/sales-opportunities.core";

/**
 * Browser-side data access for the deterministic opportunity logic.
 *
 * READ-ONLY. All rules live in `sales-opportunities.core.ts` and are shared
 * with the server-side executive orchestrator — there is only one rule set.
 */

export {
  INTENT_LABEL,
  INTENT_TONE,
  REASON_LABEL,
  buildOpportunity,
  intentBand,
  missingQualification,
  type IntentBand,
  type OpportunityReason,
  type SalesOpportunity,
} from "@/lib/sales-opportunities.core";

export async function fetchSalesOpportunities(): Promise<SalesOpportunity[]> {
  const [leads, convs, followups] = await Promise.all([
    fetchLeads(),
    supabase
      .from("conversations")
      .select("id, lead_id, ai_enabled, human_attention_required, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(500),
    supabase
      .from("followup_jobs")
      .select("lead_id, run_at, status")
      .eq("status", "pending")
      .limit(500),
  ]);

  if (convs.error) throw convs.error;
  if (followups.error) throw followups.error;

  const convByLead = new Map<string, ConvRow>();
  for (const row of (convs.data ?? []) as ConvRow[]) {
    if (row.lead_id && !convByLead.has(row.lead_id)) convByLead.set(row.lead_id, row);
  }
  const followupByLead = new Map<string, FollowupRow>();
  for (const row of (followups.data ?? []) as FollowupRow[]) {
    if (!row.lead_id) continue;
    const existing = followupByLead.get(row.lead_id);
    if (!existing || row.run_at < existing.run_at) followupByLead.set(row.lead_id, row);
  }

  return leads
    .filter((lead) => OPEN_STAGES.includes(lead.stage))
    .map((lead) =>
      buildOpportunity(lead, convByLead.get(lead.id) ?? null, followupByLead.get(lead.id) ?? null),
    )
    .filter((opp) => opp.reasons.length > 0)
    .sort((a, b) => b.urgency - a.urgency);
}

/** Convenience for a single lead view. */
export async function fetchLeadOpportunity(lead: Lead): Promise<SalesOpportunity> {
  const [convs, followups] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, lead_id, ai_enabled, human_attention_required, last_message_at")
      .eq("lead_id", lead.id)
      .order("last_message_at", { ascending: false })
      .limit(1),
    supabase
      .from("followup_jobs")
      .select("lead_id, run_at, status")
      .eq("lead_id", lead.id)
      .eq("status", "pending")
      .order("run_at", { ascending: true })
      .limit(1),
  ]);
  if (convs.error) throw convs.error;
  if (followups.error) throw followups.error;
  const conv = ((convs.data ?? [])[0] ?? null) as ConvRow | null;
  const followup = ((followups.data ?? [])[0] ?? null) as FollowupRow | null;
  return buildOpportunity(lead, conv, followup);
}
