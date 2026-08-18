import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadEliteDesk } from "./elite-desk.server";

/** AI SALES ELITE™ desk — live pipeline read, scoped to the caller's agency by RLS. */
export const eliteSalesDesk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await loadEliteDesk(context.supabase);
  });
