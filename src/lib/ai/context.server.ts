import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiContext } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/**
 * UMRAIO® Context Engine.
 *
 * Builds a minimum-necessary, tenant-scoped context object. All reads go
 * through the caller's RLS-scoped client, so Agency A data can never enter
 * Agency B's context. Personal data is trimmed to what the task needs.
 */

export function newCorrelationId(): string {
  return `umr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type ContextOptions = {
  agencyId: string;
  conversationId?: string;
  leadId?: string;
  allowedTools?: string[];
  locale?: string;
  /** Cap on conversation history turns included. */
  historyLimit?: number;
  includePackages?: boolean;
};

export async function buildContext(supabase: Db, options: ContextOptions): Promise<AiContext> {
  const facts: Record<string, unknown> = {};

  const [{ data: agency }, { data: settings }] = await Promise.all([
    supabase
      .from("agencies")
      .select("name, country, timezone")
      .eq("id", options.agencyId)
      .maybeSingle(),
    supabase
      .from("agency_settings")
      .select("ai_name, ai_tone, ai_personality, ai_language, ai_custom_instructions, ai_emoji")
      .eq("agency_id", options.agencyId)
      .maybeSingle(),
  ]);
  facts["agency"] = agency ?? null;
  facts["ai_settings"] = settings ?? null;

  if (options.leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select(
        "id, stage, temperature, score, pax, budget_myr, preferred_month, package_interest, city, source, last_contact_at",
      )
      .eq("id", options.leadId)
      .maybeSingle();
    // Deliberately excludes phone/email: not needed for reasoning.
    facts["lead"] = lead ?? null;
  }

  if (options.conversationId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("sender, body, created_at")
      .eq("conversation_id", options.conversationId)
      .order("created_at", { ascending: false })
      .limit(options.historyLimit ?? 40);
    facts["recent_messages"] = (messages ?? []).reverse();
  }

  if (options.includePackages !== false) {
    const { data: packages } = await supabase
      .from("packages")
      .select(
        "id, name, hotel_makkah, hotel_madinah, star_rating, nights, departure_date, airline, price_myr, inclusions",
      )
      .eq("is_active", true)
      .order("price_myr", { ascending: true })
      .limit(20);
    facts["packages"] = packages ?? [];
  }

  return {
    agencyId: options.agencyId,
    correlationId: newCorrelationId(),
    locale: options.locale ?? (settings as any)?.ai_language ?? undefined,
    now: new Date().toISOString(),
    facts,
    allowedTools: options.allowedTools ?? [],
  };
}

/**
 * Persistent business memory (structured, validated) as opposed to
 * short-term conversation context. Reuses existing tables only.
 */
export async function loadBusinessMemory(supabase: Db, leadId: string) {
  const [{ data: lead }, { data: notes }] = await Promise.all([
    supabase
      .from("leads")
      .select("package_interest, preferred_month, budget_myr, pax, tags, temperature, stage")
      .eq("id", leadId)
      .maybeSingle(),
    supabase
      .from("lead_notes")
      .select("body, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    preferences: lead ?? null,
    recent_notes: (notes ?? []).map((n: any) => n.body),
  };
}
