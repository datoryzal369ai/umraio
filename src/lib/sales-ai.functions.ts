import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateAgentReply, generateInsights } from "./sales-ai.server";

export const aiReplyToConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => {
    if (!input?.conversationId) throw new Error("conversationId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    try {
      const reply = await generateAgentReply(context.supabase, data.conversationId);
      return { reply, errorCode: null };
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? Number(error.statusCode)
          : undefined;
      const message = error instanceof Error ? error.message : "";

      if (statusCode === 402 || message.includes("Payment Required")) {
        return { reply: null, errorCode: "AI_CREDITS_EXHAUSTED" as const };
      }

      throw error;
    }
  });

export const conversationInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => {
    if (!input?.conversationId) throw new Error("conversationId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    return await generateInsights(context.supabase, data.conversationId);
  });
