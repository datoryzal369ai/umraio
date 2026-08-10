import type { SupabaseClient } from "@supabase/supabase-js";

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
  tool?: string | undefined;
  status?: string | undefined;
  latencyMs?: number | undefined;
  /** Short auditable rationale. Never private reasoning. */
  reasonCode?: string | undefined;
  error?: string | undefined;
  entity?: string | undefined;
  entityId?: string | undefined;
  userId?: string | undefined;
};

const SECRET_PATTERN = /(sk-|sb_secret|Bearer\s|api[_-]?key)/i;

function redact(value?: string) {
  if (!value) return undefined;
  return SECRET_PATTERN.test(value) ? "[redacted]" : value.slice(0, 500);
}

export async function logAiEvent(supabase: Db, payload: AiAuditPayload): Promise<void> {
  const meta: Record<string, unknown> = {
    correlation_id: payload.correlationId,
    event: payload.event,
    task_type: payload.taskType ?? null,
    model: payload.model ?? null,
    tool: payload.tool ?? null,
    status: payload.status ?? null,
    latency_ms: payload.latencyMs ?? null,
    reason_code: redact(payload.reasonCode) ?? null,
    error: redact(payload.error) ?? null,
    user_id: payload.userId ?? null,
  };

  const action = [payload.event, payload.tool ?? payload.taskType, payload.status]
    .filter(Boolean)
    .join(" · ");

  try {
    await supabase.from("activity_log").insert({
      agency_id: payload.agencyId,
      actor: "ai",
      action: `[intelligence] ${action}`,
      entity: payload.entity ?? "ai_intelligence",
      entity_id: payload.entityId ?? null,
      meta,
    });
  } catch {
    // Audit logging must never break the request path.
  }
}
