/**
 * Shared redaction utilities for the AI Intelligence Layer.
 *
 * Conservative, substring-level redaction: matched sensitive spans are replaced
 * with a placeholder while surrounding semantic content is preserved. Used for
 * audit logs, experience records and any free text entering model context.
 */

type Rule = { name: string; pattern: RegExp; token: string };

const RULES: Rule[] = [
  // Credentials / tokens first (most specific).
  {
    name: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g,
    token: "[redacted:token]",
  },
  { name: "bearer", pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi, token: "[redacted:token]" },
  { name: "openai_key", pattern: /\bsk-[A-Za-z0-9_-]{12,}\b/g, token: "[redacted:key]" },
  {
    name: "supabase_key",
    pattern: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}\b/g,
    token: "[redacted:key]",
  },
  // Meta / WhatsApp Cloud API access tokens (EAA... long opaque strings).
  { name: "meta_token", pattern: /\bEAA[A-Za-z0-9]{20,}\b/g, token: "[redacted:token]" },
  {
    name: "labelled_key",
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/-]{6,}["']?/gi,
    token: "[redacted:key]",
  },
  // PII.
  {
    name: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    token: "[redacted:email]",
  },
  {
    name: "phone",
    pattern: /(?:\+|\b00)\d[\d\s().-]{6,}\d|\b0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\b/g,
    token: "[redacted:phone]",
  },
  // Passport-like identifiers (1-2 letters + 6-9 digits), MyKad / NRIC style ids.
  { name: "passport", pattern: /\b[A-Z]{1,2}\d{6,9}\b/g, token: "[redacted:id]" },
  { name: "nric", pattern: /\b\d{6}-\d{2}-\d{4}\b/g, token: "[redacted:id]" },
];

/** Redact sensitive substrings while preserving the rest of the text. */
export function redactText(input: string | null | undefined): string | undefined {
  if (input === null || input === undefined) return undefined;
  let out = String(input);
  for (const rule of RULES) out = out.replace(rule.pattern, rule.token);
  return out;
}

/** Redact and hard-cap a free-text field so persistence stays bounded. */
export function redactAndCap(
  input: string | null | undefined,
  maxLength = 500,
): string | undefined {
  const redacted = redactText(input);
  if (redacted === undefined) return undefined;
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}…` : redacted;
}

/** Deep-redact free text inside plain JSON-ish structures. */
export function redactDeep<T>(value: T, maxLength = 2000): T {
  if (typeof value === "string") return (redactAndCap(value, maxLength) ?? "") as unknown as T;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, maxLength)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactDeep(val, maxLength);
    }
    return out as unknown as T;
  }
  return value;
}
