import { createHash } from "crypto";

/**
 * UMRAIO® — PUBLIC DEMONSTRATION ABUSE PROTECTION (Step 6.3).
 *
 * The public "Meet Your AI Business Executive™" endpoint is unauthenticated,
 * so it is rate limited per IP (hashed, never stored raw) and globally capped
 * so a single visitor can never generate unbounded AI cost.
 */

export const DEMO_LIMITS = {
  perIpPerHour: 12,
  perIpPerDay: 40,
  globalPerHour: 600,
} as const;

export const DEMO_LIMIT_MESSAGE =
  "You have reached the demonstration limit for now. Please book a live demo or start a free trial to continue.";
export const DEMO_BUSY_MESSAGE =
  "The public demonstration is busy right now. Please try again shortly, or book a live demo.";

export function clientIpHash(request: Request): string {
  const header =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  // Hashed with a server-side salt so no raw visitor IP is ever persisted.
  const salt = process.env["SUPABASE_PROJECT_ID"] ?? "umraio";
  return createHash("sha256").update(`${salt}:${header}`).digest("hex").slice(0, 48);
}

export type DemoGate =
  | { allowed: true }
  | { allowed: false; status: 429 | 503; message: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = { from: (table: string) => any };

async function countSince(
  admin: Admin,
  since: string,
  ipHash?: string,
): Promise<number | null> {
  let query = admin
    .from("public_demo_hits")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (ipHash) query = query.eq("ip_hash", ipHash);
  const { count, error } = await query;
  if (error) return null;
  return count ?? 0;
}

/** Fails closed: if the counter is unreadable, the demo is declined politely. */
export async function checkDemoRateLimit(
  admin: Admin,
  ipHash: string,
  fingerprint?: string | null,
): Promise<DemoGate> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60_000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60_000).toISOString();

  const [ipHour, ipDay, globalHour] = await Promise.all([
    countSince(admin, hourAgo, ipHash),
    countSince(admin, dayAgo, ipHash),
    countSince(admin, hourAgo),
  ]);

  if (ipHour === null || ipDay === null || globalHour === null) {
    return { allowed: false, status: 503, message: DEMO_BUSY_MESSAGE };
  }
  if (globalHour >= DEMO_LIMITS.globalPerHour) {
    return { allowed: false, status: 503, message: DEMO_BUSY_MESSAGE };
  }
  if (ipHour >= DEMO_LIMITS.perIpPerHour || ipDay >= DEMO_LIMITS.perIpPerDay) {
    return { allowed: false, status: 429, message: DEMO_LIMIT_MESSAGE };
  }

  await admin
    .from("public_demo_hits")
    .insert({ ip_hash: ipHash, fingerprint: fingerprint ?? null });

  return { allowed: true };
}
