/**
 * UMRAIO® AI Intelligence Layer (V1) — server-only barrel.
 *
 * Application code should import from here rather than a model provider SDK.
 * Nothing in this layer is wired into existing features yet; the current
 * sales-ai and executive-ai paths continue to run unchanged.
 */

export * from "./types";
export * from "./routing";
export { getAiConfig, getProviderApiKey } from "./config.server";
export { createIntelligenceGateway } from "./gateway.server";
export { buildContext, loadBusinessMemory, newCorrelationId } from "./context.server";
export {
  ToolRegistry,
  createToolRegistry,
  type ToolDefinition,
  type ToolExecutionContext,
  type ToolOutcome,
  type ToolPermission,
} from "./tool-registry.server";
export { logAiEvent, type AiAuditEvent, type AiAuditPayload } from "./audit.server";
export { recordExperience, hashContext, type ExperienceRecord } from "./evaluation.server";
