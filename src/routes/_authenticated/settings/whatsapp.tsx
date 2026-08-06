import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { currentAgencyId } from "@/lib/leads";
import {
  disconnectWhatsapp,
  fetchWhatsappConfig,
  saveWhatsappConfig,
  type WhatsappInput,
} from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/settings/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp Integration — UMRAIO AI Business Executive" },
      {
        name: "description",
        content:
          "Connect your WhatsApp Business number so the UMRAIO AI Business Executive answers Umrah enquiries automatically.",
      },
      { property: "og:title", content: "WhatsApp Integration — UMRAIO" },
      {
        property: "og:description",
        content: "Connect WhatsApp Cloud API and let the AI reply, qualify and follow up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatsappSettings,
});

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(`${label} copied`);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function WhatsappSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: fetchWhatsappConfig,
  });

  const [form, setForm] = useState<WhatsappInput>({
    display_phone_number: "",
    phone_number_id: "",
    business_account_id: "",
    access_token: "",
    auto_reply: true,
  });

  useEffect(() => {
    if (!config) return;
    setForm({
      display_phone_number: config.display_phone_number ?? "",
      phone_number_id: config.phone_number_id ?? "",
      business_account_id: config.business_account_id ?? "",
      access_token: config.access_token ?? "",
      auto_reply: config.auto_reply,
    });
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in.");
      const agencyId = await currentAgencyId(user.id);
      return saveWhatsappConfig(agencyId, config?.id ?? null, {
        display_phone_number: form.display_phone_number || null,
        phone_number_id: form.phone_number_id || null,
        business_account_id: form.business_account_id || null,
        access_token: form.access_token || null,
        auto_reply: form.auto_reply,
      });
    },
    onSuccess: () => {
      toast.success("WhatsApp settings saved.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!config) return;
      await disconnectWhatsapp(config.id);
    },
    onSuccess: () => {
      toast.success("WhatsApp disconnected.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/whatsapp` : "";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Integration"
        title="WhatsApp Business"
        description="Connect the WhatsApp Cloud API so inbound enquiries create leads and the AI Business Executive replies instantly."
      />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <section className="panel space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                  <MessageCircle className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold">Connection status</h2>
                  <p className="text-xs text-muted-foreground">
                    {config?.last_inbound_at
                      ? `Last inbound message ${new Date(config.last_inbound_at).toLocaleString("en-MY")}`
                      : "No inbound messages received yet."}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  config?.is_connected
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }
              >
                {config?.is_connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
          </section>

          <section className="panel space-y-4 p-5">
            <h2 className="font-display text-base font-semibold">Meta credentials</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="display">Display phone number</Label>
                <Input
                  id="display"
                  placeholder="+60 12-345 6789"
                  value={form.display_phone_number ?? ""}
                  onChange={(e) => setForm({ ...form, display_phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pnid">Phone number ID</Label>
                <Input
                  id="pnid"
                  placeholder="1234567890"
                  value={form.phone_number_id ?? ""}
                  onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waba">Business account ID</Label>
                <Input
                  id="waba"
                  placeholder="0987654321"
                  value={form.business_account_id ?? ""}
                  onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="token">Permanent access token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="EAAG..."
                  value={form.access_token ?? ""}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium">AI auto-reply</p>
                <p className="text-xs text-muted-foreground">
                  Let the AI Business Executive answer inbound WhatsApp messages automatically.
                </p>
              </div>
              <Switch
                checked={form.auto_reply}
                onCheckedChange={(checked) => setForm({ ...form, auto_reply: checked })}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save connection"}
              </Button>
              {config?.is_connected ? (
                <Button
                  variant="outline"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  Disconnect
                </Button>
              ) : null}
            </div>
          </section>

          <section className="panel space-y-4 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="font-display text-base font-semibold">Webhook setup</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              In Meta for Developers → WhatsApp → Configuration, paste the callback URL and verify
              token below, then subscribe to the <span className="font-mono">messages</span> field.
            </p>
            <CopyField label="Callback URL" value={webhookUrl} />
            <CopyField label="Verify token" value={config?.verify_token ?? "Save settings first"} />
          </section>
        </>
      )}
    </div>
  );
}
