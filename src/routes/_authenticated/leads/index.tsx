import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { SearchInput } from "@/components/app/SearchInput";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StageBadge, TagList, TemperatureBadge } from "@/components/leads/LeadBadges";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  LEAD_STAGES,
  LEAD_TEMPERATURES,
  createLead,
  currentAgencyId,
  deleteLead,
  fetchLeads,
  formatMyr,
  relativeTime,
  updateLead,
  type Lead,
  type LeadInput,
} from "@/lib/leads";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title: "Lead management — UMRAIO" },
      {
        name: "description",
        content:
          "Create, qualify and track Umrah prospects: hot, warm and cold status, tags, search, filters and follow-up reminders.",
      },
      { property: "og:title", content: "Lead management — UMRAIO" },
      {
        property: "og:description",
        content: "Track every Umrah prospect from enquiry to booking.",
      },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [temperature, setTemperature] = useState("all");
  const [stage, setStage] = useState("all");
  const [tag, setTag] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });

  const allTags = useMemo(
    () => Array.from(new Set(leads.flatMap((lead) => lead.tags ?? []))).sort(),
    [leads],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (temperature !== "all" && lead.temperature !== temperature) return false;
      if (stage !== "all" && lead.stage !== stage) return false;
      if (tag !== "all" && !(lead.tags ?? []).includes(tag)) return false;
      if (!term) return true;
      return [lead.full_name, lead.phone, lead.email, lead.preferred_month, ...(lead.tags ?? [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [leads, search, temperature, stage, tag]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const saveMutation = useMutation({
    mutationFn: async (input: LeadInput) => {
      if (editing) return updateLead(editing.id, input);
      const agencyId = await currentAgencyId(user!.id);
      return createLead(agencyId, input);
    },
    onSuccess: async () => {
      toast.success(editing ? "Lead updated." : "Lead created.");
      setFormOpen(false);
      setEditing(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (lead: Lead) => deleteLead(lead.id),
    onSuccess: async () => {
      toast.success("Lead deleted.");
      setPendingDelete(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const counts = useMemo(
    () => ({
      hot: leads.filter((l) => l.temperature === "hot").length,
      warm: leads.filter((l) => l.temperature === "warm").length,
      cold: leads.filter((l) => l.temperature === "cold").length,
    }),
    [leads],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Lead management"
        description={`${leads.length} leads · ${counts.hot} hot · ${counts.warm} warm · ${counts.cold} cold`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            New lead
          </Button>
        }
      />

      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          label="Search leads"
          placeholder="Search name, phone, email, tag"
        />
        <FilterSelect
          label="Status"
          value={temperature}
          onChange={setTemperature}
          options={[...LEAD_TEMPERATURES]}
        />
        <FilterSelect label="Stage" value={stage} onChange={setStage} options={[...LEAD_STAGES]} />
        <FilterSelect label="Tag" value={tag} onChange={setTag} options={allTags} />
      </div>

      {isLoading ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">Loading leads…</div>
      ) : filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="font-semibold">No leads match your filters</p>
          <p className="text-sm text-muted-foreground">
            Adjust the search or add a new prospect to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="panel hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: lead.id }}
                        className="font-medium hover:text-primary"
                      >
                        {lead.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {lead.phone ?? lead.email ?? "No contact"} · {lead.pax} pax
                      </p>
                      <TagList tags={lead.tags ?? []} className="mt-1.5" />
                    </td>
                    <td className="px-4 py-3">
                      <TemperatureBadge value={lead.temperature} />
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="px-4 py-3">{formatMyr(lead.budget_myr)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {relativeTime(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${lead.full_name}`}
                          onClick={() => {
                            setEditing(lead);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${lead.full_name}`}
                          onClick={() => setPendingDelete(lead)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet cards */}
          <div className="grid gap-3 lg:hidden">
            {filtered.map((lead) => (
              <div key={lead.id} className="panel space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: lead.id }}
                      className="block truncate font-semibold hover:text-primary"
                    >
                      {lead.full_name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.phone ?? lead.email ?? "No contact"} · {lead.pax} pax ·{" "}
                      {formatMyr(lead.budget_myr)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${lead.full_name}`}
                      onClick={() => {
                        setEditing(lead);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${lead.full_name}`}
                      onClick={() => setPendingDelete(lead)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TemperatureBadge value={lead.temperature} />
                  <StageBadge stage={lead.stage} />
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(lead.created_at)}
                  </span>
                </div>
                <TagList tags={lead.tags ?? []} />
              </div>
            ))}
          </div>
        </>
      )}

      <LeadFormDialog
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditing(null);
        }}
        lead={editing}
        saving={saveMutation.isPending}
        onSubmit={(input) => saveMutation.mutate(input)}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.full_name} and all related notes, conversations and reminders will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={`Filter by ${label}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          All {label === "Status" ? "statuses" : `${label.toLowerCase()}s`}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option} className="capitalize">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
