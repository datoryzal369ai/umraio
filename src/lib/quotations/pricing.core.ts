/**
 * UMRAIO® Quotation Pricing — deterministic business computation.
 *
 * ARCHITECTURE RULE: every number a customer sees is computed here, in pure
 * application code. The AI model may propose WHICH package and HOW MANY
 * pilgrims, but it never performs arithmetic, never sets a discount and never
 * decides a deposit. `quotation_calculation` is registered in
 * DETERMINISTIC_OPERATIONS and is therefore forbidden as an AI tool.
 */

export type DepositRule = "none" | "fixed" | "percent";

export type DepositPolicy = {
  rule: DepositRule;
  /** Fixed deposit in MYR when rule === "fixed". */
  fixedMyr?: number | null;
  /** Percentage of total when rule === "percent" (0-100). */
  percent?: number | null;
};

export type QuotationPricingInput = {
  unitPrice: number;
  pilgrims: number;
  /** Absolute discount in MYR. Only a human-approved value may be non-zero. */
  discount?: number;
  deposit: DepositPolicy;
};

export type QuotationPricing = {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
  depositRule: DepositRule;
  depositAmount: number | null;
  balanceAmount: number | null;
};

/** Round to 2 decimals without floating point drift. */
export function money(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clampPilgrims(pax: unknown): number {
  const n = Math.floor(Number(pax));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 200);
}

/** Single source of truth for quotation totals and deposit. */
export function computeQuotation(input: QuotationPricingInput): QuotationPricing {
  const unitPrice = Math.max(0, money(Number(input.unitPrice) || 0));
  const quantity = clampPilgrims(input.pilgrims);
  const subtotal = money(unitPrice * quantity);
  const discount = Math.min(Math.max(0, money(Number(input.discount) || 0)), subtotal);
  const total = money(subtotal - discount);

  let depositAmount: number | null = null;
  if (input.deposit.rule === "fixed") {
    const fixed = Math.max(0, money(Number(input.deposit.fixedMyr) || 0));
    depositAmount = fixed > 0 ? Math.min(fixed, total) : null;
  } else if (input.deposit.rule === "percent") {
    const pct = Math.min(Math.max(Number(input.deposit.percent) || 0, 0), 100);
    depositAmount = pct > 0 ? money((total * pct) / 100) : null;
  }

  return {
    unitPrice,
    quantity,
    subtotal,
    discount,
    total,
    depositRule: input.deposit.rule,
    depositAmount,
    balanceAmount: depositAmount === null ? null : money(total - depositAmount),
  };
}

export function formatMyrAmount(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Human-readable, WhatsApp-safe quotation summary (no markdown). */
export function quotationMessage(input: {
  quotationNumber: string;
  agencyName: string;
  packageName: string;
  pricing: QuotationPricing;
  travelLabel?: string | null;
  validUntil?: string | null;
  link?: string | null;
}): string {
  const p = input.pricing;
  const lines = [
    `Quotation ${input.quotationNumber} — ${input.agencyName}`,
    `Package: ${input.packageName}`,
    input.travelLabel ? `Travel: ${input.travelLabel}` : null,
    `Pilgrims: ${p.quantity} x ${formatMyrAmount(p.unitPrice)}`,
    p.discount > 0 ? `Discount: -${formatMyrAmount(p.discount)}` : null,
    `Total: ${formatMyrAmount(p.total)}`,
    p.depositAmount !== null
      ? `Deposit to secure: ${formatMyrAmount(p.depositAmount)} (balance ${formatMyrAmount(p.balanceAmount ?? 0)})`
      : null,
    input.validUntil ? `Valid until: ${input.validUntil}` : null,
    input.link ? `Full details: ${input.link}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export const QUOTATION_STATUSES = [
  "draft",
  "ready",
  "sent",
  "viewed",
  "discussing",
  "accepted",
  "deposit_pending",
  "deposit_paid",
  "booked",
  "rejected",
  "expired",
  "cancelled",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/** Allowed forward transitions. Enforced server-side, never by the model. */
const TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["ready", "cancelled"],
  ready: ["sent", "cancelled", "expired"],
  sent: ["viewed", "discussing", "accepted", "rejected", "expired", "cancelled"],
  viewed: ["discussing", "accepted", "rejected", "expired", "cancelled"],
  discussing: ["accepted", "rejected", "expired", "cancelled"],
  accepted: ["deposit_pending", "cancelled"],
  deposit_pending: ["deposit_paid", "cancelled", "expired"],
  deposit_paid: ["booked", "cancelled"],
  booked: [],
  rejected: [],
  expired: ["cancelled"],
  cancelled: [],
};

export function canTransition(from: QuotationStatus, to: QuotationStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  ready: "Ready to send",
  sent: "Sent",
  viewed: "Viewed by customer",
  discussing: "In discussion",
  accepted: "Accepted",
  deposit_pending: "Deposit pending",
  deposit_paid: "Deposit paid",
  booked: "Booked",
  rejected: "Declined",
  expired: "Expired",
  cancelled: "Cancelled",
};
