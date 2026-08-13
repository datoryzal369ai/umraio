import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { runExecutiveCycle, setAutonomyMode } from "@/lib/executive-orchestrator.functions";
import {
  AUTONOMY_LABEL,
  AUTONOMY_TONE,
  RESULT_LABEL,
  RESULT_TONE,
  SKIP_LABEL,
  fetchAutonomyState,
  fetchLastExecutiveCycle,
  type AutonomyMode,
  type ExecutiveCycle,
} from "@/lib/orchestration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

type GovernedOutcome =
  | { status: "skipped"; reason: string }
  | { status: "completed"; cycle: ExecutiveCycle }
  | { status: "failed"; error: string };

export function OrchestrationPanel() {
  const queryClient = useQueryClient();
  const runCycle = useServerFn(runExecutiveCycle);
  const changeMode = useServerFn(setAutonomyMode);
  const [live, setLive] = useState<ExecutiveCycle | null>(null);

  const lastCycle = useQuery({
    queryKey: ["executive-cycle"],
    queryFn: fetchLastExecutiveCycle,
  });

  const autonomy = useQuery({
    queryKey: ["executive-autonomy"],
    queryFn: fetchAutonomyState,
    refetchInterval: 60_000,
  });

  const modeMutation = useMutation({
    mutationFn: async (mode: AutonomyMode) => await changeMode({ data: { mode } }),
    onSuccess: (_res, mode) => {
      toast.success(`AI autonomy set to ${AUTONOMY_LABEL[mode]}.`);
      void queryClient.invalidateQueries({ queryKey: ["executive-autonomy"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not change autonomy mode."),
  });

  const mutation = useMutation({
    mutationFn: async () => (await runCycle()) as unknown as GovernedOutcome,
    onSuccess: (outcome) => {
      if (outcome.status === "completed") {
        setLive(outcome.cycle);
        toast.success(
          `Orchestration cycle finished — ${outcome.cycle.actionsExecuted} action(s) executed of ${outcome.cycle.actionsAttempted} attempted.`,
        );
      } else if (outcome.status === "skipped") {
        toast.info(SKIP_LABEL[outcome.reason] ?? `Cycle skipped — ${outcome.reason}`);
      } else {
        toast.error(outcome.error);
      }
      void queryClient.invalidateQueries({ queryKey: ["executive-cycle"] });
      void queryClient.invalidateQueries({ queryKey: ["executive-autonomy"] });
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

  const state = autonomy.data;
  const mode: AutonomyMode = state?.mode ?? "off";
  const record = state?.lastCycle ?? null;
  const lastRun = state?.lastRunCycle ?? null;
  const nextEligible =
    mode === "autonomous" && lastRun?.started_at
      ? new Date(
          new Date(lastRun.started_at).getTime() + (state?.cooldownMinutes ?? 15) * 60_000,
        )
      : null;

  const status = running || state?.runningCycle
    ? { label: "Orchestrating", tone: "bg-primary/15 text-primary" }
    : cycle && cycle.decisions.some((d) => d.result === "failed")
      ? { label: "Failed", tone: "bg-destructive/15 text-destructive" }
      : cycle && cycle.decisions.some((d) => d.result === "escalated")
        ? { label: "Escalated", tone: "bg-chart-4/15 text-chart-4" }
        : cycle && cycle.actionsExecuted > 0
          ? { label: "Completed", tone: "bg-success/15 text-success" }
          : mode === "assisted"
            ? { label: "Advisory", tone: "bg-muted text-muted-foreground" }
            : cycle
              ? { label: "No action taken", tone: "bg-muted text-muted-foreground" }
              : { label: "Idle", tone: "bg-muted text-muted-foreground" };

  return (
    <section aria-labelledby="orchestration-heading" className="panel min-w-0 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5">
            <Activity aria-hidden="true" className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 id="orchestration-heading" className="font-display text-base font-bold tracking-tight">
              Governed autonomous execution
            </h2>
            <p className="text-xs text-muted-foreground">
              Understand → prioritise → decide → execute through existing governed tools → observe.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge className={cn("border-0", status.tone)}>{status.label}</Badge>
          <Button size="sm" disabled={running} onClick={() => mutation.mutate()}>
            {running ? <Loader2 className="size-4 animate-spin" /> : null}
            {running ? "Running cycle…" : "Run cycle now"}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-xl border border-border/60 bg-surface/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI autonomy
          </span>
          <Badge className={cn("border-0", AUTONOMY_TONE[mode])}>{AUTONOMY_LABEL[mode]}</Badge>
        </div>
        <Select
          value={mode}
          disabled={modeMutation.isPending || autonomy.isLoading}
          onValueChange={(value) => modeMutation.mutate(value as AutonomyMode)}
        >
          <SelectTrigger aria-label="AI autonomy mode" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off — no scheduled cycles</SelectItem>
            <SelectItem value="assisted">Assisted — recommend only</SelectItem>
            <SelectItem value="autonomous">Autonomous — governed execution</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <dl className="mt-3 grid min-w-0 grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-border/50 bg-surface/50 px-3 py-2">
          <dt className="text-muted-foreground">Last cycle</dt>
          <dd className="truncate font-medium">
            {record
              ? `${relative(record.finished_at ?? record.started_at)} · ${
                  record.trigger_type === "scheduled_autonomous" ? "Scheduled" : "Manual"
                }`
              : "Never run"}
          </dd>
        </div>
        <div className="min-w-0 rounded-lg border border-border/50 bg-surface/50 px-3 py-2">
          <dt className="text-muted-foreground">Next eligible cycle</dt>
          <dd className="truncate font-medium">
            {mode !== "autonomous"
              ? "Autonomy not enabled"
              : !nextEligible
                ? "At the next scheduled tick"
                : nextEligible.getTime() <= Date.now()
                  ? "Now — at the next scheduled tick"
                  : nextEligible.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </dd>
        </div>
        <div className="min-w-0 rounded-lg border border-border/50 bg-surface/50 px-3 py-2">
          <dt className="text-muted-foreground">Last outcome</dt>
          <dd className="truncate font-medium">
            {record
              ? record.status === "skipped"
                ? (SKIP_LABEL[record.skipped_reason ?? ""] ?? record.skipped_reason ?? "Skipped")
                : record.status === "failed"
                  ? (record.error ?? "Failed")
                  : `${record.actions_executed} executed · ${record.actions_awaiting_approval} awaiting approval`
              : "—"}
          </dd>
        </div>
      </dl>


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
