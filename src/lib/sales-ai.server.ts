import { generateText, stepCountIs, tool, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createLovableAiGatewayProvider, SALES_MODEL } from "./ai-gateway.server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender: "customer" | "ai" | "human";
  body: string;
  created_at: string;
};

function getModel() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(SALES_MODEL);
}

export async function loadContext(supabase: Db, conversationId: string) {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, agency_id, lead_id, channel, status, ai_enabled")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) throw new Error("Conversation not found");

  const [{ data: messages }, { data: lead }, { data: packages }, { data: agency }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("id, conversation_id, sender, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200),
      conversation.lead_id
        ? supabase
            .from("leads")
            .select(
              "id, full_name, phone, email, stage, temperature, budget_myr, pax, preferred_month, tags, score",
            )
            .eq("id", conversation.lead_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("packages")
        .select(
          "id, name, hotel_makkah, hotel_madinah, star_rating, nights, departure_date, airline, price_myr, inclusions",
        )
        .eq("is_active", true)
        .order("price_myr", { ascending: true })
        .limit(30),
      supabase.from("agencies").select("name, country, timezone").maybeSingle(),
    ]);

  return {
    conversation,
    messages: (messages ?? []) as ChatMessageRow[],
    lead,
    packages: packages ?? [],
    agency,
  };
}

function systemPrompt(ctx: Awaited<ReturnType<typeof loadContext>>) {
  const agencyName = (ctx.agency as { name?: string } | null)?.name ?? "our agency";
  return [
    `You are UMRAIO, the AI Sales Executive for ${agencyName}, a Malaysian Umrah travel agency.`,
    "You speak with prospective pilgrims on WhatsApp. You are professional, warm, respectful of Islamic etiquette, and concise.",
    "Reply in the language the customer uses (Bahasa Malaysia, English or a mix). Keep replies under 90 words, WhatsApp style, no markdown headings.",
    "Sales method: greet -> understand intent -> ask ONE or TWO qualifying questions at a time (travel month, number of pax, budget per person, hotel distance preference, first-time or repeat) -> recommend the best matching packages with price in RM -> handle objections -> propose next step (deposit / booking slot / call).",
    "Always use the recommend_packages tool before quoting any package, and never invent packages, prices or departure dates.",
    "Whenever the customer reveals their name, phone, budget, pax count or travel month, call update_lead_profile to save it.",
    "When the customer is not ready yet, call schedule_followup to book a polite follow-up.",
    "Never promise visas, guarantees or refunds outside the listed inclusions.",
    ctx.lead
      ? `Known lead profile: ${JSON.stringify(ctx.lead)}`
      : "No lead profile linked yet to this conversation.",
  ].join("\n");
}

function buildTools(supabase: Db, ctx: Awaited<ReturnType<typeof loadContext>>) {
  const agencyId = ctx.conversation.agency_id as string;
  const leadId = ctx.conversation.lead_id as string | null;

  return {
    recommend_packages: tool({
      description: "Look up the agency's active Umrah packages to recommend accurate options.",
      inputSchema: z.object({
        max_price_myr: z.number().nullable(),
        pax: z.number().nullable(),
        preferred_month: z.string().nullable(),
      }),
      execute: async ({ max_price_myr }) => {
        const list = ctx.packages as Array<Record<string, unknown>>;
        const filtered = max_price_myr
          ? list.filter((p) => Number(p["price_myr"]) <= max_price_myr * 1.15)
          : list;
        return { packages: (filtered.length ? filtered : list).slice(0, 6) };
      },
    }),
    update_lead_profile: tool({
      description: "Save customer information collected during the conversation onto the lead.",
      inputSchema: z.object({
        full_name: z.string().nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        budget_myr: z.number().nullable(),
        pax: z.number().nullable(),
        preferred_month: z.string().nullable(),
        temperature: z.enum(["hot", "warm", "cold"]).nullable(),
        stage: z.enum(["new", "contacted", "qualified", "proposal", "booked", "lost"]).nullable(),
      }),
      execute: async (input) => {
        if (!leadId) return { saved: false, reason: "No lead linked to this conversation." };
        const patch: Record<string, unknown> = { last_contact_at: new Date().toISOString() };
        for (const [k, v] of Object.entries(input)) if (v !== null && v !== "") patch[k] = v;
        const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
        if (error) return { saved: false, reason: error.message };
        await supabase.from("activity_log").insert({
          agency_id: agencyId,
          actor: "ai",
          action: "Updated lead profile from conversation",
          entity: "lead",
          entity_id: leadId,
          meta: patch,
        });
        return { saved: true, fields: Object.keys(patch) };
      },
    }),
    schedule_followup: tool({
      description: "Schedule a follow-up task for this prospect.",
      inputSchema: z.object({
        title: z.string(),
        hours_from_now: z.number(),
      }),
      execute: async ({ title, hours_from_now }) => {
        const runAt = new Date(Date.now() + Math.max(1, hours_from_now) * 3600_000);
        const { error } = await supabase.from("followup_jobs").insert({
          agency_id: agencyId,
          lead_id: leadId,
          title,
          channel: "whatsapp",
          run_at: runAt.toISOString(),
          status: "pending",
        });
        if (error) return { scheduled: false, reason: error.message };
        return { scheduled: true, run_at: runAt.toISOString() };
      },
    }),
  };
}

export async function generateAgentReply(supabase: Db, conversationId: string): Promise<string> {
  const ctx = await loadContext(supabase, conversationId);

  const history = ctx.messages.slice(-40).map((m) => ({
    role: (m.sender === "customer" ? "user" : "assistant") as "user" | "assistant",
    content: m.sender === "human" ? `[Human agent]: ${m.body}` : m.body,
  }));

  const { text } = await generateText({
    model: getModel(),
    system: systemPrompt(ctx),
    messages: history.length ? history : [{ role: "user", content: "Assalamualaikum" }],
    tools: buildTools(supabase, ctx),
    stopWhen: stepCountIs(50),
    providerOptions: { lovable: { reasoningEffort: "none" } },
  });

  return text.trim() || "Maaf, boleh ulang semula soalan tuan/puan?";
}

export type ConversationInsights = {
  summary: string;
  customer_profile: string;
  qualification: string;
  objections: string;
  followup_message: string;
  booking_suggestion: string;
  next_step: string;
};

const insightsSchema = z.object({
  summary: z.string(),
  customer_profile: z.string(),
  qualification: z.string(),
  objections: z.string(),
  followup_message: z.string(),
  booking_suggestion: z.string(),
  next_step: z.string(),
});

export async function generateInsights(
  supabase: Db,
  conversationId: string,
): Promise<ConversationInsights> {
  const ctx = await loadContext(supabase, conversationId);
  const transcript = ctx.messages
    .map((m) => `${m.sender === "customer" ? "Customer" : "Agency"}: ${m.body}`)
    .join("\n");

  const prompt = [
    "Analyse this Umrah sales conversation for the agency's sales team.",
    "Return short, factual Malaysian-English text for each field (max 2 sentences each).",
    "followup_message must be a ready-to-send WhatsApp follow-up in the customer's language.",
    "booking_suggestion must name the recommended package, pax, estimated total in RM and the deposit ask.",
    "",
    "Active packages:",
    JSON.stringify(ctx.packages),
    "",
    "Transcript:",
    transcript || "(no messages yet)",
  ].join("\n");

  try {
    const { output } = await generateText({
      model: getModel(),
      output: Output.object({ schema: insightsSchema }),
      prompt,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });
    return output as ConversationInsights;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        return insightsSchema.parse(JSON.parse(error.text ?? "{}")) as ConversationInsights;
      } catch {
        throw new Error("Could not generate insights. Please try again.");
      }
    }
    throw error;
  }
}
