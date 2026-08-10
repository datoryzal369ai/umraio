import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logAiEvent } from "./audit.server";
import type { AiContext } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * Experience / evaluation foundation.
 *
 * Collects outcome records so a future RÉNAI.CORE™ can learn from them.
 * This is EXPERIENCE COLLECTION ONLY: nothing here modifies a model, prompt,
 * policy, tool, permission or source code. Records are written into the
 * existing append-only `activity_log` (no new table, no schema migration).
 */

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
  const full: ExperienceRecord = { ...record, created_at: new Date().toISOString() };

  try {
    await supabase.from("activity_log").insert({
      agency_id: agencyId,
      actor: "ai",
      action: `[experience] ${record.task_type} · ${record.success ? "success" : "failure"}`,
      entity: "ai_experience",
      entity_id: null,
      meta: full as unknown as Record<string, unknown>,
    });
  } catch {
    // Experience collection is best-effort and must never break a request.
  }

  await logAiEvent(supabase, {
    agencyId,
    correlationId: record.interaction_id,
    event: "EVALUATION_CREATED",
    taskType: record.task_type,
    model: record.model ?? undefined,
    status: record.success ? "success" : "failure",
    reasonCode: record.failure_reason ?? undefined,
  });

  return full;
}
