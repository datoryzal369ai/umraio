import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Link2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createQuotationFn,
  listAgencyPackages,
  listLeadQuotations,
  transitionQuotationFn,
} from "@/lib/quotations.functions";
import {
  QUOTATION_STATUS_LABELS,
  formatMyrAmount,
  type QuotationStatus,
} from "@/lib/quotations/pricing.core";

const NEXT_ACTIONS: Partial<Record<QuotationStatus, Array<{ to: QuotationStatus; label: string }>>> =
  {
    ready: [{ to: "sent", label: "Mark as sent" }],
    sent: [{ to: "accepted", label: "Customer accepted" }],
    viewed: [{ to: "accepted", label: "Customer accepted" }],
    discussing: [{ to: "accepted", label: "Customer accepted" }],
    accepted: [{ to: "deposit_pending", label: "Awaiting deposit" }],
    deposit_pending: [{ to: "deposit_paid", label: "Deposit received" }],
    deposit_paid: [{ to: "booked", label: "Confirm booking" }],
  };

export function QuotationPanel({
  leadId,
  leadName,
  leadPhone,
  pax,
  preferredMonth,
}: {
  leadId: string;
  leadName: string;
  leadPhone: string | null;
  pax: number | null;
  preferredMonth: string | null;
}) {
  const queryClient = useQueryClient();
  const [packageId, setPackageId] = useState("");
  const [pilgrims, setPilgrims] = useState(String(pax && pax > 0 ? pax : 1));

  const { data: quotations = [] } = useQuery({
    queryKey: ["lead-quotations", leadId],
    queryFn: () => listLeadQuotations({ data: { leadId } }),
  });
  const { data: packages = [] } = useQuery({
    queryKey: ["agency-packages"],
    queryFn: () => listAgencyPackages(),
  });

  const selected = useMemo(
    () => packages.find((p: any) => p.id === packageId),
    [packages, packageId],
  );
  const estimate = selected
    ? Number(selected.price_myr ?? 0) * Math.max(1, Number(pilgrims) || 1)
    : 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lead-quotations", leadId] });
    queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
  };

  const create = useMutation({
    mutationFn: () =>
      createQuotationFn({
        data: {
          packageId,
          pilgrims: Math.max(1, Number(pilgrims) || 1),
          leadId,
          customerName: leadName,
          customerPhone: leadPhone,
          travelMonth: preferredMonth,
        },
      }),
    onSuccess: () => {
      toast.success("Quotation created");
      setPackageId("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const move = useMutation({
    mutationFn: (input: { quotationId: string; status: QuotationStatus }) =>
      transitionQuotationFn({ data: input }),
    onSuccess: () => {
      toast.success("Quotation updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="panel p-5" aria-labelledby="quotations-heading">
      <h2 id="quotations-heading" className="flex items-center gap-2 text-sm font-semibold">
        <FileText className="h-4 w-4 text-primary" aria-hidden /> Quotations
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_110px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="quotation-package">Package</Label>
          <Select value={packageId} onValueChange={setPackageId}>
            <SelectTrigger id="quotation-package">
              <SelectValue placeholder="Choose a package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {formatMyrAmount(Number(p.price_myr))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quotation-pax">Pilgrims</Label>
          <Input
            id="quotation-pax"
            type="number"
            min={1}
            max={200}
            value={pilgrims}
            onChange={(e) => setPilgrims(e.target.value)}
          />
        </div>
        <Button
          disabled={!packageId || create.isPending}
          onClick={() => create.mutate()}
          className="sm:mb-0"
        >
          Create
        </Button>
      </div>
      {selected ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Estimated total {formatMyrAmount(estimate)} · final figures and deposit are calculated
          from your agency settings.
        </p>
      ) : null}

      <ul className="mt-5 space-y-3">
        {quotations.length === 0 ? (
          <li className="text-sm text-muted-foreground">No quotation issued yet.</li>
        ) : null}
        {quotations.map((q: any) => {
          const status = q.status as QuotationStatus;
          const link = `${typeof window !== "undefined" ? window.location.origin : ""}/q/${q.public_token}`;
          return (
            <li key={q.id} className="rounded-lg border border-border/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {q.quotation_number} · {formatMyrAmount(Number(q.total))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {QUOTATION_STATUS_LABELS[status] ?? status}
                    {q.deposit_amount !== null
                      ? ` · deposit ${formatMyrAmount(Number(q.deposit_amount))}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(link);
                      toast.success("Customer link copied");
                    }}
                  >
                    <Link2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Copy link
                  </Button>
                  {(NEXT_ACTIONS[status] ?? []).map((action) => (
                    <Button
                      key={action.to}
                      size="sm"
                      variant="outline"
                      disabled={move.isPending}
                      onClick={() => move.mutate({ quotationId: q.id, status: action.to })}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" aria-hidden /> {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
