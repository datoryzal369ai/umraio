import { supabase } from "@/integrations/supabase/client";
import { startOfToday } from "@/lib/dashboard";

export type WhatsappExecutiveStats = {
  conversationsToday: number;
  aiReplyRate: number;
  humanTakeovers: number;
  leadsGenerated: number;
  bookingsGenerated: number;
  avgResponseMs: number | null;
  openEscalations: number;
};

export async function fetchWhatsappExecutiveStats(): Promise<WhatsappExecutiveStats> {
  const since = startOfToday().toISOString();

  const [conversations, messages, leads, bookings, escalations] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, first_response_ms, escalated_at, ai_enabled")
      .eq("channel", "whatsapp")
      .gte("last_message_at", since),
    supabase
      .from("messages")
      .select("id, sender, conversation_id")
      .gte("created_at", since)
      .limit(2000),
    supabase
      .from("leads")
      .select("id")
      .eq("source", "whatsapp")
      .gte("created_at", since),
    supabase.from("bookings").select("id").gte("created_at", since),
    supabase
      .from("conversations")
      .select("id")
      .eq("channel", "whatsapp")
      .eq("ai_enabled", false)
      .not("escalated_at", "is", null),
  ]);

  const convs = conversations.data ?? [];
  const msgs = messages.data ?? [];
  const customerMsgs = msgs.filter((m) => m.sender === "customer").length;
  const aiMsgs = msgs.filter((m) => m.sender === "ai").length;
  const responseTimes = convs
    .map((c) => c.first_response_ms)
    .filter((v): v is number => typeof v === "number" && v > 0);

  return {
    conversationsToday: convs.length,
    aiReplyRate: customerMsgs ? Math.min(100, (aiMsgs / customerMsgs) * 100) : 0,
    humanTakeovers: convs.filter((c) => c.escalated_at && new Date(c.escalated_at) >= new Date(since))
      .length,
    leadsGenerated: (leads.data ?? []).length,
    bookingsGenerated: (bookings.data ?? []).length,
    avgResponseMs: responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null,
    openEscalations: (escalations.data ?? []).length,
  };
}

export function formatResponseTime(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}
