import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, CalendarDays, Plane, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getPublicQuotation, respondPublicQuotation } from "@/lib/quotations.functions";
import {
  QUOTATION_STATUS_LABELS,
  formatMyrAmount,
  type QuotationStatus,
} from "@/lib/quotations/pricing.core";

export const Route = createFileRoute("/q/$token")({
  head: () => ({
    meta: [
      { title: "Your Umrah quotation — UMRAIO" },
      {
        name: "description",
        content:
          "Review your personalised Umrah package quotation: package details, price per pilgrim, total and deposit to secure your seats.",
      },
      { property: "og:title", content: "Your Umrah quotation" },
      {
        property: "og:description",
        content: "Package details, total price and the deposit required to secure your seats.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-xl p-10 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl p-10 text-sm">This quotation link is no longer valid.</div>
  ),
  component: PublicQuotationPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border/40 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PublicQuotationPage() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["public-quotation", token],
    queryFn: () => getPublicQuotation({ data: { token } }),
  });

  const respond = useMutation({
    mutationFn: (decision: "accepted" | "rejected") =>
      respondPublicQuotation({ data: { token, decision, reason: reason.trim() || null } }),
    onSuccess: () => {
      toast.success("Thank you — the agency has been notified.");
      queryClient.invalidateQueries({ queryKey: ["public-quotation", token] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-xl p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!data?.quotation) {
    return (
      <main className="mx-auto max-w-xl p-10">
        <h1 className="text-xl font-semibold">Quotation not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is no longer valid. Please contact the agency for an updated quotation.
        </p>
      </main>
    );
  }

  const q = data.quotation as Record<string, any>;
  const snap = (q["package_snapshot"] ?? {}) as Record<string, any>;
  const status = q["status"] as QuotationStatus;
  const open = ["ready", "sent", "viewed", "discussing"].includes(status);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          {data.agency?.name ?? "Umrah agency"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
          Your Umrah quotation {q["quotation_number"]}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Status: {QUOTATION_STATUS_LABELS[status] ?? status}
          {q["valid_until"]
            ? ` · valid until ${new Date(q["valid_until"]).toLocaleDateString("en-MY")}`
            : ""}
        </p>
      </header>

      <section className="panel space-y-1 p-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Plane className="h-4 w-4 text-primary" aria-hidden /> {snap["name"] ?? "Umrah package"}
        </h2>
        {snap["hotel_makkah"] ? <Row label="Makkah hotel" value={String(snap["hotel_makkah"])} /> : null}
        {snap["hotel_madinah"] ? (
          <Row label="Madinah hotel" value={String(snap["hotel_madinah"])} />
        ) : null}
        {snap["nights"] ? <Row label="Nights" value={`${snap["nights"]}`} /> : null}
        {snap["airline"] ? <Row label="Airline" value={String(snap["airline"])} /> : null}
        {q["travel_month"] || q["travel_date"] ? (
          <Row label="Travel" value={String(q["travel_date"] ?? q["travel_month"])} />
        ) : null}
      </section>

      <section className="panel mt-6 space-y-1 p-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <BadgeCheck className="h-4 w-4 text-primary" aria-hidden /> Price breakdown
        </h2>
        <Row
          label={`Price per pilgrim × ${q["quantity"]}`}
          value={formatMyrAmount(Number(q["unit_price"]))}
        />
        <Row label="Subtotal" value={formatMyrAmount(Number(q["subtotal"]))} />
        {Number(q["discount"]) > 0 ? (
          <Row label="Discount" value={`- ${formatMyrAmount(Number(q["discount"]))}`} />
        ) : null}
        <Row label="Total" value={formatMyrAmount(Number(q["total"]))} />
        {q["deposit_amount"] !== null ? (
          <>
            <Row label="Deposit to secure" value={formatMyrAmount(Number(q["deposit_amount"]))} />
            <Row label="Balance" value={formatMyrAmount(Number(q["balance_amount"]))} />
          </>
        ) : null}
        {Array.isArray(snap["inclusions"]) && snap["inclusions"].length ? (
          <p className="pt-3 text-sm text-muted-foreground">
            Includes: {snap["inclusions"].join(", ")}
          </p>
        ) : null}
      </section>

      {open ? (
        <section className="panel mt-6 space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Your decision
          </h2>
          <p className="text-sm text-muted-foreground">
            No payment is taken here. Accepting simply tells the agency you are ready to proceed;
            a consultant will confirm your deposit and booking.
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 400))}
            placeholder="Optional message to the agency"
            aria-label="Message to the agency"
          />
          <div className="flex flex-wrap gap-3">
            <Button disabled={respond.isPending} onClick={() => respond.mutate("accepted")}>
              Accept quotation
            </Button>
            <Button
              variant="outline"
              disabled={respond.isPending}
              onClick={() => respond.mutate("rejected")}
            >
              Not now
            </Button>
          </div>
        </section>
      ) : (
        <section className="panel mt-6 p-6 text-sm text-muted-foreground">
          <CalendarDays className="mb-2 h-4 w-4 text-primary" aria-hidden />
          This quotation is {QUOTATION_STATUS_LABELS[status]?.toLowerCase() ?? status}. Contact the
          agency if you need an updated offer.
        </section>
      )}
    </main>
  );
}
