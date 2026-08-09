import { generateText, stepCountIs, tool, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createLovableAiGatewayProvider, SALES_MODEL } from "./ai-gateway.server";
import { GLOBAL_UMRAIO_KNOWLEDGE } from "./global-knowledge.server";

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

  const [
    { data: messages },
    { data: lead },
    { data: packages },
    { data: agency },
    { data: knowledge },
    { data: settings },
  ] = await Promise.all([
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
            "id, full_name, phone, email, stage, temperature, budget_myr, pax, preferred_month, city, package_interest, tags, score",
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
    supabase
      .from("knowledge_articles")
      .select("id, title, category, summary, content, tags, file_name")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("agency_settings")
      .select(
        "business_hours, ai_name, ai_personality, ai_tone, ai_reply_length, ai_language, ai_custom_instructions, ai_emoji, kb_strict_mode, kb_auto_use, kb_max_articles, kb_escalate_when_unknown",
      )
      .eq("agency_id", conversation.agency_id)
      .maybeSingle(),
  ]);

  return {
    conversation,
    messages: (messages ?? []) as ChatMessageRow[],
    lead,
    packages: packages ?? [],
    agency,
    knowledge: (knowledge ?? []) as KnowledgeRow[],
    settings: (settings ?? null) as AgencyAiSettings | null,
  };
}

export type AgencyAiSettings = {
  business_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  ai_name: string;
  ai_personality: string;
  ai_tone: string;
  ai_reply_length: string;
  ai_language: string;
  ai_custom_instructions: string | null;
  ai_emoji: boolean;
  kb_strict_mode: boolean;
  kb_auto_use: boolean;
  kb_max_articles: number;
  kb_escalate_when_unknown: boolean;
};

export type KnowledgeRow = {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  content: string;
  tags: string[] | null;
  file_name: string | null;
};

function scoreArticle(article: KnowledgeRow, terms: string[]) {
  const haystack = [
    article.title,
    article.summary,
    article.category,
    (article.tags ?? []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const body = article.content.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (haystack.includes(term)) score += 3;
    if (body.includes(term)) score += 1;
  }
  return score;
}

export function searchKnowledge(
  articles: KnowledgeRow[],
  query: string,
  category?: string | null,
  limit = 4,
) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9\u00c0-\u024f]+/)
    .filter((t) => t.length > 2);
  const pool = category ? articles.filter((a) => a.category === category) : articles;
  const ranked = pool
    .map((a) => ({ article: a, score: scoreArticle(a, terms) }))
    .sort((a, b) => b.score - a.score);
  const max = Math.min(Math.max(limit, 1), 8);
  const hits = ranked.filter((r) => r.score > 0).slice(0, max);
  const chosen = (hits.length ? hits : ranked.slice(0, Math.min(2, max))).map((r) => r.article);
  return chosen.map((a) => ({
    title: a.title,
    category: a.category,
    summary: a.summary,
    source_document: a.file_name,
    excerpt: a.content.slice(0, 2500),
  }));
}

/** Search the tenant-agnostic global UMRAIO knowledge (platform facts only). */
export function searchGlobalKnowledge(query: string, limit = 4) {
  const rows: KnowledgeRow[] = GLOBAL_UMRAIO_KNOWLEDGE.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    summary: a.summary,
    content: a.content,
    tags: a.tags,
    file_name: null,
  }));
  return searchKnowledge(rows, query, null, limit).map((r) => ({ ...r, source: "global" as const }));
}

const PERSONALITY_HINTS: Record<string, string> = {
  professional: "Corporate, precise and credible. No filler, no slang.",
  friendly: "Warm, conversational and approachable, like a trusted travel consultant.",
  consultative: "Advisory: dig deeper with thoughtful qualifying questions before recommending.",
  concise: "Short, direct and always closing with a clear next step.",
};

const LENGTH_HINTS: Record<string, string> = {
  short: "Keep replies under 45 words.",
  balanced: "Keep replies under 90 words.",
  detailed: "Keep replies under 150 words.",
};

const LANGUAGE_HINTS: Record<string, string> = {
  auto: "Reply in the same language the customer uses (Bahasa Malaysia, English or a mix).",
  ms: "Always reply in Bahasa Malaysia.",
  en: "Always reply in English.",
  mix: "Reply in a natural Bahasa Malaysia and English mix, as Malaysians commonly write.",
  ar: "Always reply in Arabic.",
};

function businessHoursLine(settings: AgencyAiSettings | null) {
  const hours = settings?.business_hours;
  if (!hours) return null;
  const labels: Record<string, string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };
  const parts = Object.entries(labels).map(([key, label]) => {
    const day = hours[key];
    if (!day || day.closed) return `${label}: closed`;
    return `${label}: ${day.open}-${day.close}`;
  });
  return `Agency business hours (${parts.join(", ")}). Outside these hours, tell the customer a human colleague will follow up when the office reopens.`;
}

function systemPrompt(ctx: Awaited<ReturnType<typeof loadContext>>) {
  const agencyName = (ctx.agency as { name?: string } | null)?.name ?? "our agency";
  const s = ctx.settings;
  const aiName = s?.ai_name?.trim() || "UMRAIO";
  const personality =
    PERSONALITY_HINTS[s?.ai_personality ?? "professional"] ?? PERSONALITY_HINTS["professional"];
  const length = LENGTH_HINTS[s?.ai_reply_length ?? "balanced"] ?? LENGTH_HINTS["balanced"];
  const language = LANGUAGE_HINTS[s?.ai_language ?? "auto"] ?? LANGUAGE_HINTS["auto"];
  const tone = s?.ai_tone ?? "warm";
  const useKb = s?.kb_auto_use ?? true;

  return [
    `You are ${aiName}, the Autonomous AI Business Executive for ${agencyName}, a Malaysian Umrah travel agency.`,
    `You speak with prospective pilgrims on WhatsApp. Personality: ${personality} Tone: ${tone}. Always respect Islamic etiquette.`,
    `${language} ${length} WhatsApp style, no markdown headings.`,
    s?.ai_emoji === false
      ? "Do not use emojis."
      : "You may use light, respectful emojis sparingly.",
    "Sales method: greet -> understand intent -> ask ONE or TWO qualifying questions at a time (travel month, number of pax, budget per person, hotel distance preference, first-time or repeat) -> recommend the best matching packages with price in RM -> handle objections -> propose next step (deposit / booking slot / call).",
    useKb
      ? "MANDATORY: before answering ANY question about the agency, packages, prices, visas, hotels, flights, refunds, itineraries or policies, first call search_knowledge and base your answer on what it returns."
      : "Use search_knowledge when the customer asks something the package catalogue cannot answer.",
    s?.kb_strict_mode === false
      ? "You may add general Umrah guidance beyond the knowledge base, but never invent agency-specific facts, prices or dates."
      : "STRICT MODE: state agency facts only when they appear in the agency knowledge base or package catalogue. Never improvise. This restriction applies to AGENCY facts only — questions about UMRAIO® itself are always answerable from global UMRAIO knowledge.",
    "KNOWLEDGE PRIORITY (in order): 1) verified agency knowledge, 2) global UMRAIO knowledge, 3) the current conversation context, 4) safe general information, 5) ask a clarifying question, 6) human escalation as the last resort.",
    "search_knowledge returns two sources: `agency` results (this agency's verified data) and `global` results (official facts about the UMRAIO platform). Use agency results for agency-specific questions and global results for questions about UMRAIO itself.",
    "An empty agency knowledge base is NEVER a reason to go silent or escalate. If the customer asks what UMRAIO is or what it can do, answer confidently from global UMRAIO knowledge.",
    s?.kb_escalate_when_unknown === false
      ? "If nothing relevant is found, answer generally and invite the customer to ask for details."
      : "If nothing relevant is found for an AGENCY-specific question (price, date, hotel, Mutawwif, availability), do not fabricate: say you need to confirm the official agency information, and keep the conversation moving by asking for their preferred travel date and number of pilgrims.",
    "Always use the recommend_packages tool before quoting any package, and never invent packages, prices or departure dates.",
    "Whenever the customer reveals their name, phone, budget, pax count or travel month, call update_lead_profile to save it.",
    "When the customer is not ready yet, call schedule_followup to book a polite follow-up.",
    "Qualification checklist you must complete naturally over the conversation (never as a form, one or two questions at a time): name, phone, city, number of pilgrims (pax), preferred travel month, budget per person and package interest. Save each detail with update_lead_profile as soon as you learn it.",
    "ESCALATION RULES: call escalate_to_human only when a human is genuinely needed. Set human_takeover=true ONLY when the customer EXPLICITLY asks to speak to a person ('nak bercakap dengan manusia/staff/agent', 'sambungkan saya dengan staf', 'saya nak orang sebenar') — that pauses the AI. Booking intent ('saya serius nak booking', 'apa langkah seterusnya', 'nak daftar', 'nak proceed', 'nak ambil pakej ni') is SALES INTENT, never a takeover: use human_takeover=false so staff are flagged while you keep selling. Never stop replying to the customer.",
    "A knowledge gap, a missing package, missing Mutawwif info, booking verification (availability, deposit, terms, pricing) or any missing agency data is NEVER a takeover. Keep AI enabled, answer what is verified, and ask a useful clarifying question.",
    "TRUTHFULNESS — NO FALSE ACTION CLAIMS (highest priority). You may NEVER claim that anything happened outside this chat unless a tool call in THIS conversation returned a persisted record proving it. Forbidden unless proven: 'saya sudah hantar kepada staf', 'staf sedang semak', 'staf akan hubungi tuan/puan', 'saya sudah buat booking', 'saya sudah reserve tempat', 'saya sudah semak dengan agensi', 'saya sudah minta pihak agensi mengesahkan'. Never invent a staff reply, availability, seat, deposit, flight, hotel, Mutawwif or price.",
    "If no handoff has actually been executed, say truthfully: 'Saya boleh tandakan permintaan ini untuk pengesahan pihak agensi. Buat masa ini saya belum boleh mengesahkan kekosongan, deposit, terma atau Mutawwif tanpa pengesahan rasmi.'",
    "To really notify the team, call request_human_handoff. Only after it returns handoff_recorded=true (with a reference and timestamp) may you tell the customer that the request has been sent to the agency team. Never promise a response time the tool did not give you.",
    "BOOKING ASSIST MODE: when the customer shows real purchase intent ('nak booking', 'nak daftar', 'macam mana nak tempah', 'nak proceed', 'boleh book?'), (1) confirm the package/date if known from recommend_packages, (2) confirm number of pilgrims, (3) identify missing critical info (nama penuh, no. telefon, bandar, bulan, bajet, bilangan jemaah), (4) use only verified agency/package data, (5) never invent availability, deposit, flights, hotels, Mutawwif or pricing, (6) if verified data exists explain the next step clearly, (7) if verification is needed call request_human_handoff and say truthfully what was recorded, (8) never request payment or bank details before verified official booking instructions exist, (9) keep momentum — end with a question or a concrete next step, never abruptly.",
    "Every customer message must receive a reply: an answer, a clarifying question, a safe fallback, or an explicit human-handoff message. Silence is never acceptable.",
    "Never promise visas, guarantees or refunds outside the listed inclusions.",

    businessHoursLine(s),
    s?.ai_custom_instructions?.trim()
      ? `Agency custom instructions (highest priority, never break platform safety rules):\n${s.ai_custom_instructions.trim()}`
      : null,
    ctx.knowledge.length
      ? `Agency knowledge base index (use search_knowledge to read the full text):\n${ctx.knowledge
          .map((a) => `- [${a.category}] ${a.title}${a.summary ? ` — ${a.summary}` : ""}`)
          .join("\n")}`
      : "The agency knowledge base is empty. You can still answer questions about UMRAIO itself from global UMRAIO knowledge, and you can still qualify the lead. Only agency-specific facts need confirmation from the agency.",
    `Global UMRAIO knowledge index (platform facts, always available via search_knowledge):\n${GLOBAL_UMRAIO_KNOWLEDGE.map((a) => `- ${a.title} — ${a.summary}`).join("\n")}`,

    ctx.lead
      ? `Known lead profile: ${JSON.stringify(ctx.lead)}`
      : "No lead profile linked yet to this conversation.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type LeadSignals = {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  budget_myr?: number | string | null;
  pax?: number | null;
  preferred_month?: string | null;
  package_interest?: string | null;
  stage?: string | null;
};

/** Deterministic 0-100 qualification score from captured signals. */
export function computeLeadScore(lead: LeadSignals): number {
  let score = 10;
  if (lead.full_name && lead.full_name.trim().length > 2) score += 10;
  if (lead.phone) score += 10;
  if (lead.city) score += 8;
  if (lead.pax && Number(lead.pax) > 0) score += 12;
  if (lead.preferred_month) score += 15;
  if (lead.budget_myr && Number(lead.budget_myr) > 0) score += 20;
  if (lead.package_interest) score += 15;
  if (lead.stage === "proposal") score += 5;
  if (lead.stage === "booked") score = 100;
  return Math.max(0, Math.min(100, score));
}

export function temperatureForScore(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

/**
 * Deterministic guard: only an EXPLICIT request to speak with a person may pause
 * the AI. Booking intent, knowledge gaps and verification needs must never do so.
 */
const EXPLICIT_HUMAN_PATTERNS: RegExp[] = [
  /\b(cakap|bercakap|bincang|berbual|contact|hubungi|sambung(kan)?|talk|speak|chat)\b[^.?!]{0,40}\b(manusia|human|staff|staf|agent|ejen|orang(\s+sebenar)?|person|admin|pegawai|manager|pengurus|customer service|cs)\b/i,
  /\b(staff|staf|agent|ejen|admin|manusia|human|orang)\b[^.?!]{0,30}\b(call|telefon|hubungi|whatsapp|contact)\b[^.?!]{0,20}\b(saya|aku|me|i)\b/i,
  /\b(real|live)\s+(person|agent|human)\b/i,
  /\bnak\s+(cakap|bercakap)\s+dengan\b/i,
  /\btransfer\s+(me\s+)?to\s+(a\s+)?(human|agent|staff|person)\b/i,
];

export function isExplicitHumanRequest(text: string | null | undefined): boolean {
  if (!text) return false;
  return EXPLICIT_HUMAN_PATTERNS.some((re) => re.test(text));
}

function customerAskedForHuman(ctx: Awaited<ReturnType<typeof loadContext>>): boolean {
  const recentCustomer = ctx.messages
    .filter((m) => m.sender === "customer")
    .slice(-3)
    .map((m) => m.body);
  return recentCustomer.some(isExplicitHumanRequest);
}

function buildTools(supabase: Db, ctx: Awaited<ReturnType<typeof loadContext>>) {
  const agencyId = ctx.conversation.agency_id as string;
  const leadId = ctx.conversation.lead_id as string | null;

  return {
    search_knowledge: tool({
      description:
        "Search knowledge. Returns `agency` results (this agency's verified FAQ, travel guide, package/visa/hotel info, uploaded PDFs) and `global` results (official facts about the UMRAIO platform itself). Call this before answering any factual question.",
      inputSchema: z.object({
        query: z.string(),
        category: z
          .enum(["faq", "travel_guide", "package_info", "visa_info", "hotel_info", "general"])
          .nullable(),
      }),
      execute: async ({ query, category }) => {
        const limit = ctx.settings?.kb_max_articles ?? 4;
        const agencyResults = searchKnowledge(ctx.knowledge, query, category, limit);
        const globalResults = searchGlobalKnowledge(query, limit);
        await supabase.from("activity_log").insert({
          agency_id: agencyId,
          actor: "ai",
          action: "AI knowledge lookup",
          entity: "conversation",
          entity_id: ctx.conversation.id,
          meta: {
            knowledge_source: agencyResults.length
              ? "agency"
              : globalResults.length
                ? "global"
                : "none",
            agency_hits: agencyResults.length,
            global_hits: globalResults.length,
          },
        });
        return {
          agency: agencyResults,
          global: globalResults,
          note: agencyResults.length
            ? undefined
            : "No agency-specific knowledge matched. Global UMRAIO knowledge may still answer questions about the platform. Do not fabricate agency facts.",
        };
      },
    }),


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
      description:
        "Save qualification details collected during the conversation onto the CRM lead (name, phone, city, pax, preferred month, budget, package interest).",
      inputSchema: z.object({
        full_name: z.string().nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        city: z.string().nullable(),
        budget_myr: z.number().nullable(),
        pax: z.number().nullable(),
        preferred_month: z.string().nullable(),
        package_interest: z.string().nullable(),
        temperature: z.enum(["hot", "warm", "cold"]).nullable(),
        stage: z.enum(["new", "contacted", "qualified", "proposal", "booked", "lost"]).nullable(),
      }),
      execute: async (input) => {
        if (!leadId) return { saved: false, reason: "No lead linked to this conversation." };
        const patch: Record<string, unknown> = { last_contact_at: new Date().toISOString() };
        for (const [k, v] of Object.entries(input)) if (v !== null && v !== "") patch[k] = v;

        const merged = { ...(ctx.lead ?? {}), ...patch } as LeadSignals;
        const score = computeLeadScore(merged);
        patch["score"] = score;
        if (!patch["temperature"]) patch["temperature"] = temperatureForScore(score);
        if (!patch["stage"] && (merged.pax || merged.budget_myr || merged.preferred_month)) {
          patch["stage"] = "qualified";
        }

        const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
        if (error) return { saved: false, reason: error.message };
        await supabase.from("activity_log").insert({
          agency_id: agencyId,
          actor: "ai",
          action: `AI WhatsApp Executive qualified lead (score ${score}, ${patch["temperature"]})`,
          entity: "lead",
          entity_id: leadId,
          meta: patch,
        });
        return { saved: true, score, temperature: patch["temperature"], fields: Object.keys(patch) };
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
        await supabase.from("activity_log").insert({
          agency_id: agencyId,
          actor: "ai",
          action: `Scheduled follow-up: ${title}`,
          entity: "lead",
          entity_id: leadId,
          meta: { run_at: runAt.toISOString(), channel: "whatsapp" },
        });
        return { scheduled: true, run_at: runAt.toISOString() };
      },
    }),
    escalate_to_human: tool({
      description:
        "Flag that a human colleague should look at this conversation. Set human_takeover=true ONLY for an explicit request for a human, an upset customer, or a sensitive transaction (payment, refund, contract, discount approval) — that pauses the AI. For a simple knowledge gap use human_takeover=false: the team is notified but you keep helping the customer.",
      inputSchema: z.object({
        reason: z.string(),
        urgency: z.enum(["low", "normal", "high"]),
        human_takeover: z
          .boolean()
          .describe("true only for an explicit human takeover or a sensitive transaction"),
      }),
      execute: async ({ reason, urgency, human_takeover }) => {
        const now = new Date().toISOString();
        // Deterministic guard: the model may only pause the AI when the customer
        // explicitly asked for a person. Booking intent / verification never pauses it.
        const requested = customerAskedForHuman(ctx);
        const takeover = human_takeover && requested;
        const patch: Record<string, unknown> = {
          status: "open",
          escalated_at: now,
          escalation_reason: reason,
          human_attention_required: true,
        };
        // Non-destructive by default: knowledge gaps and booking intent never silence the AI.
        if (takeover) patch["ai_enabled"] = false;
        await supabase.from("conversations").update(patch).eq("id", ctx.conversation.id);
        await supabase.from("followup_jobs").insert({
          agency_id: agencyId,
          lead_id: leadId,
          title: takeover
            ? `Human takeover needed: ${reason}`
            : `Human attention requested: ${reason}`,
          channel: "whatsapp",
          run_at: new Date(Date.now() + (urgency === "high" ? 15 : 60) * 60_000).toISOString(),
          status: "pending",
        });
        await supabase.from("activity_log").insert({
          agency_id: agencyId,
          actor: "ai",
          action: takeover
            ? `Human takeover activated on WhatsApp conversation (${urgency})`
            : `Human attention requested on WhatsApp conversation (${urgency})`,
          entity: "conversation",
          entity_id: ctx.conversation.id,
          meta: {
            reason,
            urgency,
            human_takeover: takeover,
            requested_takeover: human_takeover,
            explicit_human_request: requested,
            ai_remains_enabled: !takeover,
            decision: takeover ? "human_takeover" : "human_attention_required",
          },
        });
        return {
          escalated: true,
          human_takeover: takeover,
          ai_still_enabled: !takeover,
          downgraded: human_takeover && !takeover,
          instruction: takeover
            ? "Tell the customer politely that a human colleague will continue shortly, then stop."
            : "AI stays active. A colleague has been notified. Keep helping the customer normally: say truthfully that final booking details (availability, deposit, terms) need agency confirmation, and continue qualifying (preferred month, number of pilgrims, budget).",
        };
      },

    }),

    request_human_handoff: tool({
      description:
        "Really send a verification/booking request to the agency team. Persists a notification, a follow-up task and an activity record. Only after this returns handoff_recorded=true may you tell the customer that the request has been sent. Never claim a handoff without calling this.",
      inputSchema: z.object({
        request: z.string().describe("What the team must verify or action, in one sentence"),
        topic: z.enum([
          "availability",
          "pricing",
          "deposit",
          "mutawwif",
          "booking",
          "documents",
          "other",
        ]),
        urgency: z.enum(["low", "normal", "high"]),
      }),
      execute: async ({ request, topic, urgency }) => {
        const now = new Date();
        const reference = `HO-${now.getTime().toString(36).toUpperCase()}`;
        const { error: notifyError } = await supabase.from("notifications").insert({
          agency_id: agencyId,
          kind: "human_handoff",
          severity: urgency === "high" ? "warning" : "info",
          title: `Customer request needs agency verification (${topic})`,
          body: request,
          entity: "conversation",
          entity_id: ctx.conversation.id,
          meta: { reference, topic, urgency, lead_id: leadId },
        });
        if (notifyError) {
          return {
            handoff_recorded: false,
            reason: notifyError.message,
            instruction:
              "The handoff was NOT recorded. Do not tell the customer that anything was sent. Say truthfully that you cannot confirm agency-specific details yet, and continue helping.",
          };
        }
        await supabase.from("followup_jobs").insert({
          agency_id: agencyId,
          lead_id: leadId,
          title: `[${reference}] ${topic}: ${request}`,
          channel: "whatsapp",
          run_at: new Date(now.getTime() + (urgency === "high" ? 15 : 60) * 60_000).toISOString(),
          status: "pending",
        });
        await supabase
          .from("conversations")
          .update({ human_attention_required: true })
          .eq("id", ctx.conversation.id);
        await supabase.from("activity_log").insert({
          agency_id: agencyId,
          actor: "ai",
          action: `Handoff request sent to agency team (${topic})`,
          entity: "conversation",
          entity_id: ctx.conversation.id,
          meta: {
            reference,
            topic,
            urgency,
            request,
            conversation_id: ctx.conversation.id,
            destination: "agency team inbox",
            recorded_at: now.toISOString(),
          },
        });
        return {
          handoff_recorded: true,
          reference,
          recorded_at: now.toISOString(),
          destination: "agency team inbox",
          ai_still_enabled: true,
          instruction:
            "You may now truthfully tell the customer the request was forwarded to the agency team for confirmation (mention the reference if useful). Do not invent a staff reply or a response time. Continue qualifying the lead.",
        };
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
