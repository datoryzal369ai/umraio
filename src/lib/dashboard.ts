import { supabase } from "@/integrations/supabase/client";

export type LeadRow = {
  id: string;
  full_name: string;
  phone: string | null;
  source: string;
  stage: string;
  score: number;
  budget_myr: number | null;
  pax: number;
  preferred_month: string | null;
  last_contact_at: string | null;
  created_at: string;
};

export type BookingRow = {
  id: string;
  pax: number;
  amount_myr: number;
  status: string;
  created_at: string;
};

export type FollowupRow = {
  id: string;
  title: string;
  run_at: string;
  status: string;
  lead_id: string | null;
};

export type ActivityRow = {
  id: string;
  actor: string;
  action: string;
  entity: string | null;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  status: string;
  ai_enabled: boolean;
  last_message_at: string;
};

export type DashboardData = {
  leads: LeadRow[];
  bookings: BookingRow[];
  followups: FollowupRow[];
  activities: ActivityRow[];
  conversations: ConversationRow[];
};

const sinceIso = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export async function fetchDashboard(): Promise<DashboardData> {
  const [leads, bookings, followups, activities, conversations] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, full_name, phone, source, stage, score, budget_myr, pax, preferred_month, last_contact_at, created_at",
      )
      .gte("created_at", sinceIso(365))
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("bookings")
      .select("id, pax, amount_myr, status, created_at")
      .gte("created_at", sinceIso(365))
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("followup_jobs")
      .select("id, title, run_at, status, lead_id")
      .eq("status", "pending")
      .order("run_at", { ascending: true })
      .limit(20),
    supabase
      .from("activity_log")
      .select("id, actor, action, entity, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("conversations")
      .select("id, status, ai_enabled, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(500),
  ]);

  return {
    leads: (leads.data ?? []) as LeadRow[],
    bookings: (bookings.data ?? []).map((b) => ({
      ...b,
      amount_myr: Number(b.amount_myr ?? 0),
    })) as BookingRow[],
    followups: (followups.data ?? []) as FollowupRow[],
    activities: (activities.data ?? []) as ActivityRow[],
    conversations: (conversations.data ?? []) as ConversationRow[],
  };
}

export const myr = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function monthlySeries(data: DashboardData, months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= d.getTime() && t < next.getTime();
    };
    const monthLeads = data.leads.filter((l) => inRange(l.created_at));
    const monthBookings = data.bookings.filter((b) => inRange(b.created_at));
    return {
      month: d.toLocaleString("en-MY", { month: "short" }),
      leads: monthLeads.length,
      bookings: monthBookings.length,
      revenue: monthBookings.reduce((sum, b) => sum + Number(b.amount_myr), 0),
    };
  });
}
