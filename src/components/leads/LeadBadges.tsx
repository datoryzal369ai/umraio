import { cn } from "@/lib/utils";
import type { LeadStage, LeadTemperature } from "@/lib/leads";

const stageStyles: Record<LeadStage, string> = {
  new: "bg-muted text-muted-foreground",
  contacted: "bg-primary/10 text-primary",
  qualified: "bg-primary/20 text-primary",
  negotiation: "bg-accent/20 text-accent-foreground",
  booked: "bg-primary text-primary-foreground",
  completed: "bg-primary/30 text-primary",
  lost: "bg-destructive/15 text-destructive",
};

const tempStyles: Record<LeadTemperature, string> = {
  hot: "bg-destructive/15 text-destructive border-destructive/30",
  warm: "bg-primary/15 text-primary border-primary/30",
  cold: "bg-muted text-muted-foreground border-border",
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        stageStyles[stage] ?? stageStyles.new,
      )}
    >
      {stage}
    </span>
  );
}

export function TemperatureBadge({ value }: { value: LeadTemperature }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        tempStyles[value] ?? tempStyles.warm,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags?.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
