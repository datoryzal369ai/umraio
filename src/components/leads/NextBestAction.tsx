import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead } from "@/lib/leads";
import {
  INTENT_LABEL,
  INTENT_TONE,
  REASON_LABEL,
  fetchLeadOpportunity,
} from "@/lib/sales-opportunities";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/i18n/dict";
import { nextBestActionCopy } from "@/lib/i18n/app/leads.i18n";

/** Advisory only. Nothing here writes to the database or executes an AI action. */
export function NextBestAction({ lead }: { lead: Lead }) {
  const t = useCopy(nextBestActionCopy);
  const query = useQuery({
    queryKey: ["lead-opportunity", lead.id, lead.score, lead.stage, lead.last_contact_at],
    queryFn: () => fetchLeadOpportunity(lead),
  });

  const opp = query.data;

  return (
    <section aria-labelledby="next-action-heading" className="panel p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
          <Compass aria-hidden="true" className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 id="next-action-heading" className="text-base font-semibold">
            {t.heading}
          </h2>
          <p className="text-xs text-muted-foreground">{t.subheading}</p>
        </div>
        {opp ? (
          <Badge className={cn("ml-auto shrink-0 border-0", INTENT_TONE[opp.intent])}>
            {INTENT_LABEL[opp.intent]} · {lead.score}
          </Badge>
        ) : null}
      </div>

      {query.isLoading ? (
        <Skeleton className="mt-4 h-16 rounded-xl" />
      ) : query.isError || !opp ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.couldNotDerive}</p>
      ) : (
        <>
          <p className="mt-4 flex items-start gap-2 text-sm">
            <ArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{opp.nextAction}</span>
          </p>

          {opp.reasons.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {opp.reasons.map((reason) => (
                <li
                  key={reason}
                  className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {REASON_LABEL[reason]}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {opp.pendingFollowupAt
                ? t.followUpScheduledFor(new Date(opp.pendingFollowupAt).toLocaleString())
                : t.noPendingFollowUp}
            </span>
            {opp.humanAttention ? (
              <Badge className="border-0 bg-chart-4/15 text-chart-4">{t.humanAttentionRequired}</Badge>
            ) : null}
            {opp.aiPaused ? (
              <Badge className="border-0 bg-destructive/15 text-destructive">{t.aiPaused}</Badge>
            ) : null}
          </div>

          {opp.conversationId ? (
            <Button asChild size="sm" variant="outline" className="mt-3 min-h-9">
              <Link
                to="/conversations/$conversationId"
                params={{ conversationId: opp.conversationId }}
              >
                {t.openConversation}
              </Link>
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
