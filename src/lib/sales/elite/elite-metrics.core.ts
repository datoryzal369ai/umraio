/**
 * AI SALES ELITE™ — pipeline metrics & next-best-action queue.
 *
 * Pure derivation from rows the dashboard already loads. No new queries, no new
 * tables: the Elite layer reads the same pipeline the rest of UMRAIO writes to.
 */

export type EliteLeadRow = {
  id: string;
  full_name: string;
  stage: string;
  score: number;
  budget_myr: number | null;
  pax: number;
  last_contact_at: string | null;
  created_at: string;
};

export type EliteFollowupRow = { id: string; run_at: string; status: string; lead_id: string | null };
export type EliteBookingRow = { amount_myr: number; status: string; created_at: string };
export type EliteConversationRow = { id: string; status: string; ai_enabled: boolean; last_message_at: string };

export type EliteMetrics = {
  leadsEngaged: number;
  qualifiedLeads: number;
  highIntentLeads: number;
  conversationsInClosing: number;
  followupsDue: number;
  salesWon: number;
  conversionRate: number;
  revenueInfluencedMyr: number;
};

const WON_STAGES = new Set(["won", "completed", "closed_won", "booked"]);
const LOST_STAGES = new Set(["lost", "closed_lost", "cancelled"]);
const CLOSING_STAGES = new Set(["proposal", "negotiation", "quotation", "closing", "deposit"]);

const isWon = (stage: string) => WON_STAGES.has(stage?.toLowerCase?.() ?? "");
const isLost = (stage: string) => LOST_STAGES.has(stage?.toLowerCase?.() ?? "");

/** Qualified = enough is known to recommend; high intent = close-ready score. */
export const QUALIFIED_SCORE = 45;
export const HIGH_INTENT_SCORE = 70;

export function computeEliteMetrics(input: {
  leads: EliteLeadRow[];
  followups: EliteFollowupRow[];
  bookings: EliteBookingRow[];
  conversations: EliteConversationRow[];
  now?: Date;
}): EliteMetrics {
  const now = input.now ?? new Date();
  const open = input.leads.filter((l) => !isLost(l.stage));
  const qualified = open.filter((l) => (l.score ?? 0) >= QUALIFIED_SCORE);
  const highIntent = open.filter((l) => (l.score ?? 0) >= HIGH_INTENT_SCORE && !isWon(l.stage));
  const won = input.leads.filter((l) => isWon(l.stage));

  const closing = open.filter(
    (l) => CLOSING_STAGES.has(l.stage?.toLowerCase?.() ?? "") || (l.score ?? 0) >= HIGH_INTENT_SCORE,
  );

  const followupsDue = input.followups.filter(
    (f) => f.status === "pending" && new Date(f.run_at).getTime() <= now.getTime(),
  ).length;

  const revenueBooked = input.bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + Number(b.amount_myr ?? 0), 0);
  // Influenced pipeline = booked revenue + weighted open pipeline value.
  const pipelineValue = open
    .filter((l) => !isWon(l.stage))
    .reduce((sum, l) => sum + Number(l.budget_myr ?? 0) * Math.max(1, l.pax ?? 1) * ((l.score ?? 0) / 100), 0);

  const engaged = new Set([
    ...input.leads.map((l) => l.id),
    ...input.conversations.map((c) => c.id),
  ]).size;

  return {
    leadsEngaged: engaged,
    qualifiedLeads: qualified.length,
    highIntentLeads: highIntent.length,
    conversationsInClosing: closing.length,
    followupsDue,
    salesWon: won.length,
    conversionRate: input.leads.length ? Math.round((won.length / input.leads.length) * 100) : 0,
    revenueInfluencedMyr: Math.round(revenueBooked + pipelineValue),
  };
}

export type EliteNextAction = {
  id: string;
  priority: "critical" | "high" | "normal";
  label: string;
};

/** The short "what should a human do next" queue shown on the dashboard. */
export function buildEliteNextActions(input: {
  leads: EliteLeadRow[];
  followups: EliteFollowupRow[];
  conversations: EliteConversationRow[];
  metrics: EliteMetrics;
  now?: Date;
}): EliteNextAction[] {
  const now = input.now ?? new Date();
  const out: EliteNextAction[] = [];
  const m = input.metrics;

  const takeovers = input.conversations.filter((c) => c.ai_enabled === false).length;
  if (takeovers > 0) {
    out.push({
      id: "human-takeover",
      priority: "critical",
      label: `${takeovers} conversation${takeovers > 1 ? "s" : ""} waiting on a human consultant`,
    });
  }
  if (m.highIntentLeads > 0) {
    out.push({
      id: "high-intent",
      priority: "critical",
      label: `${m.highIntentLeads} high-intent lead${m.highIntentLeads > 1 ? "s" : ""} ready for closing`,
    });
  }
  if (m.followupsDue > 0) {
    out.push({
      id: "followups",
      priority: "high",
      label: `${m.followupsDue} follow-up${m.followupsDue > 1 ? "s" : ""} due now`,
    });
  }

  const stale = input.leads.filter((l) => {
    if (isWon(l.stage) || isLost(l.stage)) return false;
    const last = l.last_contact_at ?? l.created_at;
    return now.getTime() - new Date(last).getTime() > 72 * 3600 * 1000 && (l.score ?? 0) >= QUALIFIED_SCORE;
  }).length;
  if (stale > 0) {
    out.push({
      id: "stale",
      priority: "high",
      label: `${stale} qualified lead${stale > 1 ? "s" : ""} gone quiet for 3+ days — re-engage on the last real topic`,
    });
  }

  const unqualified = input.leads.filter(
    (l) => !isWon(l.stage) && !isLost(l.stage) && (l.score ?? 0) < QUALIFIED_SCORE,
  ).length;
  if (unqualified > 0) {
    out.push({
      id: "qualify",
      priority: "normal",
      label: `${unqualified} lead${unqualified > 1 ? "s" : ""} still need qualifying before a recommendation`,
    });
  }

  if (!out.length) {
    out.push({ id: "clear", priority: "normal", label: "No open sales actions — the pipeline is clear" });
  }
  return out.slice(0, 5);
}
