import { supabase } from "@/integrations/supabase/client";
import { fetchLeads, type Lead, type LeadStage } from "@/lib/leads";

/**
 * Deterministic sales-opportunity derivation.
 *
 * READ-ONLY. This module never writes. It reuses the existing lead score
 * (written by the AI `update_lead_profile` tool through the governed tool
 * registry), existing conversations state and existing follow-up jobs.
 * No second scoring system is introduced here.
 */

export type IntentBand = "high" | "medium" | "low";

export type OpportunityReason =
  | "human_attention"
  | "no_contact"
  | "awaiting_reply"
  | "followup_due"
  | "missing_info"
  | "high_intent";

export type SalesOpportunity = {
  lead: Lead;
  intent: IntentBand;
  /** Higher = more urgent. Derived from existing score + signals. */
  urgency: number;
  reasons: OpportunityReason[];
  /** Human-readable recommended next action. Advisory only — never executed automatically. */
  nextAction: string;
  missing: string[];
  conversationId: string | null;
  humanAttention: boolean;
  aiPaused: boolean;
  lastCustomerMessageAt: string | null;
  pendingFollowupAt: string | null;
};

export const INTENT_LABEL: Record<IntentBand, string> = {
  high: "High intent",
  medium: "Medium intent",
  low: "Low intent",
};

export const INTENT_TONE: Record<IntentBand, string> = {
  high: "bg-chart-4/15 text-chart-4",
  medium: "bg-primary/15 text-primary",
  low: "bg-muted text-muted-foreground",
};

export const REASON_LABEL: Record<OpportunityReason, string> = {
  human_attention: "Human attention required",
  no_contact: "No contact yet",
  awaiting_reply: "No reply in 24h+",
  followup_due: "Follow-up due",
  missing_info: "Missing qualification info",
  high_intent: "High intent",
};

const OPEN_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "negotiation",
  "booked",
];

const DAY = 24 * 60 * 60 * 1000;

/** Uses the existing deterministic lead score only. */
export function intentBand(lead: Pick<Lead, "score" | "temperature">): IntentBand {
  if (lead.score >= 70 || lead.temperature === "hot") return "high";
  if (lead.score >= 40 || lead.temperature === "warm") return "medium";
  return "low";
}

type ConvRow = {
  id: string;
  lead_id: string | null;
  ai_enabled: boolean;
  human_attention_required: boolean;
  last_message_at: string;
};

type FollowupRow = { lead_id: string | null; run_at: string; status: string };

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
    .map((lead) => buildOpportunity(lead, convByLead.get(lead.id) ?? null, followupByLead.get(lead.id) ?? null))
    .filter((opp) => opp.reasons.length > 0)
    .sort((a, b) => b.urgency - a.urgency);
}

export function missingQualification(lead: Lead): string[] {
  const missing: string[] = [];
  if (!lead.phone) missing.push("phone");
  if (!lead.pax || lead.pax < 1) missing.push("pax");
  if (!lead.preferred_month) missing.push("travel month");
  if (!lead.budget_myr) missing.push("budget");
  return missing;
}

export function buildOpportunity(
  lead: Lead,
  conv: ConvRow | null,
  followup: FollowupRow | null,
): SalesOpportunity {
  const intent = intentBand(lead);
  const reasons: OpportunityReason[] = [];
  const missing = missingQualification(lead);
  const now = Date.now();

  const humanAttention = Boolean(conv?.human_attention_required);
  const aiPaused = conv ? conv.ai_enabled === false : false;
  const lastTouch = lead.last_contact_at ?? conv?.last_message_at ?? null;
  const staleMs = lastTouch ? now - new Date(lastTouch).getTime() : Infinity;

  if (humanAttention || aiPaused) reasons.push("human_attention");
  if (!lastTouch) reasons.push("no_contact");
  else if (staleMs > DAY) reasons.push("awaiting_reply");
  if (followup && new Date(followup.run_at).getTime() <= now) reasons.push("followup_due");
  if (intent !== "low" && missing.length > 0) reasons.push("missing_info");
  if (intent === "high" && reasons.length === 0) reasons.push("high_intent");

  let urgency = lead.score;
  if (humanAttention || aiPaused) urgency += 60;
  if (reasons.includes("followup_due")) urgency += 25;
  if (reasons.includes("no_contact")) urgency += 20;
  else if (reasons.includes("awaiting_reply")) urgency += Math.min(20, Math.floor(staleMs / DAY) * 5);
  if (intent === "high") urgency += 15;

  return {
    lead,
    intent,
    urgency,
    reasons,
    missing,
    nextAction: nextBestAction({ lead, intent, missing, humanAttention, aiPaused, reasons }),
    conversationId: conv?.id ?? null,
    humanAttention,
    aiPaused,
    lastCustomerMessageAt: conv?.last_message_at ?? null,
    pendingFollowupAt: followup?.run_at ?? null,
  };
}

function nextBestAction(args: {
  lead: Lead;
  intent: IntentBand;
  missing: string[];
  humanAttention: boolean;
  aiPaused: boolean;
  reasons: OpportunityReason[];
}): string {
  const { lead, intent, missing, humanAttention, aiPaused, reasons } = args;

  if (aiPaused) return "Customer asked for a human — reply personally in the AI Inbox.";
  if (humanAttention) return "Human attention flagged by the AI — review the conversation and respond.";
  if (lead.stage === "booked") return "Confirm booking details and record the outcome.";
  if (reasons.includes("no_contact")) return "Open the first conversation and qualify this lead.";
  if (reasons.includes("followup_due")) return "Follow-up is due now — send the scheduled message.";
  if (missing.length > 0 && intent !== "low") {
    return `Ask for the missing details: ${missing.join(", ")}.`;
  }
  if (intent === "high") return "Recommend a matching package and push for a booking decision.";
  if (reasons.includes("awaiting_reply")) return "No reply in over 24h — send a gentle follow-up.";
  return "Keep nurturing — wait for the customer's response.";
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
