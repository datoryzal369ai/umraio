import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getUsageOverview } from "@/lib/billing/usage.functions";
import { cn } from "@/lib/utils";

function Meter({
  label,
  used,
  limit,
  ratio,
  hint,
}: {
  label: string;
  used: number;
  limit: number;
  ratio: number;
  hint: string;
}) {
  const pct = Math.min(100, Math.round(ratio * 100));
  const state = ratio >= 1 ? "over" : ratio >= 0.8 ? "warn" : "ok";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {state !== "ok" ? (
          <Badge variant={state === "over" ? "destructive" : "secondary"} className="text-[10px]">
            {state === "over" ? "Limit reached" : "80%+ used"}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 font-display text-lg font-bold">
        {used.toLocaleString()}{" "}
        <span className="text-sm font-medium text-muted-foreground">
          / {limit.toLocaleString()}
        </span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            state === "over"
              ? "bg-destructive"
              : state === "warn"
                ? "bg-amber-400"
                : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function UsagePanel() {
  const fetchUsage = useServerFn(getUsageOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["usage-overview"],
    queryFn: () => fetchUsage(),
    staleTime: 60_000,
  });

  if (isLoading || !data) return <Skeleton className="h-64 rounded-2xl" />;

  const peak = Math.max(1, ...data.daily.map((d) => d.replies + d.tasks));
  const resets = new Date(data.periodEnd).toLocaleDateString();

  return (
    <section className="panel space-y-4 p-5">
      <header className="flex items-start gap-3">
        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
          <Gauge className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Usage this month
          </h2>
          <p className="text-xs text-muted-foreground">
            Entitlement: {data.plan.label} · resets {resets}
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Meter
          label="AI replies"
          used={data.replies.used}
          limit={data.replies.limit}
          ratio={data.replies.ratio}
          hint="One AI-generated customer-facing response = 1 reply."
        />
        <Meter
          label="AI worker tasks"
          used={data.tasks.used}
          limit={data.tasks.limit}
          ratio={data.tasks.ratio}
          hint="Autonomous and manually triggered AI worker tasks."
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          Last 14 days
        </p>
        <div className="mt-3 flex h-20 items-end gap-1">
          {data.daily.map((day) => {
            const total = day.replies + day.tasks;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.replies} replies · ${day.tasks} tasks`}
                className="flex-1 rounded-t bg-primary/60"
                style={{ height: `${Math.max(4, (total / peak) * 100)}%` }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Internal AI operations (analysis, scoring support): {data.internalOperations.toLocaleString()} —
          these do not consume your reply allowance.
        </p>
      </div>

      {data.replies.ratio >= 0.8 || data.tasks.ratio >= 0.8 ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          You are approaching this month&apos;s AI allowance. When the limit is reached, AI replies
          pause and conversations are flagged for your team instead.
        </p>
      ) : null}
    </section>
  );
}
