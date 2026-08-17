import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CAPABILITIES,
  EXECUTION_FLOW,
  OPENING_MESSAGE,
  deriveSnapshot,
  type DemoMessage,
} from "@/lib/meet-executive.core";

type Intent = "trial" | "demo" | "human";

const INTENT_LABEL: Record<Intent, string> = {
  trial: "Start free trial",
  demo: "Book live demo",
  human: "Talk to our team",
};

export function MeetExecutive() {
  const [messages, setMessages] = useState<DemoMessage[]>([
    { role: "executive", content: OPENING_MESSAGE },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const snapshot = useMemo(() => deriveSnapshot(messages), [messages]);
  const recommended = CAPABILITIES.filter(
    (c) => c.status === "active" && snapshot.recommended.includes(c.key),
  );

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const next: DemoMessage[] = [...messages, { role: "visitor", content: text.slice(0, 1500) }];
    setMessages(next);
    setDraft("");
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/public/meet-executive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setMessages((prev) => [...prev, { role: "executive", content: data.reply as string }]);
      }
    } catch {
      setError("Connection problem. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="panel flex min-w-0 flex-col p-4 sm:p-6" aria-label="Conversation">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary/15">
            <Sparkles className="size-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">AI Autonomous Business Executive™</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Demonstration mode · AI, not a human
            </p>
          </div>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation with the AI Business Executive"
          className="mt-4 flex max-h-[52vh] min-h-[280px] flex-col gap-3 overflow-y-auto pr-1"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "visitor"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary/15 px-4 py-2.5 text-sm leading-relaxed"
                  : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-border/60 bg-surface/60 px-4 py-2.5 text-sm leading-relaxed"
              }
            >
              <span className="sr-only">{m.role === "visitor" ? "You: " : "Executive: "}</span>
              {m.content.split("\n").map((line, li) => (
                <p key={li} className={li ? "mt-2" : undefined}>
                  {line}
                </p>
              ))}
            </div>
          ))}
          {sending ? (
            <p className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Analysing your workflow…
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="min-w-0 flex-1">
            <Label htmlFor="meet-input" className="sr-only">
              Tell the AI Business Executive how your agency works
            </Label>
            <Textarea
              id="meet-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              maxLength={1500}
              placeholder="Tell it how your agency works…"
              className="min-h-11 resize-none"
            />
          </div>
          <Button type="submit" size="icon" className="size-11 shrink-0 rounded-xl" disabled={sending}>
            <Send className="size-4" aria-hidden />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        <section className="panel p-4 sm:p-6" aria-labelledby="snapshot-heading">
          <h2 id="snapshot-heading" className="text-sm font-semibold tracking-tight">
            UMRAIO business opportunity snapshot
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Derived only from what you tell the executive. Nothing is estimated or invented.
          </p>

          <dl className="mt-4 grid gap-2">
            {snapshot.state.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
              >
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="text-right text-xs font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Opportunities detected
          </h3>
          <ul className="mt-2 grid gap-2">
            {snapshot.gaps.map((gap) => (
              <li key={gap.key} className="rounded-lg border border-border/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{gap.label}</span>
                  <span
                    className={
                      gap.status === "opportunity"
                        ? "rounded-full border border-primary/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary"
                        : "rounded-full border border-border/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground"
                    }
                  >
                    {gap.status === "opportunity"
                      ? "Opportunity"
                      : gap.status === "partial"
                        ? "Partial"
                        : "Insufficient data"}
                  </span>
                </div>
                {gap.status === "insufficient" ? null : (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {gap.detail}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {snapshot.headline ? (
            <p className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs leading-relaxed">
              {snapshot.headline}
            </p>
          ) : null}

          {recommended.length ? (
            <>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Recommended UMRAIO capabilities
              </h3>
              <ul className="mt-2 grid gap-1.5">
                {recommended.map((c) => (
                  <li key={c.key} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground"> — {c.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                These capabilities are designed to work together as an autonomous AI workforce
                rather than as isolated tools, subject to appropriate governance.
              </p>
            </>
          ) : null}
        </section>

        <section className="panel p-4 sm:p-6" aria-labelledby="flow-heading">
          <h2 id="flow-heading" className="text-sm font-semibold tracking-tight">
            How UMRAIO would execute
          </h2>
          <ol className="mt-3 grid gap-1.5">
            {EXECUTION_FLOW.map((step, i) => (
              <li key={step} className="flex items-start gap-2 text-xs">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-primary/40 text-[9px] text-primary"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 break-words">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel p-4 sm:p-6" aria-labelledby="capabilities-heading">
          <h2 id="capabilities-heading" className="text-sm font-semibold tracking-tight">
            The AI workforce
          </h2>
          <ul className="mt-3 grid gap-1.5">
            {CAPABILITIES.map((c) => (
              <li
                key={c.key}
                className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{c.name}</span>
                {c.status === "active" ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Active" />
                ) : (
                  <span className="shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                    Upcoming
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="book-demo" className="panel scroll-mt-24 p-4 sm:p-6" aria-labelledby="convert-heading">
          <h2 id="convert-heading" className="text-base font-semibold tracking-tight">
            Ready to see UMRAIO working with your agency?
          </h2>
          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              className="btn-premium h-11 rounded-xl text-sm font-semibold text-background hover:bg-transparent"
              onClick={() => setIntent("trial")}
            >
              Start Free Trial
              <ArrowRight className="ml-1 size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              className="btn-glass h-11 rounded-xl text-sm font-medium"
              onClick={() => setIntent("demo")}
            >
              Book Live Demo
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-xl text-sm font-medium"
              onClick={() => setIntent("human")}
            >
              Talk to our team
            </Button>
          </div>
        </section>
      </div>

      <RequestDialog
        intent={intent}
        onClose={() => setIntent(null)}
        snapshot={{
          state: snapshot.state,
          opportunities: snapshot.gaps
            .filter((g) => g.status === "opportunity")
            .map((g) => g.label),
        }}
      />
    </div>
  );
}

function RequestDialog({
  intent,
  onClose,
  snapshot,
}: {
  intent: Intent | null;
  onClose: () => void;
  snapshot: Record<string, unknown>;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (intent) {
      setStatus("idle");
      setMessage(null);
    }
  }, [intent]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!intent) return;
    const form = new FormData(e.currentTarget);
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/public/meet-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          full_name: String(form.get("full_name") ?? ""),
          agency_name: String(form.get("agency_name") ?? ""),
          email: String(form.get("email") ?? ""),
          whatsapp: String(form.get("whatsapp") ?? ""),
          agency_size: String(form.get("agency_size") ?? ""),
          monthly_enquiries: String(form.get("monthly_enquiries") ?? ""),
          snapshot,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "We could not record your request. Please try again.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Connection problem. Please try again.");
    }
  }

  return (
    <Dialog open={Boolean(intent)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{intent ? INTENT_LABEL[intent] : ""}</DialogTitle>
          <DialogDescription>
            Share only what our team needs to contact you. Your details are recorded for this
            request.
          </DialogDescription>
        </DialogHeader>

        {status === "done" ? (
          <div className="grid gap-3 py-2">
            <p className="text-sm">
              Your request has been recorded. Our team will contact you using the details you
              provided.
            </p>
            <Button onClick={onClose} className="rounded-xl">
              Close
            </Button>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={submit}>
            <div className="grid gap-1.5">
              <Label htmlFor="full_name">Name</Label>
              <Input id="full_name" name="full_name" required autoComplete="name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="agency_name">Agency name</Label>
              <Input id="agency_name" name="agency_name" autoComplete="organization" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" inputMode="tel" autoComplete="tel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="agency_size">Agency size</Label>
                <Input id="agency_size" name="agency_size" placeholder="e.g. 8 staff" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="monthly_enquiries">Monthly enquiries</Label>
                <Input id="monthly_enquiries" name="monthly_enquiries" placeholder="e.g. 300" />
              </div>
            </div>

            {message ? (
              <p role="alert" className="text-xs text-destructive">
                {message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="submit" className="w-full rounded-xl" disabled={status === "saving"}>
                {status === "saving" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Submit request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
