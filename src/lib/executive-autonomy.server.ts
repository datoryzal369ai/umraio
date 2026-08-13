import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_ACTIONS_PER_CYCLE,
  loadOpportunities,
  runExecutiveOrchestration,
  type ExecutiveCycleResult,
} from "./executive-orchestrator.server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * STEP 4A — Controlled Autonomous Execution Engine.
 *
 * This module adds ONLY governance around the existing, verified
 * `runExecutiveOrchestration()` cycle. It is not a second orchestration
 * engine: it decides *whether* a cycle may start, holds a database-backed
 * concurrency lock while it runs, and records the outcome.
 *
 * Guarantees:
 * - Autonomy mode is read from agency settings, never from the model or client.
 * - One running cycle per agency (partial unique index on executive_cycles).
 * - Per-agency cooldown before another cycle may start.
 * - No actionable priorities → skip before any work is done (cost control).
 * - The 3-action ceiling and duplicate protection stay inside the existing engine.
 */

export type AutonomyMode = "off" | "assisted" | "autonomous";
export type TriggerType = "manual" | "scheduled_autonomous";

export type GovernedCycleOutcome =
  | {
      status: "skipped";
      reason:
        | "autonomy_off"
        | "orchestration_cycle_skipped_active"
        | "orchestration_cycle_skipped_cooldown"
        | "no_actionable_priority"
        | "agency_inactive";
      cycleId: string | null;
      autonomyMode: AutonomyMode;
    }
  | { status: "completed"; cycleId: string; autonomyMode: AutonomyMode; cycle: ExecutiveCycleResult }
  | { status: "failed"; cycleId: string; autonomyMode: AutonomyMode; error: string };

/** A cycle stuck in `running` longer than this is treated as crashed. */
const STALE_LOCK_MINUTES = 10;

export const DEFAULT_COOLDOWN_MINUTES = 15;

type AutonomySettings = {
  autonomyMode: AutonomyMode;
  cooldownMinutes: number;
};

export async function readAutonomySettings(
  supabase: Db,
  agencyId: string,
): Promise<AutonomySettings> {
  const { data } = await supabase
    .from("agency_settings")
    .select("autonomy_mode, autonomy_cooldown_minutes")
    .eq("agency_id", agencyId)
    .maybeSingle();
  const mode = (data?.autonomy_mode as AutonomyMode | undefined) ?? "off";
  const cooldown = (data?.autonomy_cooldown_minutes as number | undefined) ?? DEFAULT_COOLDOWN_MINUTES;
  return { autonomyMode: mode, cooldownMinutes: cooldown };
}

/** Release locks left behind by a crashed process/server restart. */
async function reapStaleLocks(supabase: Db, agencyId: string) {
  const cutoff = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000).toISOString();
  await supabase
    .from("executive_cycles")
    .update({
      status: "failed",
      error: "Cycle did not finish (process interrupted). Lock released automatically.",
      outcome: "interrupted",
      finished_at: new Date().toISOString(),
    })
    .eq("agency_id", agencyId)
    .eq("status", "running")
    .lt("started_at", cutoff);
}

async function recordSkip(
  supabase: Db,
  agencyId: string,
  triggerType: TriggerType,
  autonomyMode: AutonomyMode,
  reason: string,
): Promise<string | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("executive_cycles")
    .insert({
      agency_id: agencyId,
      trigger_type: triggerType,
      autonomy_mode: autonomyMode,
      status: "skipped",
      skipped_reason: reason,
      outcome: reason,
      started_at: now,
      finished_at: now,
    })
    .select("id")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

function countResults(cycle: ExecutiveCycleResult) {
  let rejected = 0;
  let awaitingApproval = 0;
  let failed = 0;
  for (const d of cycle.decisions) {
    if (d.result === "rejected" || d.result === "duplicate_skipped") rejected += 1;
    else if (d.result === "approval_required") awaitingApproval += 1;
    else if (d.result === "failed") failed += 1;
  }
  return { rejected, awaitingApproval, failed };
}

/**
 * Run exactly one bounded, governed orchestration cycle for a single agency.
 * Used by BOTH the manual RPC and the scheduled hook — the only difference is
 * `triggerType`.
 */
export async function runGovernedCycle(
  supabase: Db,
  agencyId: string,
  opts: { triggerType: TriggerType; userId?: string },
): Promise<GovernedCycleOutcome> {
  const { triggerType, userId } = opts;
  const { autonomyMode, cooldownMinutes } = await readAutonomySettings(supabase, agencyId);

  // KILL SWITCH — no scheduled cycle may run when autonomy is OFF.
  if (triggerType === "scheduled_autonomous" && autonomyMode !== "autonomous") {
    return {
      status: "skipped",
      reason: "autonomy_off",
      cycleId: await recordSkip(supabase, agencyId, triggerType, autonomyMode, "autonomy_off"),
      autonomyMode,
    };
  }

  await reapStaleLocks(supabase, agencyId);

  // Cooldown — deterministic, based on the last cycle that actually ran.
  const { data: lastRun } = await supabase
    .from("executive_cycles")
    .select("started_at, status")
    .eq("agency_id", agencyId)
    .in("status", ["completed", "failed"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (triggerType === "scheduled_autonomous" && lastRun?.started_at) {
    const elapsed = Date.now() - new Date(lastRun.started_at as string).getTime();
    if (elapsed < cooldownMinutes * 60_000) {
      return {
        status: "skipped",
        reason: "orchestration_cycle_skipped_cooldown",
        cycleId: await recordSkip(
          supabase,
          agencyId,
          triggerType,
          autonomyMode,
          "orchestration_cycle_skipped_cooldown",
        ),
        autonomyMode,
      };
    }
  }

  // COST CONTROL — deterministic pre-filter before any cycle work begins.
  const opportunities = await loadOpportunities(supabase, agencyId);
  if (opportunities.length === 0) {
    return {
      status: "skipped",
      reason: "no_actionable_priority",
      cycleId: await recordSkip(
        supabase,
        agencyId,
        triggerType,
        autonomyMode,
        "no_actionable_priority",
      ),
      autonomyMode,
    };
  }

  // CONCURRENCY LOCK — database-enforced: a partial unique index allows only
  // one row with status='running' per agency, so a second insert fails.
  const { data: lockRow, error: lockError } = await supabase
    .from("executive_cycles")
    .insert({
      agency_id: agencyId,
      trigger_type: triggerType,
      autonomy_mode: autonomyMode,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (lockError || !lockRow?.id) {
    return {
      status: "skipped",
      reason: "orchestration_cycle_skipped_active",
      cycleId: null,
      autonomyMode,
    };
  }

  const cycleId = lockRow.id as string;

  try {
    const cycle = await runExecutiveOrchestration(supabase, agencyId, userId, {
      triggerType,
      advisoryOnly: autonomyMode === "assisted",
    });
    const counts = countResults(cycle);

    await supabase
      .from("executive_cycles")
      .update({
        status: "completed",
        correlation_id: cycle.correlationId,
        finished_at: cycle.finishedAt,
        opportunities_considered: cycle.opportunitiesConsidered,
        actions_attempted: cycle.actionsAttempted,
        actions_executed: cycle.actionsExecuted,
        actions_rejected: counts.rejected,
        actions_awaiting_approval: counts.awaitingApproval,
        actions_failed: counts.failed,
        limit_reached: cycle.limitReached,
        decisions: cycle.decisions,
        outcome: cycle.limitReached
          ? "orchestration_limit_reached"
          : cycle.actionsExecuted > 0
            ? "actions_executed"
            : autonomyMode === "assisted"
              ? "recommendations_only"
              : "no_action_taken",
      })
      .eq("id", cycleId);

    return { status: "completed", cycleId, autonomyMode, cycle };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Orchestration cycle failed.";
    // Always release the lock — never leave an agency permanently blocked.
    await supabase
      .from("executive_cycles")
      .update({
        status: "failed",
        error: message,
        outcome: "failed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", cycleId);
    return { status: "failed", cycleId, autonomyMode, error: message };
  }
}

export { MAX_ACTIONS_PER_CYCLE };
