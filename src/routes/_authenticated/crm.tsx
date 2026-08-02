import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BellPlus,
  Check,
  Clock,
  ExternalLink,
  GripVertical,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemperatureBadge } from "@/components/leads/LeadBadges";
import { useAuth } from "@/hooks/useAuth";
import {
  LEAD_STAGES,
  STAGE_LABELS,
  addLeadNote,
  completeReminder,
  createReminder,
  deleteLeadNote,
  deleteReminder,
  fetchLeadActivity,
  fetchLeadNotes,
  fetchLeadReminders,
  fetchLeads,
  formatMyr,
  relativeTime,
  updateLeadStage,
  type Lead,
  type LeadStage,
} from "@/lib/leads";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "CRM pipeline — UMRAIO" },
      {
        name: "description",
        content:
          "Drag-and-drop Umrah sales pipeline: new lead, contacted, qualified, negotiation, booked, completed and lost, with notes, tasks and timeline.",
      },
      { property: "og:title", content: "CRM pipeline — UMRAIO" },
      {
        property: "og:description",
        content: "Move every Umrah prospect through your sales pipeline in one board.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="panel p-8 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="panel p-8 text-sm">Not found.</div>,
  component: CrmPage,
});

const stageAccent: Record<LeadStage, string> = {
  new: "bg-muted-foreground/40",
  contacted: "bg-primary/40",
  qualified: "bg-primary/60",
  negotiation: "bg-accent",
  booked: "bg-primary",
  completed: "bg-primary/80",
  lost: "bg-destructive/70",
};

function CrmPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) =>
      [lead.full_name, lead.phone ?? "", lead.email ?? "", ...lead.tags]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [leads, query]);

  const columns = useMemo(
    () =>
      LEAD_STAGES.map((stage) => ({
        stage,
        items: filtered.filter((lead) => lead.stage === stage),
      })),
    [filtered],
  );

  const moveMutation = useMutation({
    mutationFn: ({ lead, stage }: { lead: Lead; stage: LeadStage }) => updateLeadStage(lead, stage),
    onSuccess: async (_data, variables) => {
      toast.success(`${variables.lead.full_name} → ${STAGE_LABELS[variables.stage]}`);
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.invalidateQueries({ queryKey: ["lead-activity", variables.lead.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function move(lead: Lead, stage: LeadStage) {
    if (lead.stage === stage) return;
    moveMutation.mutate({ lead, stage });
  }

  const activeLead = leads.find((lead) => lead.id === activeLeadId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="CRM Pipeline"
        description="Drag a card between columns to move a prospect. Tap a card for notes, tasks and timeline."
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search pipeline"
            className="w-full sm:w-72"
          />
        }
      />

      {isLoading ? (
        <div className="panel p-8 text-sm text-muted-foreground">Loading pipeline…</div>
      ) : (
        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-4">
          {columns.map(({ stage, items }) => (
            <section
              key={stage}
              onDragOver={(event) => {
                event.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((current) => (current === stage ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                setOverStage(null);
                const lead = leads.find((item) => item.id === dragId);
                setDragId(null);
                if (lead) move(lead, stage);
              }}
              className={cn(
                "flex w-[17rem] shrink-0 snap-start flex-col rounded-xl border border-border bg-surface/60 transition-colors",
                overStage === stage && "border-primary/60 bg-primary/5",
              )}
            >
              <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", stageAccent[stage])} />
                  <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </header>

              <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    No leads here
                  </p>
                ) : (
                  items.map((lead) => (
                    <article
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStage(null);
                      }}
                      onClick={() => setActiveLeadId(lead.id)}
                      className={cn(
                        "group cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/50",
                        dragId === lead.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{lead.full_name}</p>
                        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatMyr(lead.budget_myr)} · {lead.pax} pax
                        {lead.preferred_month ? ` · ${lead.preferred_month}` : ""}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <TemperatureBadge value={lead.temperature} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground"
                            >
                              Move
                              <ArrowRight className="size-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {LEAD_STAGES.filter((s) => s !== lead.stage).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  move(lead, s);
                                }}
                              >
                                {STAGE_LABELS[s]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet open={!!activeLead} onOpenChange={(open) => !open && setActiveLeadId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {activeLead ? <LeadPanel lead={activeLead} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LeadPanel({ lead }: { lead: Lead }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAt, setTaskAt] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["lead-notes", lead.id],
    queryFn: () => fetchLeadNotes(lead.id),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["lead-reminders", lead.id],
    queryFn: () => fetchLeadReminders(lead.id),
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["lead-activity", lead.id],
    queryFn: () => fetchLeadActivity(lead.id),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lead-notes", lead.id] }),
      queryClient.invalidateQueries({ queryKey: ["lead-reminders", lead.id] }),
      queryClient.invalidateQueries({ queryKey: ["lead-activity", lead.id] }),
    ]);
  };

  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const body = note.trim();
      if (body.length < 2) throw new Error("Write a note first");
      await addLeadNote({
        agencyId: lead.agency_id,
        leadId: lead.id,
        authorId: user.id,
        body,
      });
    },
    onSuccess: async () => {
      setNote("");
      toast.success("Note added.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const taskMutation = useMutation({
    mutationFn: async () => {
      const title = taskTitle.trim();
      if (title.length < 2) throw new Error("Give the task a title");
      if (!taskAt) throw new Error("Pick a date and time");
      await createReminder({
        agencyId: lead.agency_id,
        leadId: lead.id,
        title,
        runAt: new Date(taskAt).toISOString(),
        channel: "manual",
      });
    },
    onSuccess: async () => {
      setTaskTitle("");
      setTaskAt("");
      toast.success("Task scheduled.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <SheetHeader className="px-0">
        <SheetTitle className="flex items-center gap-2 text-left">
          {lead.full_name}
          <Link
            to="/leads/$leadId"
            params={{ leadId: lead.id }}
            className="text-muted-foreground transition hover:text-primary"
            aria-label="Open full lead record"
          >
            <ExternalLink className="size-4" />
          </Link>
        </SheetTitle>
        <p className="text-left text-xs text-muted-foreground">
          {STAGE_LABELS[lead.stage]} · {formatMyr(lead.budget_myr)} · {lead.pax} pax
          {lead.phone ? ` · ${lead.phone}` : ""}
        </p>
      </SheetHeader>

      <Tabs defaultValue="notes" className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-3">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a note about this prospect…"
            rows={3}
          />
          <Button size="sm" onClick={() => noteMutation.mutate()} disabled={noteMutation.isPending}>
            Add note
          </Button>
          <ul className="space-y-2">
            {notes.length === 0 ? (
              <li className="text-sm text-muted-foreground">No notes yet.</li>
            ) : (
              notes.map((item) => (
                <li key={item.id} className="rounded-lg border border-border p-3">
                  <p className="whitespace-pre-wrap text-sm">{item.body}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(item.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete note"
                      onClick={async () => {
                        await deleteLeadNote(item.id);
                        await refresh();
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Call to confirm deposit"
            />
            <Label htmlFor="task-at">Due</Label>
            <Input
              id="task-at"
              type="datetime-local"
              value={taskAt}
              onChange={(event) => setTaskAt(event.target.value)}
            />
            <Button
              size="sm"
              onClick={() => taskMutation.mutate()}
              disabled={taskMutation.isPending}
            >
              <BellPlus className="size-4" />
              Schedule task
            </Button>
          </div>
          <ul className="space-y-2">
            {tasks.length === 0 ? (
              <li className="text-sm text-muted-foreground">No tasks scheduled.</li>
            ) : (
              tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {new Date(task.run_at).toLocaleString()} · {task.status}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {task.status === "pending" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Complete task"
                        onClick={async () => {
                          await completeReminder(task.id);
                          await refresh();
                        }}
                      >
                        <Check className="size-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete task"
                      onClick={async () => {
                        await deleteReminder(task.id);
                        await refresh();
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </TabsContent>

        <TabsContent value="timeline">
          <ol className="relative space-y-4 border-l border-border pl-5">
            {activity.length === 0 ? (
              <li className="text-sm text-muted-foreground">No activity yet.</li>
            ) : (
              activity.map((item) => (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{item.action}</p>
                  {typeof item.meta?.["detail"] === "string" ? (
                    <p className="text-xs text-muted-foreground">{item.meta["detail"] as string}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {item.actor === "ai" ? "AI" : "Team"} · {relativeTime(item.created_at)}
                  </p>
                </li>
              ))
            )}
          </ol>
        </TabsContent>
      </Tabs>
    </>
  );
}
