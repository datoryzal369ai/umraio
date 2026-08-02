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
    const reply = await generateAgentReply(context.supabase, data.conversationId);
    return { reply };
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
