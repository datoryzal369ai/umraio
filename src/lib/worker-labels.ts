import { CAPABILITIES } from "@/lib/meet-executive.core";

/**
 * Canonical worker display names, derived from the single capability registry
 * (`CAPABILITIES`) so public /meet, the AI Executive Centre, the sidebar and
 * the dashboard can never drift apart.
 */
export const WORKER_LABELS: Record<string, string> = Object.fromEntries(
  CAPABILITIES.map((c) => [c.key, c.name]),
);
