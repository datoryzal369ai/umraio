import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Gauge,
  MessageCircle,
  TicketCheck,
  Timer,
  UserPlus,
  UserRoundCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchWhatsappExecutiveStats,
  formatResponseTime,
} from "@/lib/whatsapp-executive";
import { useCopy } from "@/lib/i18n/dict";
import { shellCopy } from "@/lib/i18n/app/shell.i18n";
import { cn } from "@/lib/utils";

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        <span className="text-[11px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function WhatsappExecutiveCard() {
  const t = useCopy(shellCopy).whatsappExecutive;
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-executive-stats"],
    queryFn: fetchWhatsappExecutiveStats,
  });

  return (
    <section className="panel relative overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border/60 bg-surface p-2">
            <MessageCircle className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{t.title}</h2>
              <Badge className="border-0 bg-success/15 text-success">{t.live}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/conversations">{t.openInbox}</Link>
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Metric
              icon={MessageCircle}
              label={t.conversationsToday}
              value={String(data.conversationsToday)}
            />
            <Metric
              icon={Gauge}
              label={t.aiReplyRate}
              value={`${data.aiReplyRate.toFixed(0)}%`}
              hint={t.aiReplyRateHint}
            />
            <Metric
              icon={UserRoundCog}
              label={t.humanTakeovers}
              value={String(data.humanTakeovers)}
              hint={t.awaitingStaff.replace("{count}", String(data.openEscalations))}
            />
            <Metric icon={UserPlus} label={t.leadsGenerated} value={String(data.leadsGenerated)} />
            <Metric
              icon={TicketCheck}
              label={t.bookingsGenerated}
              value={String(data.bookingsGenerated)}
            />
            <Metric
              icon={Timer}
              label={t.responseTime}
              value={formatResponseTime(data.avgResponseMs)}
              hint={t.responseTimeHint}
            />
          </div>
          <p
            className={cn(
              "mt-4 flex items-center gap-2 text-xs",
              data.openEscalations > 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <BadgeCheck className="size-3.5" />
            {data.openEscalations > 0
              ? t.escalatedWaiting.replace("{count}", String(data.openEscalations))
              : t.noEscalations}
          </p>
        </>
      )}
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
    </section>
  );
}
