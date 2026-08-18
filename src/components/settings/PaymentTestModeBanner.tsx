/** Visible only while payments run against the Stripe test environment. */
export function PaymentTestModeBanner({ mode }: { mode: "test" | "live" | null }) {
  if (mode !== "test") return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
      Payments are in test mode — no real charges are made.
    </div>
  );
}
