import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { runExecutiveCycle } from "@/lib/executive-orchestrator.functions";
import {
  RESULT_LABEL,
  RESULT_TONE,
  fetchLastExecutiveCycle,
  type ExecutiveCycle,
} from "@/lib/orchestration";
import { cn } from "@/lib/utils";

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export function OrchestrationPanel() {
  const queryClient = useQueryClient();
  const runCycle = useServerFn(runExecutiveCycle);
  const [live, setLive] = useState<ExecutiveCycle | null>(null);

  const lastCycle = useQuery({
    queryKey: ["executive-cycle"],
    queryFn: fetchLastExecutiveCycle,
  });

  const mutation = useMutation({
    mutationFn: async () => (await runCycle()) as unknown as ExecutiveCycle,
    onSuccess: (cycle) => {
      setLive(cycle);
      toast.success(
        `Orchestration cycle finished — ${cycle.actionsExecuted} action(s) executed of ${cycle.actionsAttempted} attempted.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["executive-cycle"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-tasks", "all"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-activity"] });
      void queryClient.invalidateQueries({ queryKey: ["sales-opportunities"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Orchestration cycle failed.");
    },
  });

  const cycle = live ?? lastCycle.data ?? null;
  const running = mutation.isPending;

  const status = running
    ? { label: "Orchestrating", tone: "bg-primary/15 text-primary" }
    : cycle && cycle.decisions.some((d) => d.result === "failed")
      ? { label: "Failed", tone: "bg-destructive/15 text-destructive" }
      : cycle && cycle.decisions.some((d) => d.result === "escalated")
        ? { label: "Escalated", tone: "bg-chart-4/15 text-chart-4" }
        : cycle && cycle.actionsExecuted > 0
          ? { label: "Completed", tone: "bg-success/15 text-success" }
          : { label: "Advisory", tone: "bg-muted text-muted-foreground" };

  return (
    <section aria-labelledby="orchestration-heading" className="panel min-w-0 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5">
            <Activity aria-hidden="true" className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 id="orchestration-heading" className="font-display text-base font-bold tracking-tight">
              Governed orchestration
            </h2>
            <p className="text-xs text-muted-foreground">
              Understand → prioritise → decide → execute through existing governed tools → observe.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={cn("border-0", status.tone)}>{status.label}</Badge>
          <Button size="sm" disabled={running} onClick={() => mutation.mutate()}>
            {running ? <Loader2 className="size-4 animate-spin" /> : null}
            {running ? "Running cycle…" : "Run orchestration cycle"}
          </Button>
        </div>
      </div>

      {lastCycle.isLoading && !cycle ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : !cycle ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          No orchestration cycle has run yet. Run one to let the executive prioritise real leads and
          act through the governed tool layer.
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            Last cycle {relative(cycle.finishedAt)} · {cycle.opportunitiesConsidered} priorities
            considered · {cycle.actionsAttempted} actions attempted · {cycle.actionsExecuted}{" "}
            executed
            {cycle.limitReached ? " · cycle limit reached" : ""}
          </p>

          <ul className="mt-3 space-y-2">
            {cycle.decisions.map((decision, index) => (
              <li
                key={`${decision.at}-${index}`}
                className="min-w-0 rounded-xl border border-border/60 bg-surface/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium">{decision.subject}</p>
                  <Badge className={cn("shrink-0 border-0", RESULT_TONE[decision.result])}>
                    {RESULT_LABEL[decision.result]}
                  </Badge>
                </div>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-muted-foreground">
                      Decision
                    </dt>
                    <dd className="min-w-0 break-words">{decision.decision}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-muted-foreground">
                      Why
                    </dt>
                    <dd className="min-w-0 break-words text-muted-foreground">{decision.why}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </dt>
                    <dd className="min-w-0 break-words">
                      {decision.action
                        ? `${decision.action}${decision.worker ? ` → ${decision.worker}` : ""}`
                        : "No permitted action"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-muted-foreground">
                      Result
                    </dt>
                    <dd className="min-w-0 break-words text-muted-foreground">{decision.detail}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Every action runs through the existing tool registry: allowlist → schema → permission →
        business rule → execution → audit. Customer-facing messages are never sent autonomously, and
        a cycle stops after a fixed number of actions.
      </p>
    </section>
  );
}
