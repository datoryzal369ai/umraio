// TEMPORARY regression harness — deleted after the run.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/_regress")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { agencyId, turns } = (await request.json()) as {
          agencyId: string;
          turns: string[];
        };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { generateAgentReply } = await import("@/lib/sales-ai.server");

        const { data: conv, error } = await supabaseAdmin
          .from("conversations")
          .insert({ agency_id: agencyId, channel: "web", status: "open", ai_enabled: true })
          .select("id")
          .single();
        if (error || !conv) return Response.json({ error: error?.message }, { status: 500 });

        const out: unknown[] = [];
        for (const t of turns) {
          await supabaseAdmin
            .from("messages")
            .insert({ agency_id: agencyId, conversation_id: conv.id, sender: "customer", body: t });
          const { data: state } = await supabaseAdmin
            .from("conversations")
            .select("ai_enabled")
            .eq("id", conv.id)
            .maybeSingle();
          if (!state?.ai_enabled) {
            out.push({ turn: t, reply: null, ai_enabled: false, note: "AI paused" });
            continue;
          }
          let reply: string | null = null;
          let err: string | null = null;
          try {
            reply = await generateAgentReply(supabaseAdmin as never, conv.id);
          } catch (e) {
            err = e instanceof Error ? e.message : String(e);
          }
          if (reply) {
            await supabaseAdmin.from("messages").insert({
              agency_id: agencyId,
              conversation_id: conv.id,
              sender: "ai",
              body: reply,
            });
          }
          const { data: after } = await supabaseAdmin
            .from("conversations")
            .select("ai_enabled, human_attention_required")
            .eq("id", conv.id)
            .maybeSingle();
          out.push({ turn: t, reply, err, ...after });
        }
        return Response.json({ conversationId: conv.id, out });
      },
    },
  },
});
