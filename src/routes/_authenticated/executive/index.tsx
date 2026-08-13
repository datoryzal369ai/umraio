import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock,
  MessageSquare,
  Radar,
  Sparkles,
  TicketCheck,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ExecutiveCommandPanel } from "@/components/executive/ExecutiveCommandPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STATUS_LABEL,
  STATUS_TONE,
  fetchAiActivity,
  fetchExecutiveMetrics,
  fetchTasks,
  fetchWorkers,
  type WorkerStatus,
} from "@/lib/executive";
import { myr } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/executive/")({
  head: () => ({
    meta: [
      { title: "AI Executive Center — UMRAIO" },
      {
        name: "description",
        content:
          "Command every UMRAIO AI worker from one place: live status, tasks completed, leads generated, revenue influenced and hours saved.",
      },
      { property: "og:title", content: "AI Executive Center — UMRAIO" },
      {
        property: "og:description",
        content: "Live control room for your Autonomous AI Business Executive workforce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExecutiveCenter,
});

const workerIcon: Record<string, typeof Bot> = {
  whatsapp: MessageSquare,
  marketing: Sparkles,
  content: BrainCircuit,
  lead_intel: Radar,
};

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

function ExecutiveCenter() {
  const workers = useQuery({ queryKey: ["ai-workers"], queryFn: fetchWorkers });
  const metrics = useQuery({
    queryKey: ["ai-metrics"],
    queryFn: fetchExecutiveMetrics,
    refetchInterval: 60_000,
  });
  const tasks = useQuery({ queryKey: ["ai-tasks", "all"], queryFn: () => fetchTasks(undefined, 8) });
  const activity = useQuery({ queryKey: ["ai-activity"], queryFn: () => fetchAiActivity(20) });

  const m = metrics.data;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="AI Executive Center"
        title="Your AI workforce"
        description="Think, plan, decide, execute, report — every AI worker in one control room."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <Bot className="size-4 text-primary" />
            <span className="text-xs font-medium">
              {m ? `${m.pendingApprovals} waiting for approval` : "Syncing…"}
            </span>
          </div>
        }
      />

      <ExecutiveCommandPanel workers={workers.data ?? []} workersLoading={workers.isLoading} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={CheckCircle2}
          label="Tasks completed today"
          value={m ? String(m.tasksToday) : "—"}
          hint="AI worker jobs executed"
        />
        <KpiCard
          icon={MessageSquare}
          label="Messages answered"
          value={m ? String(m.messagesAnswered) : "—"}
          hint="AI replies sent today"
        />
        <KpiCard
          icon={UserPlus}
          label="Leads generated"
          value={m ? String(m.leadsGenerated) : "—"}
          hint="New leads captured today"
        />
        <KpiCard
          icon={TicketCheck}
          label="Bookings assisted"
          value={m ? String(m.bookingsAssisted) : "—"}
          hint="Bookings created today"
        />
        <KpiCard
          icon={TrendingUp}
          label="Revenue influenced"
          value={m ? myr(m.revenueInfluenced) : "—"}
          hint="Value of today's bookings"
        />
        <KpiCard
          icon={Clock}
          label="Hours saved"
          value={m ? `${m.hoursSaved.toFixed(1)}h` : "—"}
          hint="Human hours replaced today"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {workers.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
          : (workers.data ?? []).map((worker) => {
              const Icon = workerIcon[worker.worker_key] ?? Bot;
              const status = (worker.is_enabled ? worker.status : "idle") as WorkerStatus;
              return (
                <article key={worker.id} className="panel flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">{worker.name}</h2>
                        <p className="text-xs text-muted-foreground">{worker.description}</p>
                      </div>
                    </div>
                    <Badge className={cn("shrink-0 border-0", STATUS_TONE[status])}>
                      {STATUS_LABEL[status]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {worker.last_run_at ? `Last run ${relative(worker.last_run_at)}` : "Not run yet"}
                      {" · "}
                      {worker.autonomy === "auto" ? "Autonomous" : "Approval required"}
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to="/executive/$workerKey"
                        params={{ workerKey: worker.worker_key }}
                      >
                        Open worker
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-base font-semibold">Latest AI tasks</h2>
          <p className="text-xs text-muted-foreground">What the workforce produced recently</p>
          <ul className="mt-4 space-y-2">
            {(tasks.data ?? []).length === 0 ? (
              <li className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No AI tasks yet. Open a worker to run one.
              </li>
            ) : (
              (tasks.data ?? []).map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-surface p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {task.summary ?? task.error ?? "Processing…"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relative(task.created_at)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <CalendarClock className="size-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Activity log</h2>
              <p className="text-xs text-muted-foreground">Every AI and human action</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1">
            {(activity.data ?? []).length === 0 ? (
              <li className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                Nothing logged yet.
              </li>
            ) : (
              (activity.data ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        item.actor === "ai"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.actor}
                    </span>
                    <p className="truncate text-sm">{item.action}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relative(item.created_at)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
