import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarCheck, Loader2, Send, Sparkle, User, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AssistantAvatar } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  chatDay,
  chatTime,
  fetchConversation,
  fetchMessages,
  insertMessage,
  setAiEnabled,
  type ChatMessage,
  type ConversationIntelligenceSnapshot,
} from "@/lib/conversations";
import { aiReplyToConversation, conversationInsights } from "@/lib/sales-ai.functions";

export const Route = createFileRoute("/_authenticated/conversations/$conversationId")({
  head: () => ({
    meta: [
      { title: "Conversation — UMRAIO Autonomous AI Business Executive" },
      {
        name: "description",
        content:
          "WhatsApp-style conversation handled by the UMRAIO Autonomous AI Business Executive with live qualification, package recommendations and booking suggestions.",
      },
      { property: "og:title", content: "Conversation — UMRAIO Autonomous AI Business Executive" },
      {
        property: "og:description",
        content: "AI replies, conversation summary, follow-up drafts and booking suggestions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="panel p-8 text-sm text-destructive">
      {error.message}
    </div>
  ),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [asHuman, setAsHuman] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => fetchConversation(conversationId),
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
  });

  const insights = useMutation({
    mutationFn: () => conversationInsights({ data: { conversationId } }),
    onError: (error: Error) => toast.error(error.message),
  });

  const send = useMutation({
    mutationFn: async (body: string) => {
      if (!conversation) throw new Error("Conversation not loaded");
      await insertMessage(
        conversationId,
        conversation.agency_id,
        asHuman ? "human" : "customer",
        body,
      );
      await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      if (asHuman || !conversation.ai_enabled) return;
      const { reply, errorCode } = await aiReplyToConversation({ data: { conversationId } });
      if (errorCode === "AI_CREDITS_EXHAUSTED") {
        throw new Error(
          "AI replies are temporarily unavailable because the workspace has no AI credits remaining. Add credits in Settings → Plans & credits, then try again.",
        );
      }
      if (!reply) throw new Error("The AI Executive did not return a reply. Please try again.");
      await insertMessage(conversationId, conversation.agency_id, "ai", reply);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      inputRef.current?.focus();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const aiToggle = useMutation({
    mutationFn: (enabled: boolean) => setAiEnabled(conversationId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] }),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, send.isPending]);

  function submit() {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft("");
    send.mutate(body);
  }

  const lead = conversation?.lead;
  const grouped = groupByDay(messages);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel flex h-[calc(100dvh-11rem)] min-h-[520px] flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border/60 bg-card/60 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="min-h-11 min-w-11 xl:hidden">
            <Link to="/conversations" aria-label="Back to inbox">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <User className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{lead?.full_name ?? "Unknown contact"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lead?.phone ?? "No number"} · WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ai-toggle" className="hidden text-xs text-muted-foreground sm:block">
              AI Executive
            </Label>
            <Switch
              id="ai-toggle"
              checked={conversation?.ai_enabled ?? false}
              onCheckedChange={(v) => aiToggle.mutate(v)}
            />
          </div>
        </header>

        <div ref={scrollRef} className="chat-canvas flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="mx-auto max-w-sm rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              No messages yet. Send the customer&apos;s first enquiry and the Autonomous AI Business Executive
              will reply.
            </p>
          ) : (
            grouped.map(([day, items]) => (
              <div key={day} className="space-y-2">
                <div className="flex justify-center">
                  <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
                    {day}
                  </span>
                </div>
                {items.map((m) => (
                  <Bubble key={m.id} message={m} />
                ))}
              </div>
            ))
          )}
          {send.isPending && !asHuman && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Autonomous AI Business Executive is typing…
            </div>
          )}
        </div>

        <footer className="border-t border-border/60 bg-card/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Switch id="as-human" checked={asHuman} onCheckedChange={setAsHuman} />
            <Label htmlFor="as-human" className="text-xs font-normal">
              {asHuman ? "Replying as human agent" : "Sending as customer (AI will reply)"}
            </Label>
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Type a message…"
              className="max-h-32 min-h-11 resize-none"
            />
            <Button
              size="icon"
              className="size-11 shrink-0"
              onClick={submit}
              disabled={!draft.trim() || send.isPending}
              aria-label="Send message"
            >
              {send.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </footer>
      </section>

      <aside className="space-y-4">
        <SalesIntelligencePanel snapshot={conversation?.intelligence ?? null} />
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              AI Executive Brief
            </h2>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => insights.mutate()}
              disabled={insights.isPending}
            >
              {insights.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkle className="size-3.5" />
              )}
              Generate
            </Button>
          </div>

          {insights.data ? (
            <div className="mt-4 space-y-4 text-sm">
              <Insight label="Summary" value={insights.data.summary} />
              <Insight label="Customer profile" value={insights.data.customer_profile} />
              <Insight label="Qualification" value={insights.data.qualification} />
              <Insight label="Objections" value={insights.data.objections} />
              <Insight label="Next step" value={insights.data.next_step} />
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                  <CalendarCheck className="size-3.5" /> Booking suggestion
                </p>
                <p className="mt-1.5 text-sm">{insights.data.booking_suggestion}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Follow-up draft
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm">
                  {insights.data.followup_message}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setDraft(insights.data!.followup_message);
                    setAsHuman(true);
                    inputRef.current?.focus();
                  }}
                >
                  Use as reply
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Generate a summary, qualification read, follow-up draft and booking suggestion from
              this conversation.
            </p>
          )}
        </div>

        {lead && (
          <div className="panel p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Lead
            </h2>
            <p className="mt-3 font-medium">{lead.full_name}</p>
            <p className="text-muted-foreground">Stage: {lead.stage}</p>
            <Button asChild variant="outline" size="sm" className="mt-3 gap-2">
              <Link to="/leads/$leadId" params={{ leadId: lead.id }}>
                <UserRound className="size-3.5" /> Open lead record
              </Link>
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const outbound = message.sender !== "customer";
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
          outbound
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-card text-card-foreground ring-1 ring-border/60",
        )}
      >
        {outbound && (
          <p
            className={cn(
              "mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide",
              "opacity-80",
            )}
          >
            {message.sender === "ai" ? (
              <>
                <AssistantAvatar size={14} /> Autonomous AI Business Executive
              </>
            ) : (
              <>
                <UserRound className="size-3" /> Agent
              </>
            )}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p className={cn("mt-1 text-right text-[10px]", outbound ? "opacity-70" : "opacity-60")}>
          {chatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

const HUMANISED: Record<string, string> = {
  ASK_CLARIFYING_QUESTION: "Ask a clarifying question",
  RECOMMEND_PACKAGE: "Recommend a package",
  EXPLAIN_VALUE: "Explain package value",
  HANDLE_OBJECTION: "Handle the objection",
  PROVIDE_COMPARISON: "Compare the options",
  BUILD_TRUST: "Build trust",
  CREATE_QUOTATION: "Create a quotation",
  SEND_QUOTATION: "Send the quotation",
  FOLLOW_UP: "Follow up",
  MOVE_TO_DEPOSIT_READY: "Move to deposit",
  ESCALATE: "Escalate to a colleague",
  NURTURE: "Nurture",
  STOP: "Hold — human handling",
};

function SalesIntelligencePanel({
  snapshot,
}: {
  snapshot: ConversationIntelligenceSnapshot | null;
}) {
  if (!snapshot?.state) return null;
  const chips: Array<{ label: string; value: string }> = [
    { label: "Stage", value: snapshot.state.replaceAll("_", " ").toLowerCase() },
    snapshot.language ? { label: "Language", value: snapshot.language.toUpperCase() } : null,
    snapshot.style ? { label: "Style", value: snapshot.style.replaceAll("_", " ") } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Sales intelligence
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.label}
            className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium capitalize text-primary"
          >
            {c.label}: {c.value}
          </span>
        ))}
        {typeof snapshot.quality_score === "number" && (
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
            Conversation quality: {snapshot.quality_score}/100
          </span>
        )}
      </div>
      {snapshot.next_best_action && (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">Next best action: </span>
          {HUMANISED[snapshot.next_best_action] ?? snapshot.next_best_action}
        </p>
      )}
      {snapshot.objection_memory?.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Objections raised: {snapshot.objection_memory.join(", ").toLowerCase().replaceAll("_", " ")}
        </p>
      ) : null}
      {snapshot.buying_signals?.length ? (
        <p className="mt-1 text-xs text-chart-4">
          Buying signals: {snapshot.buying_signals.join(", ").toLowerCase().replaceAll("_", " ")}
        </p>
      ) : null}
      {snapshot.missing?.length ? (
        <p className="mt-1 text-xs text-muted-foreground">Still unknown: {snapshot.missing.join(", ")}</p>
      ) : null}
    </div>
  );
}

function groupByDay(messages: ChatMessage[]): Array<[string, ChatMessage[]]> {
  const map = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const key = chatDay(m.created_at);
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return Array.from(map.entries());
}
