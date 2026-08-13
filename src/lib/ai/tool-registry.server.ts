import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isDeterministicOperation } from "./routing";
import { logAiEvent } from "./audit.server";
import type { IslamicScope } from "../islamic/policy.core";
import { auditPolicyDecision, type IslamicPolicyChecker } from "../islamic/policy.server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;


/**
 * Controlled tool/action layer.
 *
 * Only explicitly registered tools may be invoked by the intelligence layer.
 * Arbitrary database or API access is never exposed. Every invocation runs the
 * decision gate, in this exact order:
 *
 *   registration → allowedTools → schema → permission → business rule
 *   → execution → audit
 */

export type ToolPermission = "read" | "write" | "external";

export type ToolExecutionContext = {
  supabase: Db;
  agencyId: string;
  userId?: string | undefined;
  correlationId: string;
  /** Permissions the caller (not the model) is allowed to use. */
  grantedPermissions: ToolPermission[];
  /** Per-request allowlist. Enforced, not advisory. */
  allowedTools: string[];
};

export type ToolDefinition<TInput = any, TOutput = any> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  permission: ToolPermission;
  /**
   * Explicit capability classification. A tool must declare that it performs
   * no deterministic business computation (pricing, totals, arithmetic,
   * entitlement). Deterministic work stays in application code.
   */
  deterministicSafe: true;
  /**
   * Deterministic business-rule validation. Return an error string to reject.
   * REQUIRED for `write` and `external` tools.
   */
  validate?: (input: TInput, ctx: ToolExecutionContext) => Promise<string | null> | string | null;
  execute: (input: TInput, ctx: ToolExecutionContext) => Promise<TOutput>;
};

export type ToolRejectionStage =
  "registration" | "allowed_tools" | "schema" | "permission" | "business_rule" | "safety";

export type ToolOutcome<TOutput = any> =
  | { status: "executed"; result: TOutput }
  | { status: "rejected"; stage: ToolRejectionStage; reason: string }
  | { status: "failed"; reason: string };

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    if (isDeterministicOperation(tool.name)) {
      throw new Error(`Deterministic operation "${tool.name}" must not be exposed as an AI tool.`);
    }
    if (tool.deterministicSafe !== true) {
      throw new Error(`Tool "${tool.name}" must declare deterministicSafe: true.`);
    }
    if ((tool.permission === "write" || tool.permission === "external") && !tool.validate) {
      throw new Error(
        `Tool "${tool.name}" has "${tool.permission}" side effects and must define a business-rule validate().`,
      );
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string) {
    return this.tools.get(name);
  }

  names() {
    return [...this.tools.keys()];
  }

  describe() {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      permission: t.permission,
    }));
  }

  /** Decision gate: nothing executes without passing every stage, in order. */
  async invoke(name: string, rawInput: unknown, ctx: ToolExecutionContext): Promise<ToolOutcome> {
    const reject = async (stage: ToolRejectionStage, reason: string): Promise<ToolOutcome> => {
      await logAiEvent(ctx.supabase, {
        agencyId: ctx.agencyId,
        correlationId: ctx.correlationId,
        event: "ACTION_FAILED",
        tool: name,
        stage,
        status: "rejected",
        error: reason,
        userId: ctx.userId,
      });
      return { status: "rejected", stage, reason };
    };

    await logAiEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      correlationId: ctx.correlationId,
      event: "TOOL_REQUEST",
      tool: name,
      userId: ctx.userId,
    });

    // 1. registration
    const tool = this.tools.get(name);
    if (!tool) return reject("registration", `Tool "${name}" is not registered.`);

    // 2. per-request allowlist
    if (!ctx.allowedTools.includes(name)) {
      return reject("allowed_tools", `Tool "${name}" is not permitted for this request.`);
    }

    // 3. schema validation
    const parsed = tool.inputSchema.safeParse(rawInput);
    if (!parsed.success) return reject("schema", parsed.error.message);

    // 4. permission validation
    if (!ctx.grantedPermissions.includes(tool.permission)) {
      return reject("permission", `Missing "${tool.permission}" permission for ${name}.`);
    }

    // 5. business-rule validation
    if (tool.validate) {
      const problem = await tool.validate(parsed.data, ctx);
      if (problem) return reject("business_rule", problem);
    }

    // 6. execution + 7. audit
    try {
      const result = await tool.execute(parsed.data, ctx);
      await logAiEvent(ctx.supabase, {
        agencyId: ctx.agencyId,
        correlationId: ctx.correlationId,
        event: "ACTION_EXECUTED",
        tool: name,
        status: "ok",
        userId: ctx.userId,
      });
      return { status: "executed", result };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Tool execution failed";
      await logAiEvent(ctx.supabase, {
        agencyId: ctx.agencyId,
        correlationId: ctx.correlationId,
        event: "ACTION_FAILED",
        tool: name,
        status: "failed",
        error: reason,
        userId: ctx.userId,
      });
      return { status: "failed", reason };
    }
  }
}

export function createToolRegistry(tools: ToolDefinition[] = []) {
  const registry = new ToolRegistry();
  tools.forEach((tool) => registry.register(tool));
  return registry;
}
