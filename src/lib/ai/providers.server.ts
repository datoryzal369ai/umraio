import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import type { AiProviderId } from "./config.server";

/**
 * Provider adapter registry.
 *
 * The neutral gateway depends on this interface only — never on a concrete
 * provider SDK. A future RÉNAIO.CORE™ engine registers its own adapter here and
 * the gateway keeps working unchanged. All provider-specific request options
 * live inside the adapter, never in the neutral gateway.
 */

export type ProviderTransport = "fast" | "reasoning";

export type ProviderAdapter = {
  id: string;
  /** Throws a clear configuration error when credentials are missing. */
  readApiKey: () => string;
  /** Build a model handle for the given transport class. */
  model: (modelId: string, transport: ProviderTransport) => LanguageModel;
  /** Provider-specific request options for a transport class. */
  requestOptions: (transport: ProviderTransport) => Record<string, unknown> | undefined;
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

const LOVABLE_BASE_URL = "https://ai.gateway.lovable.dev/v1";

/** OpenAI ids on the Lovable gateway use the Responses transport. */
function isOpenAiModel(modelId: string) {
  return modelId.startsWith("openai/");
}

const lovableAdapter: ProviderAdapter = {
  id: "lovable",
  readApiKey() {
    const key = env("LOVABLE_API_KEY");
    if (!key) throw new Error("AI configuration error: missing LOVABLE_API_KEY");
    return key;
  },
  model(modelId, transport) {
    const apiKey = this.readApiKey();
    const headers = {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    };

    if (transport === "reasoning" && isOpenAiModel(modelId)) {
      // OpenAI reasoning models are only correctly supported on /v1/responses.
      const openai = createOpenAI({ baseURL: LOVABLE_BASE_URL, apiKey, headers });
      return openai.responses(modelId);
    }

    return createOpenAICompatible({
      name: "lovable",
      baseURL: LOVABLE_BASE_URL,
      supportsStructuredOutputs: true,
      headers,
    })(modelId);
  },
  requestOptions(transport) {
    if (transport === "reasoning") {
      return {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      };
    }
    return { lovable: { reasoningEffort: "none" } };
  },
};

const ADAPTERS = new Map<string, ProviderAdapter>([[lovableAdapter.id, lovableAdapter]]);

export function registerProviderAdapter(adapter: ProviderAdapter) {
  ADAPTERS.set(adapter.id, adapter);
}

export function isSupportedProvider(id: string): id is AiProviderId {
  return ADAPTERS.has(id);
}

export function getProviderAdapter(id: string): ProviderAdapter {
  const adapter = ADAPTERS.get(id);
  if (!adapter) {
    throw new Error(
      `AI configuration error: unsupported AI_PROVIDER "${id}". Supported: ${[...ADAPTERS.keys()].join(", ")}`,
    );
  }
  return adapter;
}
