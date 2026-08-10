import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "../ai-gateway.server";
import { getAiConfig, getProviderApiKey, type AiConfig } from "./config.server";
import { classifyTask } from "./routing";
import type { AiDecision, AiRequest, AiResult, IntelligenceGateway } from "./types";

/**
 * UMRAIO® AI Intelligence Layer — model-agnostic gateway.
 *
 * Application code calls this surface instead of a provider SDK. Swapping the
 * foundation model is a configuration change (AI_PROVIDER / AI_MODEL /
 * AI_FAST_MODEL). A future RÉNAI.CORE™ engine can implement the same
 * IntelligenceGateway interface and be dropped in without app changes.
 *
 * This layer never fabricates a response: a provider failure returns
 * `{ ok: false }` so callers can fall back to human workflows.
 */

const decisionSchema = z.object({
  intent: z.string(),
  confidence: z.number(),
  customer_state: z.string(),
  recommended_action: z.string(),
  reason_code: z.string(),
  required_tool: z.string().nullable(),
  response: z.string(),
  escalation_required: z.boolean(),
});

function resolveModelId(config: AiConfig, request: AiRequest): string {
  const cls = request.taskClass ?? classifyTask(request.taskType);
  return cls === "fast" ? config.fastModel : config.model;
}

function buildModel(config: AiConfig, modelId: string) {
  const key = getProviderApiKey(config.provider);
  return createLovableAiGatewayProvider(key)(modelId);
}

function contextBlock(request: AiRequest): string {
  if (!request.context) return request.prompt;
  return [
    request.prompt,
    "",
    `Current time: ${request.context.now}`,
    request.context.locale ? `Language: ${request.context.locale}` : "",
    request.context.allowedTools.length
      ? `Permitted tools: ${request.context.allowedTools.join(", ")}`
      : "",
    "",
    "Context (JSON, authoritative — do not invent facts beyond this):",
    JSON.stringify(request.context.facts),
  ]
    .filter(Boolean)
    .join("\n");
}

async function withRetry<T>(config: AiConfig, run: (modelId: string) => Promise<T>) {
  const attempts: string[] = [resolveModelIdPlaceholder(config)];
  void attempts;
  return run(config.model);
}

function resolveModelIdPlaceholder(config: AiConfig) {
  return config.model;
}

async function call<T>(
  request: AiRequest,
  execute: (modelId: string) => Promise<T>,
): Promise<AiResult<T>> {
  const config = getAiConfig();
  const primary = resolveModelId(config, request);
  const candidates = [primary, ...(config.fallbackModel ? [config.fallbackModel] : [])];

  let lastError: unknown = null;
  for (const modelId of candidates) {
    for (let attempt = 0; attempt <= Math.max(0, config.maxRetries); attempt += 1) {
      const startedAt = Date.now();
      try {
        const data = await execute(modelId);
        return {
          ok: true,
          data,
          usage: { model: modelId, provider: config.provider, latencyMs: Date.now() - startedAt },
        };
      } catch (error) {
        lastError = error;
        if (NoObjectGeneratedError.isInstance(error)) break; // schema issue: retrying won't help
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "AI provider unavailable";
  return {
    ok: false,
    data: null,
    usage: null,
    error: {
      code: NoObjectGeneratedError.isInstance(lastError) ? "invalid_output" : "unavailable",
      message,
    },
  };
}

export function createIntelligenceGateway(): IntelligenceGateway {
  const config = getAiConfig();

  return {
    async generate(request) {
      return call(request, async (modelId) => {
        const { text } = await generateText({
          model: buildModel(config, modelId),
          system: request.system,
          prompt: contextBlock(request),
          providerOptions: { lovable: { reasoningEffort: "none" } },
        });
        return text.trim();
      });
    },

    async reason(request): Promise<AiResult<AiDecision>> {
      return call(request, async (modelId) => {
        const { output } = await generateText({
          model: buildModel(config, modelId),
          output: Output.object({ schema: decisionSchema }),
          system: request.system,
          prompt: [
            contextBlock(request),
            "",
            "Return a decision envelope. `reason_code` must be a short auditable rationale",
            "(one sentence, no private reasoning). Set escalation_required = true when",
            "confidence is low, the request is unusual or sensitive, information is missing,",
            "or the customer asks for a human.",
          ].join("\n"),
        });
        return output as AiDecision;
      });
    },

    async classify(request) {
      return call(request, async (modelId) => {
        const { output } = await generateText({
          model: buildModel(config, modelId),
          output: Output.object({
            schema: z.object({ label: z.string(), confidence: z.number() }),
          }),
          system: request.system,
          prompt: [
            contextBlock(request),
            "",
            `Choose exactly one label from: ${request.labels.join(", ")}.`,
          ].join("\n"),
        });
        const label = (output as { label: string }).label;
        return request.labels.includes(label) ? label : request.labels[0]!;
      });
    },

    async extract<T>(request: AiRequest & { schema: unknown }) {
      return call<T>(request, async (modelId) => {
        const { output } = await generateText({
          model: buildModel(config, modelId),
          output: Output.object({ schema: request.schema as z.ZodTypeAny }),
          system: request.system,
          prompt: contextBlock(request),
        });
        return output as T;
      });
    },

    async evaluate(request) {
      return call(request, async (modelId) => {
        const { output } = await generateText({
          model: buildModel(config, modelId),
          output: Output.object({
            schema: z.object({ score: z.number(), reason_code: z.string() }),
          }),
          system: request.system,
          prompt: [
            contextBlock(request),
            "",
            "Score the outcome from 0 (failed) to 100 (ideal) and give a short reason code.",
          ].join("\n"),
        });
        return output as { score: number; reason_code: string };
      });
    },

    async healthCheck() {
      try {
        const { text } = await generateText({
          model: buildModel(config, config.fastModel),
          prompt: "Reply with OK.",
          providerOptions: { lovable: { reasoningEffort: "none" } },
        });
        return {
          ok: text.trim().length > 0,
          provider: config.provider,
          model: config.fastModel,
        };
      } catch (error) {
        return {
          ok: false,
          provider: config.provider,
          model: config.fastModel,
          message: error instanceof Error ? error.message : "unknown error",
        };
      }
    },
  };
}
