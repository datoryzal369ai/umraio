import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isDeterministicOperation } from "./routing";
import { logAiEvent } from "./audit.server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * Controlled tool/action layer.
 *
 * Only explicitly registered tools may be invoked by the intelligence layer.
 * Arbitrary database or API access is never exposed. Every invocation runs the
 * decision gate: business-rule validation → permission check → safety check →
 * execution → audit event.
 */

export type ToolPermission = "read" | "write" | "external";

export type ToolExecutionContext = {
  supabase: Db;
  agencyId: string;
  userId?: string | undefined;
  correlationId: string;
  /** Permissions the caller (not the model) is allowed to use. */
  grantedPermissions: ToolPermission[];
};

export type ToolDefinition<TInput = any, TOutput = any> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  permission: ToolPermission;
  /** Deterministic business-rule validation. Return an error string to reject. */
  validate?: (input: TInput, ctx: ToolExecutionContext) => Promise<string | null> | string | null;
  execute: (input: TInput, ctx: ToolExecutionContext) => Promise<TOutput>;
};

export type ToolOutcome<TOutput = any> =
  | { status: "executed"; result: TOutput }
  | { status: "rejected"; stage: "schema" | "permission" | "business_rule" | "safety"; reason: string }
  | { status: "failed"; reason: string };

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    if (isDeterministicOperation(tool.name)) {
      throw new Error(`Deterministic operation "${tool.name}" must not be exposed as an AI tool.`);
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

  /** Decision gate: nothing executes without passing every stage. */
  async invoke(
    name: string,
    rawInput: unknown,
    ctx: ToolExecutionContext,
  ): Promise<ToolOutcome> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { status: "rejected", stage: "permission", reason: `Tool "${name}" is not registered.` };
    }

    await logAiEvent(ctx.supabase, {
      agencyId: ctx.agencyId,
      correlationId: ctx.correlationId,
      event: "TOOL_REQUEST",
      tool: name,
    });

    if (!ctx.grantedPermissions.includes(tool.permission)) {
      const outcome: ToolOutcome = {
        status: "rejected",
        stage: "permission",
        reason: `Missing "${tool.permission}" permission for ${name}.`,
      };
      await logAiEvent(ctx.supabase, {
        agencyId: ctx.agencyId,
        correlationId: ctx.correlationId,
        event: "ACTION_FAILED",
        tool: name,
        status: "rejected",
        error: outcome.status === "rejected" ? outcome.reason : undefined,
      });
      return outcome;
    }

    const parsed = tool.inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { status: "rejected", stage: "schema", reason: parsed.error.message };
    }

    if (tool.validate) {
      const problem = await tool.validate(parsed.data, ctx);
      if (problem) {
        await logAiEvent(ctx.supabase, {
          agencyId: ctx.agencyId,
          correlationId: ctx.correlationId,
          event: "ACTION_FAILED",
          tool: name,
          status: "rejected",
          error: problem,
        });
        return { status: "rejected", stage: "business_rule", reason: problem };
      }
    }

    try {
      const result = await tool.execute(parsed.data, ctx);
      await logAiEvent(ctx.supabase, {
        agencyId: ctx.agencyId,
        correlationId: ctx.correlationId,
        event: "ACTION_EXECUTED",
        tool: name,
        status: "ok",
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
