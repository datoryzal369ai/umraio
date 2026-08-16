import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logAiEvent } from "./audit.server";
import { redactAndCap } from "./redaction";
import type { AiContext } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * Experience / evaluation foundation.
 *
 * Collects outcome records so a future RÉNAIO.CORE™ can learn from them.
 * This is EXPERIENCE COLLECTION ONLY: nothing here modifies a model, prompt,
 * policy, tool, permission or source code. Records are written into the
 * existing append-only `activity_log` (no new table, no schema migration).
 * All free-text fields are redacted and length-capped; chain-of-thought,
 * credentials and unnecessary PII are never stored.
 */

const FREE_TEXT_CAP = 300;

export type ExperienceRecord = {
  interaction_id: string;
  task_type: string;
  model: string | null;
  input_context_hash: string;
  action_taken: string;
  outcome: string;
  success: boolean;
  confidence: number | null;
  evaluation_score: number | null;
  failure_reason: string | null;
  created_at: string;
};

export function hashContext(context: Pick<AiContext, "facts">): string {
  return createHash("sha256").update(JSON.stringify(context.facts)).digest("hex").slice(0, 32);
}

export async function recordExperience(
  supabase: Db,
  agencyId: string,
  record: Omit<ExperienceRecord, "created_at">,
): Promise<ExperienceRecord> {
  const full: ExperienceRecord = {
    ...record,
    action_taken: redactAndCap(record.action_taken, FREE_TEXT_CAP) ?? "",
    outcome: redactAndCap(record.outcome, FREE_TEXT_CAP) ?? "",
    failure_reason: redactAndCap(record.failure_reason, FREE_TEXT_CAP) ?? null,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from("activity_log").insert({
      agency_id: agencyId,
      actor: "ai",
      action: `[experience] ${record.task_type} · ${record.success ? "success" : "failure"}`,
      entity: "ai_experience",
      entity_id: null,
      meta: full as unknown as Record<string, unknown>,
    });
    if (error) {
      console.error(
        `[ai-experience] persistence failed correlation_id=${record.interaction_id}: ${redactAndCap(error.message, 300)}`,
      );
    }
  } catch (thrown) {
    const message = thrown instanceof Error ? thrown.message : "unknown error";
    console.error(
      `[ai-experience] persistence threw correlation_id=${record.interaction_id}: ${redactAndCap(message, 300)}`,
    );
  }

  await logAiEvent(supabase, {
    agencyId,
    correlationId: record.interaction_id,
    event: "EVALUATION_CREATED",
    taskType: record.task_type,
    model: record.model ?? undefined,
    status: record.success ? "success" : "failure",
    reasonCode: full.failure_reason ?? undefined,
  });

  return full;
}
