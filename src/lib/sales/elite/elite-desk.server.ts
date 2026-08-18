/**
 * AI SALES ELITE™ — sales desk loader.
 *
 * Reads the SAME live pipeline the rest of UMRAIO writes to (leads,
 * conversations, messages, follow-ups, bookings) and runs each active
 * conversation through the existing Elite engine. No new tables, no derived
 * storage, no fabricated numbers: when there is no data, the desk is empty.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildConversationIntelligence,
  type ConversationIntelligence,
} from "@/lib/sales/conversation-intelligence.core";
import {
  buildEliteRead,
  eliteHandoffBrief,
  type EliteRead,
  type SalesDomain,
} from "@/lib/sales/elite/elite-sales.core";
import {
  buildEliteNextActions,
  computeEliteMetrics,
  type EliteMetrics,
  type EliteNextAction,
} from "@/lib/sales/elite/elite-metrics.core";

export type EliteDeskItem = {
  conversationId: string;
  leadId: string | null;
  leadName: string;
  stage: string;
  score: number;
  pax: number | null;
  budgetMyr: number | null;
  lastMessageAt: string;
  humanTakeover: boolean;
  domain: SalesDomain;
  read: EliteRead;
  activeObjections: string[];
  buyingSignals: string[];
  missing: string[];
  /** Populated only when the conversation genuinely needs a human. */
  handoffBrief: string | null;
};

export type EliteDesk = {
  metrics: EliteMetrics;
  nextActions: EliteNextAction[];
  items: EliteDeskItem[];
  /** True when the agency has no pipeline data at all yet. */
  empty: boolean;
};

type AnyClient = SupabaseClient<any, any, any>;

const sinceIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export async function loadEliteDesk(supabase: AnyClient): Promise<EliteDesk> {
  const [leadsRes, conversationsRes, followupsRes, bookingsRes] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, full_name, city, stage, score, budget_myr, pax, preferred_month, package_interest, last_contact_at, created_at",
      )
      .gte("created_at", sinceIso(365))
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("conversations")
      .select("id, lead_id, status, ai_enabled, human_attention_required, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(60),
    supabase
      .from("followup_jobs")
      .select("id, run_at, status, lead_id")
      .eq("status", "pending")
      .order("run_at", { ascending: true })
      .limit(50),
    supabase
      .from("bookings")
      .select("amount_myr, status, created_at")
      .gte("created_at", sinceIso(365))
      .limit(500),
  ]);

  const leads = (leadsRes.data ?? []) as Array<Record<string, any>>;
  const conversations = (conversationsRes.data ?? []) as Array<Record<string, any>>;
  const followups = (followupsRes.data ?? []) as Array<Record<string, any>>;
  const bookings = (bookingsRes.data ?? []) as Array<Record<string, any>>;

  const metrics = computeEliteMetrics({
    leads: leads as never,
    followups: followups as never,
    bookings: bookings as never,
    conversations: conversations as never,
  });
  const nextActions = buildEliteNextActions({
    leads: leads as never,
    followups: followups as never,
    conversations: conversations as never,
    metrics,
  });

  const active = conversations.slice(0, 25);
  const messagesRes = active.length
    ? await supabase
        .from("messages")
        .select("conversation_id, sender, body, created_at")
        .in(
          "conversation_id",
          active.map((c) => c['id'] as string),
        )
        .order("created_at", { ascending: true })
        .limit(1200)
    : { data: [] as Array<Record<string, any>> };

  const byConversation = new Map<string, Array<Record<string, any>>>();
  for (const m of (messagesRes.data ?? []) as Array<Record<string, any>>) {
    const list = byConversation.get(m['conversation_id'] as string) ?? [];
    list.push(m);
    byConversation.set(m['conversation_id'] as string, list);
  }

  const leadById = new Map(leads.map((l) => [l['id'] as string, l]));

  const items: EliteDeskItem[] = active
    .map((conversation): EliteDeskItem | null => {
      const messages = byConversation.get(conversation['id'] as string) ?? [];
      if (!messages.length) return null;
      const lead = conversation['lead_id'] ? (leadById.get(conversation['lead_id'] as string) ?? null) : null;

      const intel: ConversationIntelligence = buildConversationIntelligence({
        messages: messages.map((m) => ({
          sender: m['sender'] as "customer" | "ai" | "human",
          body: String(m['body'] ?? ""),
          created_at: m['created_at'] as string,
        })),
        lead: lead
          ? {
              fullName: lead["full_name"] ?? null,
              city: lead["city"] ?? null,
              pax: lead["pax"] ?? null,
              preferredMonth: lead["preferred_month"] ?? null,
              budgetMyr: lead["budget_myr"] ?? null,
              packageInterest: lead["package_interest"] ?? null,
              stage: lead["stage"] ?? null,
            }
          : null,
        quotation: null,
        humanTakeover: conversation["ai_enabled"] === false,
      });

      const customerMessages = messages
        .filter((m) => m['sender'] === "customer")
        .map((m) => String(m['body'] ?? ""));
      const lastCustomerAt = messages
        .filter((m) => m['sender'] === "customer")
        .map((m) => new Date(m['created_at'] as string).getTime())
        .pop();

      const read = buildEliteRead({
        domain: "agency_customer",
        customerMessages,
        upstreamState: intel.nextBestAction,
        signals: intel.signals,
        activeObjections: intel.activeObjections,
        resolvedObjections: intel.objectionLifecycle
          .filter((o) => o.status === "RESOLVED")
          .map((o) => o.category),
        buyingSignals: intel.buyingSignals,
        known: intel.known,
        missing: intel.missing,
        optOut: intel.optOut,
        humanRequested: intel.humanRequested,
        humanTakeover: conversation["ai_enabled"] === false,
        hoursSinceCustomerMessage:
          lastCustomerAt === undefined
            ? null
            : Math.max(0, (Date.now() - lastCustomerAt) / 3_600_000),
      });

      const needsHuman =
        read.escalate ||
        conversation["human_attention_required"] === true ||
        conversation["ai_enabled"] === false;

      return {
        conversationId: conversation['id'] as string,
        leadId: (conversation['lead_id'] as string | null) ?? null,
        leadName: (lead?.["full_name"] as string | undefined) ?? "Unnamed enquiry",
        stage: (lead?.["stage"] as string | undefined) ?? "new",
        score: Number(lead?.["score"] ?? 0),
        pax: (lead?.["pax"] as number | undefined) ?? null,
        budgetMyr: (lead?.["budget_myr"] as number | undefined) ?? null,
        lastMessageAt: conversation["last_message_at"] as string,
        humanTakeover: conversation["ai_enabled"] === false,
        domain: "agency_customer" as SalesDomain,
        read,
        activeObjections: intel.activeObjections,
        buyingSignals: intel.buyingSignals,
        missing: intel.missing,
        handoffBrief: needsHuman
          ? eliteHandoffBrief({
              read,
              customerName: (lead?.["full_name"] as string | undefined) ?? null,
              budgetMyr: (lead?.["budget_myr"] as number | undefined) ?? null,
              pax: (lead?.["pax"] as number | undefined) ?? null,
              packageInterest: (lead?.["package_interest"] as string | undefined) ?? null,
              discussed: intel.known,
              reason:
                read.escalationReason ??
                (conversation["ai_enabled"] === false
                  ? "A human colleague already owns this conversation."
                  : "This conversation was flagged for human attention."),
            })
          : null,
      } as EliteDeskItem;
    })
    .filter((x) => x !== null)
    .sort((a, b) => {
      const rank = (i: EliteDeskItem) =>
        (i.read.escalate ? 0 : i.read.psychology.readiness === "high" ? 1 : 2) * 1000 - i.score;
      return rank(a) - rank(b);
    });

  return {
    metrics,
    nextActions,
    items,
    empty: leads.length === 0 && conversations.length === 0,
  };
}
