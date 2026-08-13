import type { Lead, LeadStage } from "@/lib/leads";

/**
 * Deterministic sales-opportunity derivation — PURE logic only.
 *
 * Extracted so both the browser (Step 2 UI) and the server-side executive
 * orchestrator can reuse the SAME rules. No second scoring model, no
 * database access, no browser client import.
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
  /** Human-readable recommended next action. */
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

export const OPEN_STAGES: LeadStage[] = ["new", "contacted", "qualified", "negotiation", "booked"];

const DAY = 24 * 60 * 60 * 1000;

/** Uses the existing deterministic lead score only. */
export function intentBand(lead: Pick<Lead, "score" | "temperature">): IntentBand {
  if (lead.score >= 70 || lead.temperature === "hot") return "high";
  if (lead.score >= 40 || lead.temperature === "warm") return "medium";
  return "low";
}

export type ConvRow = {
  id: string;
  lead_id: string | null;
  ai_enabled: boolean;
  human_attention_required: boolean;
  last_message_at: string;
};

export type FollowupRow = { lead_id: string | null; run_at: string; status: string };

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
  else if (reasons.includes("awaiting_reply"))
    urgency += Math.min(20, Math.floor(staleMs / DAY) * 5);
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

export function nextBestAction(args: {
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
