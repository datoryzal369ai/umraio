import { BrainCircuit, BotMessageSquare, Clock3, TrendingUp, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type Metric = {
  value: string;
  label: string;
  micro: string;
  icon: React.ElementType;
};

const metrics: Metric[] = [
  {
    value: "24/7",
    label: "Always working",
    micro: "Your AI workforce never sleeps.",
    icon: Clock3,
  },
  {
    value: "3×",
    label: "More leads",
    micro: "Instant, intelligent engagement.",
    icon: TrendingUp,
  },
  {
    value: "85%",
    label: "Time saved",
    micro: "Repetitive work runs itself.",
    icon: Zap,
  },
  {
    value: "100%",
    label: "AI-powered",
    micro: "Always learning, always improving.",
    icon: BrainCircuit,
  },
];

function MetricModule({ metric, index }: { metric: Metric; index: number }) {
  const Icon = metric.icon;
  return (
    <div
      className={cn(
        "umr-reveal group relative flex min-w-0 flex-col rounded-2xl text-left border border-border/60 bg-surface/40 p-4 transition-colors duration-300 hover:border-primary/35 sm:p-6",
      )}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="umr-metric-ring grid size-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 sm:size-11">
          <Icon className="size-4 text-primary sm:size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold leading-none tracking-tight text-primary sm:text-4xl">
            {metric.value}
          </p>
          <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-foreground/80 sm:text-[11px]">
            {metric.label}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-light leading-relaxed text-muted-foreground sm:text-xs">
        {metric.micro}
      </p>
    </div>
  );
}

/** Premium AI workforce intelligence panel: four performance signals around one AI core. */
export function WorkforceMetrics({ className }: { className?: string }) {
  return (
    <section
      aria-label="UMRAIO AI workforce performance signals"
      className={cn("umr-reveal panel relative w-full overflow-hidden p-5 sm:p-8", className)}
      style={{ animationDelay: "360ms" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 50%, rgba(0,215,255,0.10), transparent 72%)",
        }}
      />

      <div className="relative flex items-center justify-center gap-3">
        <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
        <p className="text-[9px] font-medium uppercase tracking-[0.32em] text-primary/85 sm:text-[10px]">
          UMRAIO<sup className="align-super text-[0.6em] leading-none">®</sup> AI Workforce
        </p>
        <span aria-hidden className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6">
        {/* signal lines toward the core (desktop/tablet only) */}
        <span
          aria-hidden
          className="umr-signal-line pointer-events-none absolute left-1/2 top-1/2 hidden h-px w-[26%] -translate-x-full -translate-y-1/2 sm:block"
        />
        <span
          aria-hidden
          className="umr-signal-line pointer-events-none absolute left-1/2 top-1/2 hidden h-px w-[26%] -translate-y-1/2 sm:block"
        />

        <MetricModule metric={metrics[0]!} index={0} />
        <MetricModule metric={metrics[1]!} index={1} />
        <MetricModule metric={metrics[2]!} index={2} />
        <MetricModule metric={metrics[3]!} index={3} />

        {/* central AI intelligence hub */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="umr-hub grid size-11 place-items-center rounded-full border border-primary/40 bg-background/90 shadow-[0_0_28px_-6px_var(--color-primary)] sm:size-16">
            <BotMessageSquare className="size-5 text-primary sm:size-7" />
          </span>
        </span>
      </div>
    </section>
  );
}
