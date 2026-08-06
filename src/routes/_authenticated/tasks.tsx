import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Gauge,
  ListChecks,
  Loader2,
  Play,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACTIVE_STATUSES,
  PRIORITY_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  computeTaskMetrics,
  fetchEngineTasks,
  fetchNotifications,
  formatDuration,
  type EngineTask,
} from "@/lib/tasks";
import {
  cancelTask,
  decideTask,
  markNotificationsRead,
  runEngineCycle,
  runTaskNow,
} from "@/lib/task-engine.functions";
import { WORKER_LABELS } from "@/lib/worker-labels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "AI Task Center — UMRAIO" },
      {
        name: "description",
        content:
          "Live queue, running jobs, approvals and productivity for every autonomous UMRAIO AI worker.",
      },
      { property: "og:title", content: "AI Task Center — UMRAIO" },
      {
        property: "og:description",
        content: "Observe, plan, execute, report — the autonomous task engine behind your AI workforce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TaskCenter,
});

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

function TaskCard({
  task,
  onRun,
  onCancel,
  onDecide,
  busy,
}: {
  task: EngineTask;
  onRun: (id: string) => void;
  onCancel: (id: string) => void;
  onDecide: (id: string, decision: "approve" | "reject") => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const steps = task.steps ?? [];

  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{task.title}</h3>
            <Badge className={cn("border-0", TASK_STATUS_TONE[task.status])}>
              {TASK_STATUS_LABEL[task.status]}
            </Badge>
            <Badge className={cn("border-0", PRIORITY_TONE[task.priority])}>{task.priority}</Badge>
            {task.origin === "autonomous" && (
              <Badge variant="outline" className="border-primary/40 text-primary">
                autonomous
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {WORKER_LABELS[task.worker_key] ?? task.worker_key} · {relative(task.created_at)}
          </p>
          {task.summary && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{task.summary}</p>
          )}
          {task.error && <p className="mt-2 text-sm text-destructive">{task.error}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {task.status === "queued" && (
            <>
              <Button size="sm" disabled={busy} onClick={() => onRun(task.id)}>
                <Play className="size-4" /> Run now
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onCancel(task.id)}>
                Cancel
              </Button>
            </>
          )}
          {task.status === "waiting_approval" && (
            <>
              <Button size="sm" disabled={busy} onClick={() => onDecide(task.id, "approve")}>
                <ShieldCheck className="size-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onDecide(task.id, "reject")}
              >
                Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Details"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {(task.plan ?? []).map((step, i) => (
                <li key={i} className="flex gap-2 text-muted-foreground">
                  <span className="text-primary">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {task.approval_reason && (
              <p className="mt-3 rounded-lg bg-chart-4/10 p-2 text-xs text-chart-4">
                {task.approval_reason}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Execution log
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {steps.map((step, i) => (
                <li key={i} className="flex justify-between gap-3 text-muted-foreground">
                  <span>{step.note}</span>
                  <span className="shrink-0 text-xs">{relative(step.at)}</span>
                </li>
              ))}
            </ul>
          </div>
          {task.output && (
            <div className="lg:col-span-2 space-y-3">
              {task.output.sections.map((section, i) => (
                <div key={i} className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-sm font-semibold">{section.heading}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function TaskList({
  tasks,
  empty,
  ...handlers
}: {
  tasks: EngineTask[];
  empty: string;
  onRun: (id: string) => void;
  onCancel: (id: string) => void;
  onDecide: (id: string, decision: "approve" | "reject") => void;
  busy: boolean;
}) {
  if (tasks.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} {...handlers} />
      ))}
    </div>
  );
}

function TaskCenter() {
  const qc = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: ["engine-tasks"],
    queryFn: () => fetchEngineTasks(),
    refetchInterval: 20_000,
  });
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30_000,
  });

  const runCycleFn = useServerFn(runEngineCycle);
  const runTaskFn = useServerFn(runTaskNow);
  const cancelFn = useServerFn(cancelTask);
  const decideFn = useServerFn(decideTask);
  const markReadFn = useServerFn(markNotificationsRead);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["engine-tasks"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["ai-tasks", "all"] });
    qc.invalidateQueries({ queryKey: ["ai-metrics"] });
    qc.invalidateQueries({ queryKey: ["ai-workers"] });
  };

  const cycle = useMutation({
    mutationFn: () => runCycleFn({}),
    onSuccess: (res) => {
      toast.success(
        `Autonomous cycle done — ${res.queued} task${res.queued === 1 ? "" : "s"} queued, ${res.executed.length} executed`,
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: (taskId: string) => runTaskFn({ data: { taskId } }),
    onSuccess: () => {
      toast.success("Task executed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (taskId: string) => cancelFn({ data: { taskId } }),
    onSuccess: () => {
      toast.success("Task cancelled");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: (v: { taskId: string; decision: "approve" | "reject" }) => decideFn({ data: v }),
    onSuccess: (_res, v) => {
      toast.success(v.decision === "approve" ? "Approved and published" : "Task rejected");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: () => markReadFn({ data: { ids: [] } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const tasks = tasksQuery.data ?? [];
  const metrics = useMemo(() => computeTaskMetrics(tasks), [tasks]);
  const busy = run.isPending || cancel.isPending || decide.isPending || cycle.isPending;

  const handlers = {
    onRun: (id: string) => run.mutate(id),
    onCancel: (id: string) => cancel.mutate(id),
    onDecide: (id: string, decision: "approve" | "reject") => decide.mutate({ taskId: id, decision }),
    busy,
  };

  const notifications = notificationsQuery.data ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="AI Task Center"
        title="Autonomous task engine"
        description="Observe, think, plan, execute, monitor, report — every AI worker job in one queue."
        actions={
          <Button onClick={() => cycle.mutate()} disabled={cycle.isPending}>
            {cycle.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Gauge className="size-4" />
            )}
            {cycle.isPending ? "Running cycle…" : "Run autonomous cycle"}
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={ListChecks} label="In queue" value={String(metrics.queued)} hint="Waiting to execute" />
        <KpiCard icon={Loader2} label="Running" value={String(metrics.running)} hint="Analysing, planning, executing" />
        <KpiCard
          icon={ShieldCheck}
          label="Waiting approval"
          value={String(metrics.waitingApproval)}
          hint="Needs a human decision"
        />
        <KpiCard icon={CheckCircle2} label="Completed" value={String(metrics.completed)} hint="Finished autonomously" />
        <KpiCard
          icon={Timer}
          label="Avg completion time"
          value={formatDuration(metrics.avgCompletionSeconds)}
          hint="Per completed task"
        />
        <KpiCard
          icon={Clock}
          label="AI productivity"
          value={`${metrics.hoursSaved.toFixed(1)}h`}
          hint={
            metrics.successRate == null
              ? "Hours saved"
              : `Hours saved · ${metrics.successRate.toFixed(0)}% success rate`
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          {tasksQuery.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="queue">
              <TabsList className="flex-wrap">
                <TabsTrigger value="queue">Queue ({metrics.queued})</TabsTrigger>
                <TabsTrigger value="running">Running ({metrics.running})</TabsTrigger>
                <TabsTrigger value="approval">Approvals ({metrics.waitingApproval})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({metrics.completed})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({metrics.failed})</TabsTrigger>
              </TabsList>
              <TabsContent value="queue" className="mt-4">
                <TaskList
                  tasks={tasks.filter((t) => t.status === "queued")}
                  empty="Nothing queued. The engine will queue work on the next cycle."
                  {...handlers}
                />
              </TabsContent>
              <TabsContent value="running" className="mt-4">
                <TaskList
                  tasks={tasks.filter((t) => ACTIVE_STATUSES.includes(t.status))}
                  empty="No task is running right now."
                  {...handlers}
                />
              </TabsContent>
              <TabsContent value="approval" className="mt-4">
                <TaskList
                  tasks={tasks.filter((t) => t.status === "waiting_approval")}
                  empty="No task is waiting for your approval."
                  {...handlers}
                />
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <TaskList
                  tasks={tasks.filter((t) => t.status === "completed")}
                  empty="No completed tasks yet."
                  {...handlers}
                />
              </TabsContent>
              <TabsContent value="failed" className="mt-4">
                <TaskList
                  tasks={tasks.filter((t) =>
                    ["failed", "rejected", "cancelled"].includes(t.status),
                  )}
                  empty="No failed or cancelled tasks."
                  {...handlers}
                />
              </TabsContent>
            </Tabs>
          )}
        </section>

        <aside className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Notifications</h2>
              {unread > 0 && <Badge className="border-0 bg-primary/15 text-primary">{unread}</Badge>}
            </div>
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={() => markRead.mutate()}>
                Mark read
              </Button>
            )}
          </div>
          <ul className="mt-3 space-y-3">
            {notifications.length === 0 && (
              <li className="text-sm text-muted-foreground">No notifications yet.</li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border border-border p-3",
                  n.read_at ? "opacity-60" : "bg-background/60",
                )}
              >
                <div className="flex items-start gap-2">
                  {n.severity === "critical" ? (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : n.severity === "warning" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-4" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{relative(n.created_at)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
