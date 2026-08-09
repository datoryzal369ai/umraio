import { createFileRoute } from "@tanstack/react-router";

const STEPS = [
  "Apakah UMRAIO sebenarnya?",
  "UMRAIO boleh bantu apa?",
  "Saya serius nak booking. Apa langkah seterusnya?",
  "Salam",
  "Saya nak tanya lagi",
  "Saya nak bercakap dengan staff",
  "Heloooo",
];

export const Route = createFileRoute("/api/public/_regress")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { generateAgentReply } = await import("@/lib/sales-ai.server");

        const { data: agency } = await supabaseAdmin
          .from("agencies")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (!agency) return Response.json({ error: "no agency" }, { status: 500 });

        const { data: conv, error } = await supabaseAdmin
          .from("conversations")
          .insert({
            agency_id: agency.id,
            channel: "whatsapp",
            external_id: `regress-${Date.now()}`,
            status: "open",
            ai_enabled: true,
          })
          .select("id")
          .single();
        if (error || !conv) return Response.json({ error: String(error) }, { status: 500 });

        const results: unknown[] = [];
        for (const [i, body] of STEPS.entries()) {
          const { data: before } = await supabaseAdmin
            .from("conversations")
            .select("ai_enabled, human_attention_required")
            .eq("id", conv.id)
            .single();
          await supabaseAdmin
            .from("messages")
            .insert({ agency_id: agency.id, conversation_id: conv.id, sender: "customer", body });

          let reply: string | null = null;
          let skipped = false;
          if (before?.ai_enabled) {
            reply = await generateAgentReply(supabaseAdmin as never, conv.id);
            await supabaseAdmin
              .from("messages")
              .insert({
                agency_id: agency.id,
                conversation_id: conv.id,
                sender: "ai",
                body: reply,
              });
          } else {
            skipped = true;
          }

          const { data: after } = await supabaseAdmin
            .from("conversations")
            .select("ai_enabled, human_attention_required, status")
            .eq("id", conv.id)
            .single();
          results.push({
            t: `T${i + 1}`,
            input: body,
            ai_enabled_before: before?.ai_enabled,
            replied: !skipped,
            reply: reply?.slice(0, 160) ?? null,
            after,
          });
        }
        return Response.json({ conversation_id: conv.id, results });
      },
    },
  },
});
