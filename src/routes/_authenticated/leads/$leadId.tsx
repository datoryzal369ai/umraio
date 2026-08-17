import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  BellPlus,
  Check,
  Clock,
  Mail,
  Pencil,
  Phone,
  Trash2,
  Activity as ActivityIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StageBadge, TagList, TemperatureBadge } from "@/components/leads/LeadBadges";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { NextBestAction } from "@/components/leads/NextBestAction";
import { QuotationPanel } from "@/components/leads/QuotationPanel";
import { useAuth } from "@/hooks/useAuth";
import {
  addLeadNote,
  completeReminder,
  createReminder,
  deleteLeadNote,
  deleteReminder,
  fetchLead,
  fetchLeadActivity,
  fetchLeadNotes,
  fetchLeadReminders,
  formatMyr,
  relativeTime,
  updateLead,
} from "@/lib/leads";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Lead details — UMRAIO" },
      {
        name: "description",
        content:
          "Full lead record: contact details, pipeline status, notes, activity timeline and follow-up reminders.",
      },
      { property: "og:title", content: "Lead details — UMRAIO" },
      { property: "og:description", content: "Notes, timeline and follow-ups for this prospect." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="panel p-8 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="panel p-8 text-sm">Lead not found.</div>,
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderAt, setReminderAt] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => fetchLead(leadId),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["lead-notes", leadId],
    queryFn: () => fetchLeadNotes(leadId),
  });
  const { data: reminders = [] } = useQuery({
    queryKey: ["lead-reminders", leadId],
    queryFn: () => fetchLeadReminders(leadId),
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["lead-activity", leadId],
    queryFn: () => fetchLeadActivity(leadId),
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] }),
      queryClient.invalidateQueries({ queryKey: ["lead-notes", leadId] }),
      queryClient.invalidateQueries({ queryKey: ["lead-reminders", leadId] }),
      queryClient.invalidateQueries({ queryKey: ["lead-activity", leadId] }),
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateLead>[1]) => updateLead(leadId, input),
    onSuccess: async () => {
      toast.success("Lead updated.");
      setEditOpen(false);
      await refreshAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!lead || !user) throw new Error("Not ready");
      const body = note.trim();
      if (body.length < 2) throw new Error("Write a note first");
      if (body.length > 2000) throw new Error("Note is too long (max 2000 characters)");
      await addLeadNote({ agencyId: lead.agency_id, leadId, authorId: user.id, body });
    },
    onSuccess: async () => {
      setNote("");
      toast.success("Note added.");
      await refreshAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reminderMutation = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error("Not ready");
      const title = reminderTitle.trim();
      if (title.length < 2) throw new Error("Give the reminder a title");
      if (!reminderAt) throw new Error("Pick a date and time");
      await createReminder({
        agencyId: lead.agency_id,
        leadId,
        title: title.slice(0, 120),
        runAt: new Date(reminderAt).toISOString(),
        channel: "whatsapp",
      });
    },
    onSuccess: async () => {
      setReminderTitle("");
      setReminderAt("");
      toast.success("Follow-up scheduled.");
      await refreshAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="panel p-10 text-sm text-muted-foreground">Loading lead…</div>;
  }

  if (!lead) {
    return (
      <div className="panel space-y-3 p-10 text-center">
        <p className="font-semibold">This lead no longer exists.</p>
        <Button asChild variant="outline">
          <Link to="/leads">Back to leads</Link>
        </Button>
      </div>
    );
  }

  const timeline = [
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      at: n.created_at,
      title: "Note",
      detail: n.body,
    })),
    ...activity.map((a) => ({
      id: `act-${a.id}`,
      at: a.created_at,
      title: `${a.action} · ${a.actor === "ai" ? "AI" : "Team"}`,
      detail: typeof a.meta?.["detail"] === "string" ? (a.meta["detail"] as string) : "",
    })),
    { id: "created", at: lead.created_at, title: "Lead created", detail: `Source: ${lead.source}` },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/leads">
          <ArrowLeft className="size-4" />
          All leads
        </Link>
      </Button>

      <header className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold sm:text-3xl">{lead.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <TemperatureBadge value={lead.temperature} />
            <StageBadge stage={lead.stage} />
            <span className="text-xs text-muted-foreground capitalize">via {lead.source}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {lead.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-4" />
                {lead.phone}
              </span>
            ) : null}
            {lead.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-4" />
                {lead.email}
              </span>
            ) : null}
            <span>{lead.pax} pax</span>
            <span>{formatMyr(lead.budget_myr)}</span>
            {lead.preferred_month ? <span>{lead.preferred_month}</span> : null}
          </div>
          <TagList tags={lead.tags ?? []} />
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          Edit lead
        </Button>
      </header>

      <NextBestAction lead={lead} />

      <QuotationPanel
        leadId={lead.id}
        leadName={lead.full_name}
        leadPhone={lead.phone}
        pax={lead.pax}
        preferredMonth={lead.preferred_month}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="text-lg font-semibold">Lead notes</h2>
            <div className="mt-4 space-y-3">
              <Textarea
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log what was discussed, objections, budget signals…"
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => noteMutation.mutate()}
                disabled={noteMutation.isPending}
              >
                Add note
              </Button>
            </div>
            <div className="mt-6 space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete note"
                        onClick={async () => {
                          await deleteLeadNote(n.id);
                          toast.success("Note deleted.");
                          await refreshAll();
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ActivityIcon className="size-4 text-primary" />
              Timeline
            </h2>
            <ol className="mt-4 space-y-4 border-l border-border pl-5">
              {timeline.map((item) => (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 size-2.5 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.detail ? (
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{relativeTime(item.at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="panel h-fit p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BellPlus className="size-4 text-primary" />
            Follow-up reminders
          </h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reminder-title">What to do</Label>
              <Input
                id="reminder-title"
                value={reminderTitle}
                maxLength={120}
                onChange={(e) => setReminderTitle(e.target.value)}
                placeholder="Send Ramadan package quote"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-at">When</Label>
              <Input
                id="reminder-at"
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => reminderMutation.mutate()}
              disabled={reminderMutation.isPending}
            >
              Schedule follow-up
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reminders scheduled.</p>
            ) : (
              reminders.map((reminder) => {
                const overdue =
                  reminder.status === "pending" && new Date(reminder.run_at) < new Date();
                return (
                  <div
                    key={reminder.id}
                    className="rounded-lg border border-border bg-surface p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{reminder.title}</p>
                        <p
                          className={
                            overdue
                              ? "mt-1 flex items-center gap-1 text-xs text-destructive"
                              : "mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                          }
                        >
                          <Clock className="size-3" />
                          {new Date(reminder.run_at).toLocaleString()}
                          {overdue ? " · overdue" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0">
                        {reminder.status === "pending" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Mark done"
                            onClick={async () => {
                              await completeReminder(reminder.id);
                              toast.success("Follow-up completed.");
                              await refreshAll();
                            }}
                          >
                            <Check className="size-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="self-center px-2 text-xs capitalize text-muted-foreground">
                            {reminder.status}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete reminder"
                          onClick={async () => {
                            await deleteReminder(reminder.id);
                            await refreshAll();
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-6 w-full"
            onClick={() => navigate({ to: "/leads" })}
          >
            Back to pipeline
          </Button>
        </section>
      </div>

      <LeadFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        saving={saveMutation.isPending}
        onSubmit={(input) => saveMutation.mutate(input)}
      />
    </div>
  );
}
