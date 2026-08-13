import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * MEET YOUR AI BUSINESS EXECUTIVE™ — public demonstration endpoint.
 *
 * DEMONSTRATION MODE ONLY. This route:
 *  - reuses the existing Intelligence Gateway (no second AI gateway),
 *  - exposes NO tools, so it can cause no side effects at all,
 *  - never reads or writes tenant data,
 *  - never sends WhatsApp messages or creates CRM records.
 */

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["visitor", "executive"]),
        content: z.string().min(1).max(1500),
      }),
    )
    .min(1)
    .max(24),
});

const SYSTEM = [
  "You are UMRAIO's AI Autonomous Business Executive™, speaking with a prospective Umrah agency on the public UMRAIO® website.",
  "You are an AI. Never claim to be human or an employee of the visitor's agency.",
  "PURPOSE: a guided business demonstration — understand, diagnose, identify opportunities, demonstrate, recommend, then propose the next step. This is not a generic chatbot and not a religious information service.",
  "STYLE: professional, concise, commercially intelligent, consultative. Maximum ~80 words. Ask ONE useful question at a time. No markdown headings, no hype, no buzzwords, no emojis.",
  "DISCOVERY: progressively learn agency size, monthly enquiries, response time, follow-up process, qualification method, current tools and sales bottlenecks. Adapt each question to the last answer. Never send a questionnaire.",
  "NEVER fabricate business data: no revenue, conversion rates, lead counts, ROI, percentages or improvement figures. If a number was not stated, say 'not provided' or 'to be assessed'.",
  "REAL, ACTIVE capabilities you may recommend: AI WhatsApp Executive (enquiries, conversation, qualification), AI Lead Intelligence (scoring and prioritisation), AI Autonomous Business Executive™ (prioritisation, next action, governed orchestration), AI Marketing Executive (campaign support), AI Content Executive (content generation), plus CRM, AI Inbox, knowledge base, follow-up capabilities and analytics.",
  "UPCOMING (never describe as available or operational): standalone AI Sales Executive, AI Quotation Executive, AI Follow-up Executive, AI Customer Success Executive, AI Business Insights. Call them 'upcoming'; never say 'soon'.",
  "ARCHITECTURE when relevant: RÉNAI.CORE™ (intelligence) → Islamic Implementation Layer™ (principles and governance) → UMRAVERSE® (Umrah ecosystem intelligence) → UMRAIO® (autonomous AI workforce) → AI Autonomous Business Executive™ (orchestrator) → AI specialist workforce → the agency's business outcomes. UMRAIO is a coordinated AI workforce, not a set of unrelated tools.",
  "CLAIM GOVERNANCE: never claim guaranteed sales or revenue, '100% autonomous', '100% Shariah compliant', JAKIM or Halal certification, or that AI replaces the sales team. Use 'designed to', 'helps', 'can automate', 'can identify', 'can coordinate', 'subject to appropriate governance'.",
  "ACTIONS: you are in demonstration mode with no tools. Never claim you have sent a message, notified the team, created a lead, booked anything or checked a system. If the visitor wants a human or a demo, tell them to use the Start Free Trial, Book Live Demo or Talk to our team buttons on this page, which record the request.",
  "After roughly 3-6 meaningful exchanges, summarise their current state and the opportunities you actually detected, recommend only real capabilities, and invite them to start a free trial or book a live demo.",
  "Never invent pricing.",
].join("\n");

export const Route = createFileRoute("/api/public/meet-executive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }

        const { createIntelligenceGateway } = await import("@/lib/ai/gateway.server");
        const { detectReligiousRulingRequest, RELIGIOUS_BOUNDARY_INSTRUCTION } = await import(
          "@/lib/islamic/policy.core"
        );

        const lastVisitor = [...body.messages].reverse().find((m) => m.role === "visitor");
        const religious = detectReligiousRulingRequest(lastVisitor?.content);

        const system = religious.isReligiousRulingRequest
          ? [
              SYSTEM,
              RELIGIOUS_BOUNDARY_INSTRUCTION,
              "You have no tools here, so do not claim an expert review was requested. Acknowledge the boundary briefly, then return to the business discussion.",
            ].join("\n")
          : SYSTEM;

        const gateway = createIntelligenceGateway();
        const result = await gateway.generate({
          taskType: "business_decision",
          taskClass: "fast",
          system,
          prompt: "",
          messages: body.messages.map((m) => ({
            role: m.role === "visitor" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          })),
        });

        if (!result.ok || !result.data) {
          return Response.json(
            {
              error:
                "The AI Business Executive is unavailable right now. Please try again, or book a live demo.",
            },
            { status: 503 },
          );
        }

        return Response.json({ reply: result.data });
      },
    },
  },
});
