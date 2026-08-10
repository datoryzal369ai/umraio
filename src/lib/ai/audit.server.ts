import type { SupabaseClient } from "@supabase/supabase-js";

import { redactAndCap, redactDeep } from "./redaction";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * Audit + telemetry for the AI Intelligence Layer.
 *
 * Reuses the existing `activity_log` table (append-only, tenant-scoped by RLS)
 * rather than introducing a parallel audit store. Never records API secrets or
 * hidden chain-of-thought — only concise reason codes and status.
 */

export type AiAuditEvent =
  | "AI_REQUEST"
  | "AI_RESPONSE"
  | "AI_FAILURE"
  | "AI_DECISION"
  | "TOOL_REQUEST"
  | "TOOL_EXECUTION"
  | "ACTION_EXECUTED"
  | "ACTION_FAILED"
  | "EVALUATION_CREATED"
  | "HUMAN_ESCALATION";

export type AiAuditPayload = {
  agencyId: string;
  correlationId: string;
  event: AiAuditEvent;
  taskType?: string | undefined;
  model?: string | undefined;
  provider?: string | undefined;
  tool?: string | undefined;
  stage?: string | undefined;
  status?: string | undefined;
  latencyMs?: number | undefined;
  /** Short auditable rationale. Never private reasoning. */
  reasonCode?: string | undefined;
  error?: string | undefined;
  entity?: string | undefined;
  entityId?: string | undefined;
  userId?: string | undefined;
  /** Small, safe extra metadata. Deep-redacted before persistence. */
  meta?: Record<string, unknown> | undefined;
};

export async function logAiEvent(supabase: Db, payload: AiAuditPayload): Promise<void> {
  const meta: Record<string, unknown> = {
    correlation_id: payload.correlationId,
    event: payload.event,
    task_type: payload.taskType ?? null,
    model: payload.model ?? null,
    provider: payload.provider ?? null,
    tool: payload.tool ?? null,
    stage: payload.stage ?? null,
    status: payload.status ?? null,
    latency_ms: payload.latencyMs ?? null,
    reason_code: redactAndCap(payload.reasonCode, 300) ?? null,
    error: redactAndCap(payload.error, 500) ?? null,
    user_id: payload.userId ?? null,
    ...(payload.meta ? { extra: redactDeep(payload.meta, 300) } : {}),
  };

  const action = [payload.event, payload.tool ?? payload.taskType, payload.status]
    .filter(Boolean)
    .join(" · ");

  try {
    const { error } = await supabase.from("activity_log").insert({
      agency_id: payload.agencyId,
      actor: "ai",
      action: `[intelligence] ${action}`,
      entity: payload.entity ?? "ai_intelligence",
      entity_id: payload.entityId ?? null,
      meta,
    });

    if (error) {
      // Surface the failure server-side; never block the primary workflow.
      console.error(
        `[ai-audit] persistence failed correlation_id=${payload.correlationId} event=${payload.event}: ${redactAndCap(error.message, 300)}`,
      );
    }
  } catch (thrown) {
    const message = thrown instanceof Error ? thrown.message : "unknown audit error";
    console.error(
      `[ai-audit] persistence threw correlation_id=${payload.correlationId} event=${payload.event}: ${redactAndCap(message, 300)}`,
    );
  }
}
