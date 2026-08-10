/**
 * Provider/model configuration for the AI Intelligence Layer.
 * Server-only. API keys are read at call time and never leave the server.
 */

export type AiProviderId = "lovable";

export type AiConfig = {
  provider: AiProviderId;
  /** Primary reasoning model. */
  model: string;
  /** Economical model for fast/classification tasks. */
  fastModel: string;
  /** Optional fallback used when the primary model call fails. */
  fallbackModel: string | null;
  maxRetries: number;
};

const DEFAULT_MODEL = "openai/gpt-5.6-sol";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

/** Read configuration inside a handler — never at module scope. */
export function getAiConfig(): AiConfig {
  const provider = (env("AI_PROVIDER") ?? "lovable") as AiProviderId;
  const model = env("AI_MODEL") ?? DEFAULT_MODEL;
  return {
    provider,
    model,
    fastModel: env("AI_FAST_MODEL") ?? model,
    fallbackModel: env("AI_FALLBACK_MODEL") ?? null,
    maxRetries: Number(env("AI_MAX_RETRIES") ?? 1),
  };
}

export function getProviderApiKey(provider: AiProviderId): string {
  if (provider === "lovable") {
    const key = env("LOVABLE_API_KEY");
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    return key;
  }
  throw new Error(`Unsupported AI provider: ${provider}`);
}
