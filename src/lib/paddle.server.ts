import { Environment, EventName, Paddle } from "@paddle/paddle-node-sdk";

/**
 * UMRAIO® — shared Paddle server utility (Step 3H.2).
 *
 * Server-only. API keys and webhook secrets are read inside functions so no
 * credential is ever evaluated at module scope or shipped to the browser.
 */

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };

export type PaddleEnv = "sandbox" | "live";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev/paddle";

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === "sandbox" ? getEnv("PADDLE_SANDBOX_API_KEY") : getEnv("PADDLE_LIVE_API_KEY");
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Paddle(connectionApiKey, {
    environment: GATEWAY_BASE_URL as unknown as Environment,
    customHeaders: {
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
    },
  });
}

/** Paddle REST calls the SDK does not cover (e.g. external_id filtering). */
export async function gatewayFetch(
  env: PaddleEnv,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return fetch(`${GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
      ...init?.headers,
    },
  });
}

export function getWebhookSecret(env: PaddleEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  const secret = getWebhookSecret(env);

  if (!signature || !body) {
    throw new Error("Missing signature or body");
  }

  const paddle = getPaddleClient(env);
  return await paddle.webhooks.unmarshal(body, secret, signature);
}
