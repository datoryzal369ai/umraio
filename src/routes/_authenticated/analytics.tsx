import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, Bot, Flame, Percent, TrendingUp, Wallet } from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  BookingTrendChart,
  ConversionFunnelChart,
  FollowupPerformanceChart,
  LeadSourceChart,
  RevenueConversionChart,
  TopPackagesChart,
} from "@/components/dashboard/AnalyticsCharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { myr } from "@/lib/dashboard";
import {
  RANGES,
  fetchAnalytics,
  followupSeries,
  funnelSeries,
  sourceSeries,
  summary,
  topPackages,
  trendSeries,
  type AnalyticsData,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "AI Analytics — UMRAIO AI Sales Executive" },
      {
        name: "description",
        content:
          "Conversion rate, top Umrah packages, lead sources, booking trends, sales and follow-up performance in one AI analytics dashboard.",
      },
      { property: "og:title", content: "AI Analytics — UMRAIO AI Sales Executive" },
      {
        property: "og:description",
        content: "Measure AI-driven Umrah sales: conversion, packages, sources and follow-ups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5", className)}>
      <header className="mb-4">
        <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

function AnalyticsPage() {
  const [range, setRange] = useState<string>("180");
  const days = Number(range);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", days],
    queryFn: () => fetchAnalytics(days),
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="AI Analytics"
        description="How your AI Sales Executive turns Umrah enquiries into confirmed pilgrims."
        actions={
          <div
            role="group"
            aria-label="Date range"
            className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface p-1"
          >
          {RANGES.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={range === option.value ? "secondary" : "ghost"}
              className="text-xs"
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
          </div>
        }
      />

      {isLoading || !data ? <AnalyticsSkeleton /> : <AnalyticsBody data={data} days={days} />}
    </div>
  );
}

function AnalyticsBody({ data, days }: { data: AnalyticsData; days: number }) {
  const stats = summary(data);
  const funnel = funnelSeries(data);
  const sources = sourceSeries(data);
  const packages = topPackages(data);
  const trend = trendSeries(data, days);
  const followups = followupSeries(data, days);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Percent}
          label="Conversion rate"
          value={`${stats.conversion.toFixed(1)}%`}
          hint={`${stats.booked} booked of ${stats.totalLeads} leads`}
        />
        <KpiCard
          icon={Wallet}
          label="Revenue"
          value={myr(stats.revenue)}
          hint={`Avg deal ${myr(Math.round(stats.avgDeal))}`}
        />
        <KpiCard
          icon={Bot}
          label="AI handled"
          value={`${Math.round(stats.aiShare)}%`}
          hint={`${stats.aiMessages} AI replies sent`}
        />
        <KpiCard
          icon={BadgeCheck}
          label="Follow-up completion"
          value={`${Math.round(stats.followupRate)}%`}
          hint={`${stats.followupsSent} sent`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Sales performance"
          description="Revenue against lead-to-booking conversion per month."
        >
          <RevenueConversionChart data={trend} />
        </Panel>
        <Panel title="Lead source" description="Where your enquiries come from.">
          <LeadSourceChart data={sources} />
          <ul className="mt-3 space-y-1.5">
            {sources.slice(0, 5).map((source) => (
              <li key={source.source} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{source.source}</span>
                <span className="font-semibold">
                  {source.leads} · {source.rate}% booked
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Conversion funnel" description="Leads reaching each pipeline stage.">
          <ConversionFunnelChart data={funnel} />
        </Panel>
        <Panel title="Booking trend" description="Confirmed bookings and pilgrims per month.">
          <BookingTrendChart data={trend} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top packages" description="Best performing packages by revenue.">
          {packages.length ? (
            <>
              <TopPackagesChart data={packages} />
              <ul className="mt-3 space-y-1.5">
                {packages.map((pkg) => (
                  <li key={pkg.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-muted-foreground">{pkg.name}</span>
                    <span className="shrink-0 font-semibold">
                      {pkg.bookings} bookings · {myr(pkg.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No bookings in this period yet.
            </p>
          )}
        </Panel>
        <Panel title="Follow-up performance" description="Sent, pending and skipped AI follow-ups.">
          <FollowupPerformanceChart data={followups} />
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="size-3.5 text-primary" />
            {stats.hotLeads} hot leads currently need attention
            <TrendingUp className="ml-auto size-3.5 text-primary" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
