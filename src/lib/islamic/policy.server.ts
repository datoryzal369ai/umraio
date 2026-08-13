import type { SupabaseClient } from "@supabase/supabase-js";

import { logAiEvent } from "../ai/audit.server";
import {
  NOT_APPLICABLE,
  evaluatePolicies,
  isUsablePolicy,
  type IslamicPolicy,
  type IslamicScope,
  type PolicyEvaluation,
} from "./policy.core";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * Islamic Implementation Layer™ — server bindings.
 *
 * Reuses the EXISTING infrastructure:
 * - policy storage: `islamic_policies` (read-only for agencies, server-managed)
 * - audit:          existing `activity_log` via `logAiEvent`
 * - enforcement:    existing ToolRegistry decision gate (no second engine)
 *
 * Policies are loaded lazily and ONLY for the scope being evaluated, so the
 * whole policy set is never pulled into a request or a model prompt.
 */

export type IslamicPolicyChecker = {
  /** Evaluate one scoped payload. Returns a deterministic outcome. */
  check(scope: IslamicScope, text: string): Promise<PolicyEvaluation>;
};

const SELECT_COLUMNS =
  "id, agency_id, code, principle, rule_text, scope, severity, match_patterns, source, authority, version, effective_from, effective_until, is_active, requires_human_review";

export function createIslamicPolicyChecker(supabase: Db, agencyId: string): IslamicPolicyChecker {
  const cache = new Map<IslamicScope, IslamicPolicy[]>();

  async function load(scope: IslamicScope): Promise<IslamicPolicy[]> {
    const cached = cache.get(scope);
    if (cached) return cached;
    const { data, error } = await supabase
      .from("islamic_policies")
      .select(SELECT_COLUMNS)
      .eq("scope", scope)
      .eq("is_active", true)
      .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
      .limit(200);
    if (error) {
      // Default safety: an unavailable policy store must never silently allow.
      throw new Error(`Islamic policy store unavailable: ${error.message}`);
    }
    const rows = ((data ?? []) as IslamicPolicy[]).filter((p) => isUsablePolicy(p));
    cache.set(scope, rows);
    return rows;
  }

  return {
    async check(scope, text) {
      try {
        const policies = await load(scope);
        return evaluatePolicies(policies, scope, text);
      } catch {
        // Conservative default: when the layer cannot establish a basis,
        // require review instead of allowing.
        return {
          outcome: "REVIEW_REQUIRED",
          scope,
          matches: [],
          requiresHumanReview: true,
          reason: "Islamic policy layer unavailable — defaulting to human review.",
        };
      }
    },
  };
}

export { NOT_APPLICABLE };

/** Append the policy decision to the EXISTING audit trail. */
export async function auditPolicyDecision(
  supabase: Db,
  args: {
    agencyId: string;
    correlationId: string;
    tool: string;
    userId?: string | undefined;
    evaluation: PolicyEvaluation;
  },
): Promise<void> {
  const { evaluation } = args;
  const primary = evaluation.matches[0] ?? null;
  await logAiEvent(supabase, {
    agencyId: args.agencyId,
    correlationId: args.correlationId,
    event: evaluation.outcome === "ALLOW" ? "AI_DECISION" : "ACTION_FAILED",
    tool: args.tool,
    stage: "islamic_policy",
    status: evaluation.outcome.toLowerCase(),
    reasonCode: evaluation.reason,
    entity: "islamic_policy",
    entityId: primary?.policy_id ?? undefined,
    userId: args.userId,
    meta: {
      policy_outcome: evaluation.outcome,
      policy_scope: evaluation.scope,
      requires_human_review: evaluation.requiresHumanReview,
      policy_id: primary?.policy_id ?? null,
      policy_code: primary?.code ?? null,
      policy_version: primary?.version ?? null,
      authority: primary?.authority ?? null,
      source: primary?.source ?? null,
      review_status: evaluation.requiresHumanReview ? "PENDING_EXPERT_REVIEW" : "NOT_REQUIRED",
      reviewer: null,
      matches: evaluation.matches.map((m) => `${m.code} v${m.version} (${m.severity})`),
    },
  });
}

/**
 * Raise a qualified-human review request through the EXISTING notification
 * architecture. No separate approval system, no invented reviewer account:
 * the record simply carries `requires_expert_review = true` until an
 * appropriately qualified human is assigned.
 */
export async function requestExpertReview(
  supabase: Db,
  args: {
    agencyId: string;
    title: string;
    body: string;
    entity: string;
    entityId: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<{ recorded: boolean; reference: string | null }> {
  const reference = `IIL-${Date.now().toString(36).toUpperCase()}`;
  const { error } = await supabase.from("notifications").insert({
    agency_id: args.agencyId,
    kind: "religious_guidance_review",
    severity: "warning",
    title: args.title,
    body: args.body,
    entity: args.entity,
    entity_id: args.entityId,
    meta: {
      reference,
      requires_expert_review: true,
      review_status: "PENDING_EXPERT_REVIEW",
      reviewer: null,
      layer: "islamic_implementation_layer",
      ...(args.meta ?? {}),
    },
  });
  if (error) return { recorded: false, reference: null };
  return { recorded: true, reference };
}
