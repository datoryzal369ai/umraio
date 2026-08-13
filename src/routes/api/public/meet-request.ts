import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * MEET YOUR AI BUSINESS EXECUTIVE™ — demonstration lead capture.
 *
 * Writes ONLY to the isolated `demo_requests` store. No tenant CRM record is
 * created from the public site, and (email, intent) is unique so a repeat
 * submission updates the existing record instead of duplicating it.
 */

const bodySchema = z.object({
  intent: z.enum(["trial", "demo", "human"]),
  full_name: z.string().trim().min(1).max(120),
  agency_name: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email().max(200),
  whatsapp: z.string().trim().max(40).optional().default(""),
  agency_size: z.string().trim().max(60).optional().default(""),
  monthly_enquiries: z.string().trim().max(60).optional().default(""),
  snapshot: z.record(z.string(), z.unknown()).optional().default({}),
});

export const Route = createFileRoute("/api/public/meet-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Please check the details and try again." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error } = await supabaseAdmin.from("demo_requests").upsert(
          {
            intent: body.intent,
            full_name: body.full_name,
            agency_name: body.agency_name || null,
            email: body.email.toLowerCase(),
            whatsapp: body.whatsapp || null,
            agency_size: body.agency_size || null,
            monthly_enquiries: body.monthly_enquiries || null,
            snapshot: body.snapshot as never,
            source: "meet_executive",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email,intent", ignoreDuplicates: false },
        );

        if (error) {
          return Response.json(
            { error: "We could not record your request. Please try again." },
            { status: 500 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
