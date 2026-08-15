import { createHmac, timingSafeEqual } from "node:crypto";

export type SignatureResult =
  | { valid: true }
  | { valid: false; reason: "missing_secret" | "missing_signature" | "malformed_signature" | "invalid_signature" };

/**
 * Verifies a Meta WhatsApp webhook payload against the `X-Hub-Signature-256`
 * header, per Meta's Graph API webhook security docs:
 * signature = "sha256=" + HMAC_SHA256(app_secret, RAW_REQUEST_BODY).
 *
 * The raw body string MUST be used — re-stringified JSON will not match.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined | null,
): SignatureResult {
  if (!appSecret) return { valid: false, reason: "missing_secret" };
  if (!signatureHeader) return { valid: false, reason: "missing_signature" };

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return { valid: false, reason: "malformed_signature" };

  const provided = signatureHeader.slice(prefix.length).trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return { valid: false, reason: "malformed_signature" };

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "invalid_signature" };
  }
  return { valid: true };
}

/** Test/utility helper — produces the header Meta would send for a raw body. */
export function signMetaPayload(rawBody: string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
}
