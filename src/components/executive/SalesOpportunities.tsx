import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "@/lib/i18n/dict";
import { EXECUTIVE_DICT } from "@/lib/i18n/app/executive.i18n";
import {
  INTENT_LABEL,
  INTENT_TONE,
  REASON_LABEL,
  fetchSalesOpportunities,
} from "@/lib/sales-opportunities";
import { relativeTime } from "@/lib/leads";
import { cn } from "@/lib/utils";

export function SalesOpportunities({ limit = 6 }: { limit?: number }) {
  const t = useCopy(EXECUTIVE_DICT).opportunities;
  const query = useQuery({
    queryKey: ["sales-opportunities"],
    queryFn: fetchSalesOpportunities,
    refetchInterval: 120_000,
  });

  const opportunities = query.data ?? [];
  const shown = opportunities.slice(0, limit);

  return (
    <section aria-labelledby="sales-opportunities-heading" className="panel p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-2.5">
            <Target aria-hidden="true" className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 id="sales-opportunities-heading" className="text-base font-semibold">
              {t.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t.subtitle}
            </p>
          </div>
        </div>
        {opportunities.length > 0 ? (
          <Badge className="shrink-0 border-0 bg-primary/15 text-primary">
            {t.detected(opportunities.length)}
          </Badge>
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-destructive">
          {t.loadError}
        </p>
      ) : shown.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          {t.noneDetected}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((opp) => (
            <li
              key={opp.lead.id}
              className="rounded-xl border border-border/60 bg-surface p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {opp.lead.full_name}
                </p>
                <Badge className={cn("shrink-0 border-0", INTENT_TONE[opp.intent])}>
                  {INTENT_LABEL[opp.intent]} · {opp.lead.score}
                </Badge>
              </div>

              <ul className="mt-2 flex flex-wrap gap-1.5">
                {opp.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {REASON_LABEL[reason]}
                  </li>
                ))}
              </ul>

              <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <ArrowRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{opp.nextAction}</span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline" className="min-h-9">
                  <Link to="/leads/$leadId" params={{ leadId: opp.lead.id }}>
                    {t.openLead}
                  </Link>
                </Button>
                {opp.conversationId ? (
                  <Button asChild size="sm" variant="ghost" className="min-h-9">
                    <Link
                      to="/conversations/$conversationId"
                      params={{ conversationId: opp.conversationId }}
                    >
                      {t.openConversation}
                    </Link>
                  </Button>
                ) : null}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {opp.lead.last_contact_at
                    ? t.lastContact(relativeTime(opp.lead.last_contact_at))
                    : t.neverContacted}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {opportunities.length > shown.length ? (
        <div className="mt-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/crm">{t.viewAllInCrm}</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
