import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * UMRAIO® — shared Stripe server utility (Step 3H.2B).
 *
 * Server-only. The secret key and webhook secret are read INSIDE functions, so
 * no credential is evaluated at module scope or reachable from the browser.
 * Stripe is called over its REST API with form-encoded bodies (no SDK needed,
 * Worker-safe).
 */

const STRIPE_API = "https://api.stripe.com/v1";

export type StripeMode = "test" | "live";

function getSecretKey(): string {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

export function hasStripeSecretKey(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

/** Which Stripe environment the configured key belongs to. */
export function getStripeMode(): StripeMode {
  return getSecretKey().startsWith("sk_test_") ? "test" : "live";
}

/** Flatten a nested object into Stripe's form-encoding convention. */
export function toFormBody(
  input: Record<string, unknown>,
  prefix = "",
  params = new URLSearchParams(),
): URLSearchParams {
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const field = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && !Array.isArray(value)) {
      toFormBody(value as Record<string, unknown>, field, params);
    } else if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (entry !== null && typeof entry === "object") {
          toFormBody(entry as Record<string, unknown>, `${field}[${index}]`, params);
        } else {
          params.append(`${field}[${index}]`, String(entry));
        }
      });
    } else {
      params.append(field, String(value));
    }
  }
  return params;
}

export type StripeRequest = {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  /** Stripe idempotency key for safe retries of create calls. */
  idempotencyKey?: string;
};

export async function stripeFetch<T = unknown>(
  path: string,
  init: StripeRequest = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getSecretKey()}`,
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  let body: string | undefined;
  if (init.body && method !== "GET") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = toFormBody(init.body).toString();
  }

  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
  const text = await response.text();

  if (!response.ok) {
    // Log the provider status/message, never the key or full request body.
    console.error(`[stripe] ${method} ${path} failed [${response.status}]: ${text.slice(0, 500)}`);
    throw new Error(`Stripe request failed [${response.status}]`);
  }

  return JSON.parse(text) as T;
}

/* --------------------------- webhook signatures --------------------------- */

const DEFAULT_TOLERANCE_SECONDS = 300;

export function getStripeWebhookSecret(): string {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return secret;
}

export type SignatureCheck = { valid: boolean; reason?: string };

/**
 * Verify a `Stripe-Signature` header (`t=<ts>,v1=<sig>,...`) against the raw
 * body. Pure, deterministic and unit-testable — no network, no env reads.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): SignatureCheck {
  if (!header) return { valid: false, reason: "missing_signature" };
  if (!secret) return { valid: false, reason: "missing_secret" };

  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key?.trim() === "t") timestamp = value?.trim() ?? null;
    if (key?.trim() === "v1" && value) signatures.push(value.trim());
  }

  if (!timestamp || signatures.length === 0) return { valid: false, reason: "malformed_signature" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { valid: false, reason: "malformed_signature" };
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) return { valid: false, reason: "timestamp_out_of_tolerance" };

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");

  const matched = signatures.some((candidate) => {
    const candidateBuf = Buffer.from(candidate, "utf8");
    return (
      candidateBuf.length === expectedBuf.length && timingSafeEqual(candidateBuf, expectedBuf)
    );
  });

  return matched ? { valid: true } : { valid: false, reason: "signature_mismatch" };
}

/** Read + verify a Stripe webhook request, returning the parsed event. */
export async function readVerifiedStripeEvent(request: Request): Promise<Record<string, unknown>> {
  const payload = await request.text();
  const check = verifyStripeSignature(
    payload,
    request.headers.get("stripe-signature"),
    getStripeWebhookSecret(),
  );
  if (!check.valid) throw new Error(`invalid_signature:${check.reason}`);
  return JSON.parse(payload) as Record<string, unknown>;
}
