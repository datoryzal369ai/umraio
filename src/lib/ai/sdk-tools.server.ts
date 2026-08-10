import { tool as aiTool, type Tool } from "ai";

import type { ToolExecutionContext, ToolRegistry } from "./tool-registry.server";

/**
 * SDK tool adapter — the ONLY sanctioned way to expose registry tools to a
 * model.
 *
 *   AI MODEL → SDK TOOL ADAPTER → ToolRegistry.invoke() → schema → permission
 *   → business rule → execution → audit
 *
 * The `execute` implementation is generated here and always delegates to
 * `registry.invoke`. Phase 8 (and any later wiring) must build AI SDK tools
 * with this adapter; it cannot perform Supabase writes itself, so the decision
 * gate cannot be bypassed by accident.
 *
 * Hand-written `tool({ execute })` definitions that touch the database
 * directly are forbidden by architecture.
 */

export type SdkToolAdapterOptions = {
  registry: ToolRegistry;
  ctx: ToolExecutionContext;
  /**
   * Tool names exposed to the model for this request. Defaults to the
   * per-request allowlist already carried on the execution context; anything
   * outside it is rejected by the registry regardless.
   */
  expose?: string[];
};

/**
 * Build the AI SDK `tools` map for a request. Every entry routes through the
 * decision gate and returns a controlled outcome envelope (never a throw), so
 * a rejected action is visible to the model as data rather than a crash.
 */
export function createSdkTools(options: SdkToolAdapterOptions): Record<string, Tool> {
  const { registry, ctx } = options;
  const exposed = (options.expose ?? ctx.allowedTools).filter((name) =>
    ctx.allowedTools.includes(name),
  );

  const tools: Record<string, Tool> = {};

  for (const name of exposed) {
    const definition = registry.get(name);
    if (!definition) continue;

    tools[name] = aiTool({
      description: definition.description,
      inputSchema: definition.inputSchema,
      // Delegation is enforced: the adapter owns execute, callers cannot supply one.
      execute: async (input: unknown) => registry.invoke(name, input, ctx),
    }) as Tool;
  }

  return tools;
}
