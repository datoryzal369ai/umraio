import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Bot,
  CalendarClock,
  Flame,
  MailWarning,
  MessageSquare,
  Percent,
  TicketCheck,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MonthlyAnalyticsChart, SalesPerformanceChart } from "@/components/dashboard/Charts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchDashboard,
  monthlySeries,
  myr,
  startOfToday,
  type DashboardData,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — UMRAIO AI Sales Executive" },
      {
        name: "description",
        content:
          "Live Umrah sales command centre: today's leads, conversations, bookings, conversion rate, hot leads and AI follow-up tasks.",
      },
      { property: "og:title", content: "Dashboard — UMRAIO AI Sales Executive" },
      {
        property: "og:description",
        content: "Track leads, conversations, bookings and AI follow-ups in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return mins >= 0 ? `${Math.max(mins, 1)}m ago` : `in ${-mins}m`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return hours >= 0 ? `${hours}h ago` : `in ${-hours}h`;
  const days = Math.round(hours / 24);
  return days >= 0 ? `${days}d ago` : `in ${-days}d`;
};

const stageTone: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  contacted: "bg-chart-3/15 text-chart-3",
  qualified: "bg-primary/15 text-primary",
  proposal: "bg-chart-4/15 text-chart-4",
  booked: "bg-success/15 text-success",
  lost: "bg-destructive/15 text-destructive",
};

function Dashboard() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, agencies(name, plan)")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user?.id),
    queryFn: fetchDashboard,
  });

  const agency = profileQuery.data?.agencies as { name: string; plan: string } | null | undefined;
  const verified = Boolean(user?.email_confirmed_at);

  async function resendVerification() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
    else toast.success("Verification email sent.");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow={agency?.name ?? "Your agency"}
        title={`Welcome${profileQuery.data?.full_name ? `, ${profileQuery.data.full_name.split(" ")[0]}` : ""}`}
        description="Here is what your AI Sales Executive handled today."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <Bot className="size-4 text-primary" />
            <span className="text-xs font-medium">AI active · {agency?.plan ?? "trial"} plan</span>
          </div>
        }
      />

      {!verified ? (
        <div className="panel flex flex-col gap-3 border-primary/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Verify your email address</p>
              <p className="text-sm text-muted-foreground">
                Confirm {user?.email} to unlock full workspace access.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={resendVerification}>
            Resend email
          </Button>
        </div>
      ) : null}

      {dashboardQuery.isLoading || !dashboardQuery.data ? (
        <LoadingState />
      ) : (
        <DashboardBody data={dashboardQuery.data} />
      )}
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const today = startOfToday().getTime();
  const isToday = (iso?: string | null) => Boolean(iso && new Date(iso).getTime() >= today);

  const todaysLeads = data.leads.filter((l) => isToday(l.created_at));
  const todaysConversations = data.conversations.filter((c) => isToday(c.last_message_at));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthBookings = data.bookings.filter((b) => new Date(b.created_at).getTime() >= monthStart);
  const monthRevenue = monthBookings.reduce((sum, b) => sum + Number(b.amount_myr), 0);
  const bookedLeads = data.leads.filter((l) => l.stage === "booked").length;
  const conversion = data.leads.length ? (bookedLeads / data.leads.length) * 100 : 0;
  const hotLeads = data.leads
    .filter((l) => l.score >= 70 && !["lost", "booked"].includes(l.stage))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const series = monthlySeries(data);
  const aiHandled = data.activities.filter((a) => a.actor === "ai").length;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={UserPlus}
          label="Today's leads"
          value={String(todaysLeads.length)}
          hint={`${data.leads.length} leads in the last 12 months`}
        />
        <KpiCard
          icon={MessageSquare}
          label="Today's conversations"
          value={String(todaysConversations.length)}
          hint={`${data.conversations.filter((c) => c.status === "open").length} open threads`}
        />
        <KpiCard
          icon={TicketCheck}
          label="Bookings this month"
          value={String(monthBookings.length)}
          hint={`${myr(monthRevenue)} booked value`}
        />
        <KpiCard
          icon={Percent}
          label="Conversion rate"
          value={`${conversion.toFixed(1)}%`}
          hint={`${bookedLeads} of ${data.leads.length} leads booked`}
          trend={{ value: `${aiHandled} AI actions`, positive: true }}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <PanelHeader
            icon={TrendingUp}
            title="Sales performance"
            subtitle="Revenue and bookings, last 6 months"
          />
          <div className="mt-4">
            <SalesPerformanceChart data={series} />
          </div>
        </div>

        <div className="panel p-5">
          <PanelHeader icon={Flame} title="Hot leads" subtitle="Score 70+ and still open" />
          <ul className="mt-4 space-y-3">
            {hotLeads.length === 0 ? (
              <Empty text="No hot leads right now." />
            ) : (
              hotLeads.map((lead) => (
                <li key={lead.id} className="rounded-xl border border-border/60 bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{lead.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.pax} pax · {lead.preferred_month ?? "flexible"} ·{" "}
                        {lead.budget_myr ? myr(Number(lead.budget_myr)) : "budget TBD"}
                      </p>
                    </div>
                    <Badge className={cn("shrink-0 border-0", stageTone[lead.stage])}>
                      {lead.stage}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={lead.score} className="h-1.5" />
                    <span className="text-xs font-semibold text-primary">{lead.score}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <PanelHeader
            icon={Activity}
            title="Monthly analytics"
            subtitle="Leads vs bookings trend"
          />
          <div className="mt-4">
            <MonthlyAnalyticsChart data={series} />
          </div>
        </div>

        <div className="panel p-5">
          <PanelHeader
            icon={CalendarClock}
            title="Follow-up tasks"
            subtitle={`${data.followups.length} scheduled`}
          />
          <ul className="mt-4 space-y-2">
            {data.followups.length === 0 ? (
              <Empty text="No follow-ups queued." />
            ) : (
              data.followups.slice(0, 6).map((task) => {
                const overdue = new Date(task.run_at).getTime() < Date.now();
                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface p-3"
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        overdue ? "bg-destructive" : "bg-primary",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {overdue ? "Overdue · " : "Due "}
                        {relative(task.run_at)}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>

      <section className="panel p-5">
        <PanelHeader
          icon={BadgeCheck}
          title="Recent activities"
          subtitle="What the AI and your team did"
        />
        <ul className="mt-4 space-y-1">
          {data.activities.length === 0 ? (
            <Empty text="No activity recorded yet." />
          ) : (
            data.activities.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      item.actor === "ai"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.actor}
                  </span>
                  <p className="truncate text-sm">{item.action}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relative(item.created_at)}
                </span>
              </li>
            ))
          )}
        </ul>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/profile">Manage your profile</Link>
        </Button>
      </section>
    </>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border border-border/60 bg-surface p-2">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <li className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
      {text}
    </li>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
