import { supabase } from "@/integrations/supabase/client";
import { startOfToday } from "@/lib/dashboard";

export type WorkerStatus =
  | "active"
  | "idle"
  | "processing"
  | "completed"
  | "waiting_approval";

export type AiWorker = {
  id: string;
  worker_key: string;
  name: string;
  description: string;
  status: WorkerStatus;
  is_enabled: boolean;
  autonomy: string;
  last_run_at: string | null;
};

export type AiTask = {
  id: string;
  worker_key: string;
  title: string;
  kind: string;
  status: "queued" | "processing" | "waiting_approval" | "completed" | "failed" | "rejected";
  summary: string | null;
  error: string | null;
  output: { summary: string; sections: { heading: string; body: string }[] } | null;
  minutes_saved: number;
  created_at: string;
  completed_at: string | null;
};

export type ExecutiveMetrics = {
  tasksToday: number;
  messagesAnswered: number;
  leadsGenerated: number;
  bookingsAssisted: number;
  revenueInfluenced: number;
  hoursSaved: number;
  pendingApprovals: number;
};

export const WORKER_TASKS: Record<string, { kind: string; label: string }[]> = {
  whatsapp: [{ kind: "followup_sweep", label: "Run follow-up sweep" }],
  marketing: [
    { kind: "facebook_ads", label: "Facebook Ads campaign" },
    { kind: "tiktok_ads", label: "TikTok Ads campaign" },
    { kind: "google_ads", label: "Google Ads campaign" },
    { kind: "whatsapp_broadcast", label: "WhatsApp broadcast" },
    { kind: "daily_campaign_plan", label: "Daily campaign plan" },
  ],
  content: [
    { kind: "social_post", label: "Social media posts" },
    { kind: "blog_article", label: "Blog article" },
    { kind: "marketing_email", label: "Marketing email" },
    { kind: "whatsapp_promo", label: "WhatsApp promo messages" },
    { kind: "video_script", label: "Video script ideas" },
  ],
  lead_intel: [{ kind: "lead_scoring", label: "Score & prioritise leads" }],
};

export async function fetchWorkers(): Promise<AiWorker[]> {
  const { data, error } = await supabase
    .from("ai_workers")
    .select("id, worker_key, name, description, status, is_enabled, autonomy, last_run_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AiWorker[];
}

export async function fetchTasks(workerKey?: string, limit = 40): Promise<AiTask[]> {
  let query = supabase
    .from("ai_tasks")
    .select(
      "id, worker_key, title, kind, status, summary, error, output, minutes_saved, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (workerKey) query = query.eq("worker_key", workerKey);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AiTask[];
}

export async function fetchExecutiveMetrics(): Promise<ExecutiveMetrics> {
  const since = startOfToday().toISOString();

  const [tasks, messages, leads, bookings, pending] = await Promise.all([
    supabase
      .from("ai_tasks")
      .select("id, minutes_saved, status")
      .gte("created_at", since),
    supabase.from("messages").select("id").eq("sender", "ai").gte("created_at", since),
    supabase.from("leads").select("id").gte("created_at", since),
    supabase.from("bookings").select("id, amount_myr").gte("created_at", since),
    supabase.from("ai_tasks").select("id").eq("status", "waiting_approval"),
  ]);

  const taskRows = tasks.data ?? [];
  const messageCount = (messages.data ?? []).length;
  const taskMinutes = taskRows
    .filter((t) => t.status === "completed" || t.status === "waiting_approval")
    .reduce((sum, t) => sum + (t.minutes_saved ?? 0), 0);

  return {
    tasksToday: taskRows.length,
    messagesAnswered: messageCount,
    leadsGenerated: (leads.data ?? []).length,
    bookingsAssisted: (bookings.data ?? []).length,
    revenueInfluenced: (bookings.data ?? []).reduce((s, b) => s + Number(b.amount_myr ?? 0), 0),
    hoursSaved: (taskMinutes + messageCount * 2) / 60,
    pendingApprovals: (pending.data ?? []).length,
  };
}

export async function fetchAiActivity(limit = 25) {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, actor, action, entity, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export const STATUS_LABEL: Record<WorkerStatus, string> = {
  active: "Active",
  idle: "Idle",
  processing: "Processing",
  completed: "Completed",
  waiting_approval: "Waiting for approval",
};

export const STATUS_TONE: Record<WorkerStatus, string> = {
  active: "bg-success/15 text-success",
  idle: "bg-muted text-muted-foreground",
  processing: "bg-primary/15 text-primary",
  completed: "bg-chart-3/15 text-chart-3",
  waiting_approval: "bg-chart-4/15 text-chart-4",
};
